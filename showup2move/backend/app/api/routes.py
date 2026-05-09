from datetime import date, datetime, timedelta, timezone
import os
from random import Random, randint
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, Response
import httpx

from app.core.supabase import execute_supabase_read, get_supabase, require_supabase
from app.models.schemas import (
    AvailabilityCreate,
    CompatibilityRequest,
    ConfirmParticipationRequest,
    EventCreate,
    EventParticipationRequest,
    ExtractInterestsRequest,
    ExtractPhotoInterestsRequest,
    MatchRunRequest,
    MessageCreate,
    ProfileCreate,
    TeammateRecommendationsRequest,
    GroupCreate,
    GroupDeleteRequest,
    GroupAddMembersRequest,
    TeamBalanceRequest,
    InviteCreateRequest,
    InviteAcceptRequest,
    FitnessConnectRequest,
    ExplainMatchRequest,
    CaptainPlanRequest,
)
from app.services import mock_data
from app.services.ai_service import (
    compatibility_score_ai,
    extract_photo_interests,
    extract_profile_interests,
    teammate_recommendations,
)
from app.services.ai_provider import (
    explain_match,
    generate_captain_plan,
    get_ai_health,
)
from app.services.matching import run_supabase_matching


def _is_missing_group_metadata_error(exc: Exception) -> bool:
    message = str(exc)
    return "groups.match_date" in message or "column groups." in message


def _is_missing_event_messages_error(exc: Exception) -> bool:
    message = str(exc)
    return "messages.event_id" in message or "column messages.event_id" in message

router = APIRouter()


def _create_notification(
    supabase,
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "info",
    related_group_id: str | None = None,
    related_event_id: str | None = None,
) -> None:
    try:
        supabase.table("notifications").insert(
            {
                "user_id": user_id,
                "title": title,
                "message": message,
                "type": notification_type,
                "related_group_id": related_group_id,
                "related_event_id": related_event_id,
            }
        ).execute()
    except Exception:
        # Notifications should never block the primary user action.
        return


def _sender_profiles(supabase, sender_ids: list[str]) -> dict[str, dict]:
    if not sender_ids:
        return {}
    rows = (
        supabase.table("profiles")
        .select("id,full_name,username,avatar_url")
        .in_("id", list(set(sender_ids)))
        .execute()
        .data
        or []
    )
    return {row["id"]: row for row in rows}


def _messages_with_senders(supabase, rows: list[dict]) -> list[dict]:
    try:
        profiles_by_id = _sender_profiles(supabase, [row["sender_id"] for row in rows if row.get("sender_id")])
    except Exception:
        # Message reads should not fail just because the profile join had a transient issue.
        profiles_by_id = {}
    return [
        {
            **row,
            "sender": profiles_by_id.get(
                row.get("sender_id"),
                {"id": row.get("sender_id"), "full_name": "Player", "username": "player", "avatar_url": None},
            ),
        }
        for row in rows
    ]


def _group_member_ids(supabase, group_id: str) -> list[str]:
    rows = (
        supabase.table("group_members")
        .select("user_id")
        .eq("group_id", group_id)
        .execute()
        .data
        or []
    )
    return [row["user_id"] for row in rows]


def _event_response_rows(supabase, rows: list[dict]) -> list[dict]:
    group_ids = list({row["group_id"] for row in rows if row.get("group_id")})
    groups = (
        supabase.table("groups").select("id,captain_id").in_("id", group_ids).execute().data
        if group_ids
        else []
    ) or []
    captain_by_group = {group["id"]: group.get("captain_id") for group in groups}
    
    # Get participant counts for all events
    event_ids = [row["id"] for row in rows]
    participants = (
        supabase.table("event_participants")
        .select("event_id, user_id, status")
        .in_("event_id", event_ids)
        .execute()
        .data
        if event_ids
        else []
    ) or []
    
    participants_by_event = {}
    for p in participants:
        event_id = p["event_id"]
        if event_id not in participants_by_event:
            participants_by_event[event_id] = []
        participants_by_event[event_id].append(p)
    
    return [
        {
            **row,
            "sport_name": (row.get("sports") or {}).get("name"),
            "group_captain_id": captain_by_group.get(row.get("group_id")),
            "participants": participants_by_event.get(row["id"], []),
            "participant_count": len([p for p in participants_by_event.get(row["id"], []) if p.get("status") == "attending"]),
        }
        for row in rows
    ]


OUTDOOR_SPORTS = {"running", "football", "tennis"}
INDOOR_SPORTS = {"basketball", "volleyball"}
SKILL_SCORE = {"beginner": 1, "intermediate": 2, "advanced": 3}


def _parse_datetime(value: str | datetime | None) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    text = value.replace("Z", "+00:00") if isinstance(value, str) else value
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(";", "\\;")
        .replace(",", "\\,")
    )


def _ics_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _build_weather_fallback(city: str, sport: str, target_date: str) -> dict:
    seed = sum(ord(char) for char in f"{city}-{sport}-{target_date}")
    rng = Random(seed)
    temp_c = rng.randint(6, 28)
    rain_risk = rng.randint(10, 85)
    condition = "rain" if rain_risk > 65 else "clear"

    is_outdoor = sport.strip().lower() in OUTDOOR_SPORTS
    if not is_outdoor:
        return {
            "recommendation": f"Indoor-friendly for {sport}.",
            "score": 88,
            "summary": "Indoor sport, weather has minimal impact.",
        }

    if condition == "rain" or temp_c < 5 or temp_c > 32:
        return {
            "recommendation": f"Not ideal for outdoor {sport}. Consider indoor or a later slot.",
            "score": 42,
            "summary": "Higher rain risk and uncomfortable temperatures.",
        }

    if rain_risk > 45:
        return {
            "recommendation": f"Okay for {sport}, but keep an indoor backup.",
            "score": 68,
            "summary": "Mild weather with a small rain chance.",
        }

    return {
        "recommendation": f"Good conditions for outdoor {sport}.",
        "score": 84,
        "summary": "Comfortable weather and low rain risk.",
    }


def _build_weather_from_openweather(city: str, sport: str) -> dict | None:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return None
    try:
        response = httpx.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": api_key, "units": "metric"},
            timeout=6.0,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:
        return None

    weather = (data.get("weather") or [{}])[0]
    description = (weather.get("description") or "").lower()
    main = (weather.get("main") or "").lower()
    temp_c = float((data.get("main") or {}).get("temp") or 0)
    rain_risk = 70 if "rain" in description or "storm" in description else 25
    is_outdoor = sport.strip().lower() in OUTDOOR_SPORTS

    if not is_outdoor:
        return {
            "recommendation": f"Indoor-friendly for {sport}.",
            "score": 90,
            "summary": "Indoor sport, weather has minimal impact.",
        }

    if any(keyword in main for keyword in ["rain", "snow", "thunderstorm"]) or temp_c < 5 or temp_c > 32:
        return {
            "recommendation": f"Not ideal for outdoor {sport}. Consider indoor or a later slot.",
            "score": 40,
            "summary": f"{description or 'Challenging'} weather and temperature extremes.",
        }

    if rain_risk > 45:
        return {
            "recommendation": f"Okay for {sport}, but keep an indoor backup.",
            "score": 66,
            "summary": f"{description or 'Mild'} conditions with some rain risk.",
        }

    return {
        "recommendation": f"Good conditions for outdoor {sport}.",
        "score": 85,
        "summary": f"{description or 'Mild'} weather and low rain risk.",
    }


def _profile_sport_payload(supabase, user_id: str) -> list[dict]:
    rows = (
        supabase.table("user_sports")
        .select("sport_id,skill_level,sports(name)")
        .eq("user_id", user_id)
        .execute()
        .data
        or []
    )
    return [
        {
            "sport_id": row["sport_id"],
            "skill_level": row.get("skill_level") or "intermediate",
            "sport_name": (row.get("sports") or {}).get("name"),
        }
        for row in rows
    ]


def _profile_with_sports(supabase, profile: dict) -> dict:
    sport_preferences = _profile_sport_payload(supabase, profile["id"])
    return {
        **profile,
        "sports_preferences": sport_preferences,
        "sports": [item["sport_name"] for item in sport_preferences if item.get("sport_name")],
    }


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "message": "ShowUp2Move backend is running"}


@router.get("/sports")
def get_sports() -> list[dict]:
    supabase = require_supabase()
    try:
        return supabase.table("sports").select("*").order("name").execute().data or []
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read sports from Supabase: {exc}",
        ) from exc


@router.get("/weather/recommendation")
def get_weather_recommendation(
    city: str = Query(min_length=1),
    sport: str = Query(min_length=1),
    date: str = Query(min_length=4),
) -> dict:
    fallback = _build_weather_fallback(city, sport, date)
    api_result = _build_weather_from_openweather(city, sport)
    result = api_result or fallback
    return {
        "city": city,
        "sport": sport,
        "recommendation": result["recommendation"],
        "score": result["score"],
        "summary": result["summary"],
    }


@router.post("/profiles")
def create_profile(payload: ProfileCreate) -> dict:
    supabase = get_supabase()
    profile = payload.model_dump(exclude={"sports", "sports_preferences"})

    if supabase is None:
        mock_data.PROFILES[payload.id] = {**profile, "sports": payload.sports}
        return mock_data.PROFILES[payload.id]

    try:
        profile_rows = supabase.table("profiles").upsert(profile).execute().data or []
        profile_data = profile_rows[0] if profile_rows else profile

        preferences = payload.sports_preferences
        if not preferences and payload.sports:
            sports = supabase.table("sports").select("id,name").in_("name", payload.sports).execute().data or []
            preferences = [
                {"sport_id": sport["id"], "skill_level": "intermediate"}
                for sport in sports
            ]

        supabase.table("user_sports").delete().eq("user_id", payload.id).execute()
        if preferences:
            user_sports = [
                {
                    "user_id": payload.id,
                    "sport_id": preference.sport_id if hasattr(preference, "sport_id") else preference["sport_id"],
                    "skill_level": (
                        preference.skill_level if hasattr(preference, "skill_level") else preference["skill_level"]
                    ),
                }
                for preference in preferences
            ]
            supabase.table("user_sports").upsert(user_sports, on_conflict="user_id,sport_id").execute()

        return _profile_with_sports(supabase, profile_data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not save profile: {exc}") from exc


@router.get("/profiles/{user_id}")
def get_profile(user_id: str) -> dict:
    supabase = get_supabase()
    if supabase is None:
        profile = mock_data.PROFILES.get(user_id)
        if profile:
            return profile
        return next(iter(mock_data.PROFILES.values()))

    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).execute().data or []
        if not result:
            raise HTTPException(status_code=404, detail="Profile not found")
        return _profile_with_sports(supabase, result[0])
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read profile: {exc}") from exc


@router.post("/availability")
def set_availability(payload: AvailabilityCreate) -> dict:
    supabase = get_supabase()
    record = payload.model_dump(mode="json")

    if supabase is None:
        mock_data.AVAILABILITY[:] = [
            item
            for item in mock_data.AVAILABILITY
            if not (item["user_id"] == payload.user_id and item["date"] == payload.date.isoformat())
        ]
        stored = {"id": str(uuid4()), **record}
        mock_data.AVAILABILITY.append(stored)
        return stored

    try:
        rows = supabase.table("availability").upsert(record, on_conflict="user_id,date").execute().data or []
        return rows[0] if rows else record
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not save availability: {exc}") from exc


@router.get("/availability/{user_id}")
def get_availability(user_id: str, day: date | None = None) -> dict:
    supabase = get_supabase()
    target_day = (day or date.today()).isoformat()

    if supabase is None:
        row = next(
            (
                item
                for item in mock_data.AVAILABILITY
                if item["user_id"] == user_id and item["date"] == target_day
            ),
            None,
        )
        return row or {"user_id": user_id, "date": target_day, "is_available": None}

    try:
        rows = (
            supabase.table("availability")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", target_day)
            .execute()
            .data
            or []
        )
        return rows[0] if rows else {"user_id": user_id, "date": target_day, "is_available": None}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read availability: {exc}") from exc


@router.post("/match/run")
def run_matching(payload: MatchRunRequest | None = None) -> dict:
    request = payload or MatchRunRequest()
    return run_supabase_matching(
        match_date=request.date,
        city=request.city,
        sport_id=request.sport_id,
        max_distance_km=request.max_distance_km,
    )


@router.post("/groups")
def create_group(payload: GroupCreate) -> dict:
    supabase = require_supabase()
    try:
        group_data = {
            "name": payload.name,
            "sport_id": payload.sport_id,
            "city": payload.city,
            "description": payload.description,
            "captain_id": payload.created_by,
        }
        
        group_row = supabase.table("groups").insert(group_data).execute().data[0]
        group_id = group_row["id"]

        member_ids = set(payload.member_ids)
        member_ids.add(payload.created_by)
        
        members_data = [
            {"group_id": group_id, "user_id": uid, "confirmed": uid == payload.created_by}
            for uid in member_ids
        ]
        supabase.table("group_members").insert(members_data).execute()

        return get_groups(payload.created_by)[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not create group: {exc}") from exc


@router.get("/groups/{user_id}")
def get_groups(user_id: str) -> list[dict]:
    supabase = get_supabase()
    if supabase is None:
        groups = [
            group
            for group in mock_data.GROUPS
            if user_id in [member["id"] for member in group.get("members", [])]
        ]
        return groups or mock_data.GROUPS

    try:
        memberships = (
            execute_supabase_read(
                supabase.table("group_members")
                .select("group_id,confirmed")
                .eq("user_id", user_id)
            )
            .data
            or []
        )
        group_ids = [row["group_id"] for row in memberships]
        confirmed_by_group = {row["group_id"]: row.get("confirmed", False) for row in memberships}
        if not group_ids:
            return []

        groups = (
            execute_supabase_read(
                supabase.table("groups")
                .select("*")
                .in_("id", group_ids)
                .order("created_at", desc=True)
            )
            .data
            or []
        )
        sport_ids = list({group["sport_id"] for group in groups if group.get("sport_id")})
        captain_ids = list({group["captain_id"] for group in groups if group.get("captain_id")})
        all_members = (
            execute_supabase_read(
                supabase.table("group_members")
                .select("group_id,user_id,confirmed")
                .in_("group_id", group_ids)
            )
            .data
            or []
        )
        member_user_ids = list({row["user_id"] for row in all_members})
        profile_ids = list({*captain_ids, *member_user_ids})

        sports = (
            execute_supabase_read(supabase.table("sports").select("id,name").in_("id", sport_ids)).data
            if sport_ids
            else []
        ) or []
        profiles = (
            execute_supabase_read(
                supabase.table("profiles")
                .select("id,full_name,username,description,avatar_url,city")
                .in_("id", profile_ids)
            )
            .data
            if profile_ids
            else []
        ) or []
        member_sports = (
            execute_supabase_read(
                supabase.table("user_sports")
                .select("user_id,sport_id,skill_level")
                .in_("user_id", member_user_ids)
                .in_("sport_id", sport_ids)
            )
            .data
            if member_user_ids and sport_ids
            else []
        ) or []
        sports_by_id = {sport["id"]: sport for sport in sports}
        profiles_by_id = {profile["id"]: profile for profile in profiles}
        skill_by_user_sport = {
            (row["user_id"], row["sport_id"]): row.get("skill_level") or "intermediate"
            for row in member_sports
        }

        members_by_group: dict[str, list[dict]] = {}
        for member in all_members:
            profile = profiles_by_id.get(member["user_id"], {"id": member["user_id"], "full_name": "Player"})
            group = next((item for item in groups if item["id"] == member["group_id"]), {})
            members_by_group.setdefault(member["group_id"], []).append(
                {
                    **profile,
                    "skill_level": skill_by_user_sport.get(
                        (member["user_id"], group.get("sport_id")),
                        "intermediate",
                    ),
                    "confirmed": member.get("confirmed", False),
                }
            )

        return [
            {
                **group,
                "sport_name": sports_by_id.get(group.get("sport_id"), {}).get("name"),
                "captain_name": profiles_by_id.get(group.get("captain_id"), {}).get("full_name"),
                "captain": profiles_by_id.get(group.get("captain_id")),
                "member_count": len(members_by_group.get(group["id"], [])),
                "members": members_by_group.get(group["id"], []),
                "current_user_confirmed": confirmed_by_group.get(group["id"], False),
                "explanations": [
                    f"Matched because you all like {sports_by_id.get(group.get('sport_id'), {}).get('name', 'this sport')} and are available today.",
                    "Nearby match: same city" if group.get("city") else "Location kept flexible",
                    "Similar skill level" if group.get("average_skill") else "Skill level balanced",
                ],
            }
            for group in groups
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read groups: {exc}") from exc


@router.post("/teams/balance")
def balance_teams(payload: TeamBalanceRequest) -> dict:
    if payload.teams_count < 2:
        raise HTTPException(status_code=400, detail="teams_count must be at least 2")

    players = payload.players or []
    if not players:
        return {"teams": []}

    teams = [
        {"name": f"Team {chr(65 + index)}", "players": [], "total_skill": 0}
        for index in range(payload.teams_count)
    ]

    sorted_players = sorted(
        players,
        key=lambda player: SKILL_SCORE.get(player.skill_level, 2),
        reverse=True,
    )

    for player in sorted_players:
        team = min(teams, key=lambda item: item["total_skill"])
        team["players"].append(player.model_dump())
        team["total_skill"] += SKILL_SCORE.get(player.skill_level, 2)

    response_teams = []
    for team in teams:
        count = len(team["players"]) or 1
        response_teams.append(
            {
                "name": team["name"],
                "players": team["players"],
                "average_skill": round(team["total_skill"] / count, 2),
            }
        )

    return {"teams": response_teams}


@router.get("/users/available")
def get_available_users(
    target_date: date | None = Query(default=None, alias="date"),
    city: str | None = None,
) -> list[dict]:
    supabase = require_supabase()
    day = (target_date or date.today()).isoformat()
    try:
        availability_rows = (
            supabase.table("availability")
            .select("user_id,preferred_time")
            .eq("date", day)
            .eq("is_available", True)
            .execute()
            .data
            or []
        )
        user_ids = [row["user_id"] for row in availability_rows]
        if not user_ids:
            return []

        profile_query = (
            supabase.table("profiles")
            .select("id,full_name,username,description,avatar_url,city")
            .in_("id", user_ids)
        )
        if city:
            profile_query = profile_query.eq("city", city)
        profiles = profile_query.execute().data or []
        profile_ids = [profile["id"] for profile in profiles]
        if not profile_ids:
            return []

        user_sports = (
            supabase.table("user_sports")
            .select("user_id,skill_level,sports(name)")
            .in_("user_id", profile_ids)
            .execute()
            .data
            or []
        )
        availability_by_user = {row["user_id"]: row.get("preferred_time") or "today" for row in availability_rows}
        sports_by_user: dict[str, list[str]] = {}
        skills_by_user: dict[str, list[str]] = {}
        for row in user_sports:
            sports_by_user.setdefault(row["user_id"], []).append((row.get("sports") or {}).get("name"))
            skills_by_user.setdefault(row["user_id"], []).append(row.get("skill_level") or "intermediate")

        return [
            {
                **profile,
                "sports": [sport for sport in sports_by_user.get(profile["id"], []) if sport],
                "skill_level": (skills_by_user.get(profile["id"]) or ["intermediate"])[0],
                "availability": availability_by_user.get(profile["id"], "today"),
            }
            for profile in profiles
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read available users: {exc}") from exc


@router.get("/users/search")
def search_users(
    query: str = Query(default="", min_length=0),
    sport_id: str | None = None,
    city: str | None = None,
    exclude_group_id: str | None = None,
) -> list[dict]:
    supabase = require_supabase()
    try:
        profile_query = supabase.table("profiles").select("id,full_name,username,description,avatar_url,city")
        if query:
            profile_query = profile_query.or_(f"full_name.ilike.%{query}%,username.ilike.%{query}%,city.ilike.%{query}%")
        if city:
            profile_query = profile_query.eq("city", city)
        
        profiles = profile_query.execute().data or []
        if not profiles:
            return []

        profile_ids = [p["id"] for p in profiles]

        if exclude_group_id:
            existing_members = (
                supabase.table("group_members")
                .select("user_id")
                .eq("group_id", exclude_group_id)
                .in_("user_id", profile_ids)
                .execute()
                .data or []
            )
            existing_ids = {m["user_id"] for m in existing_members}
            profiles = [p for p in profiles if p["id"] not in existing_ids]
            profile_ids = [p["id"] for p in profiles]
            if not profiles:
                return []

        user_sports_query = supabase.table("user_sports").select("user_id,sport_id,skill_level,sports(name)").in_("user_id", profile_ids)
        if sport_id:
            user_sports_query = user_sports_query.eq("sport_id", sport_id)
            
        user_sports = user_sports_query.execute().data or []
        
        # If sport_id was required, filter profiles to only those who have it
        if sport_id:
            users_with_sport = {row["user_id"] for row in user_sports}
            profiles = [p for p in profiles if p["id"] in users_with_sport]
            if not profiles:
                return []
            # Fetch remaining sports for the filtered profiles
            user_sports = supabase.table("user_sports").select("user_id,sport_id,skill_level,sports(name)").in_("user_id", [p["id"] for p in profiles]).execute().data or []

        sports_by_user: dict[str, list[str]] = {}
        skills_by_user: dict[str, list[str]] = {}
        for row in user_sports:
            sports_by_user.setdefault(row["user_id"], []).append((row.get("sports") or {}).get("name"))
            skills_by_user.setdefault(row["user_id"], []).append(row.get("skill_level") or "intermediate")

        return [
            {
                **profile,
                "sports": [sport for sport in sports_by_user.get(profile["id"], []) if sport],
                "skill_level": (skills_by_user.get(profile["id"]) or ["intermediate"])[0],
            }
            for profile in profiles
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not search users: {exc}") from exc


@router.delete("/groups/{group_id}")
def delete_group(group_id: str, payload: GroupDeleteRequest) -> dict:
    supabase = require_supabase()
    try:
        group_rows = supabase.table("groups").select("captain_id, name, sport_id").eq("id", group_id).execute().data or []
        if not group_rows:
            raise HTTPException(status_code=404, detail="Group not found")
            
        group = group_rows[0]
        if group.get("captain_id") != payload.user_id:
            raise HTTPException(status_code=403, detail="Only the group captain can delete this group")
            
        member_ids = _group_member_ids(supabase, group_id)
        
        supabase.table("groups").delete().eq("id", group_id).execute()
        
        group_name = group.get("name") or "A group"
        
        for member_id in member_ids:
            if member_id == payload.user_id:
                continue
            _create_notification(
                supabase,
                member_id,
                "Group deleted",
                f"{group_name} was deleted by its captain.",
                "group_deleted"
            )
            
        return {"message": "Group deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete group: {exc}") from exc


@router.post("/groups/{group_id}/members")
def add_group_members(group_id: str, payload: GroupAddMembersRequest) -> list[dict]:
    supabase = require_supabase()
    try:
        group_rows = supabase.table("groups").select("name, sport_id, captain_id").eq("id", group_id).execute().data or []
        if not group_rows:
            raise HTTPException(status_code=404, detail="Group not found")
        group = group_rows[0]
        
        existing_members = _group_member_ids(supabase, group_id)
        if payload.added_by not in existing_members:
            raise HTTPException(status_code=403, detail="Only members can add others to the group")
            
        new_user_ids = [uid for uid in payload.user_ids if uid not in existing_members]
        if not new_user_ids:
            return []
            
        members_data = [{"group_id": group_id, "user_id": uid, "confirmed": False} for uid in new_user_ids]
        supabase.table("group_members").insert(members_data).execute()
        
        group_name = group.get("name")
        if not group_name and group.get("sport_id"):
            sport_rows = supabase.table("sports").select("name").eq("id", group["sport_id"]).execute().data or []
            if sport_rows:
                group_name = sport_rows[0].get("name")
                
        group_display = group_name or "a group"
        
        for uid in new_user_ids:
            _create_notification(
                supabase,
                uid,
                "Added to group",
                f"You were added to {group_display}.",
                "group_added",
                related_group_id=group_id
            )
            
        # Return added members profile info
        profiles = supabase.table("profiles").select("id,full_name,username,avatar_url").in_("id", new_user_ids).execute().data or []
        return profiles
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not add members: {exc}") from exc


@router.post("/groups/{group_id}/confirm")
def confirm_participation(group_id: str, payload: ConfirmParticipationRequest) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("group_members")
            .update({"confirmed": True})
            .eq("group_id", group_id)
            .eq("user_id", payload.user_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Group membership not found")
        group_rows = supabase.table("groups").select("captain_id").eq("id", group_id).execute().data or []
        profile_rows = (
            supabase.table("profiles").select("full_name,username").eq("id", payload.user_id).execute().data or []
        )
        captain_id = group_rows[0].get("captain_id") if group_rows else None
        sender_name = (
            profile_rows[0].get("full_name") or profile_rows[0].get("username")
            if profile_rows
            else "A teammate"
        )
        if captain_id and captain_id != payload.user_id:
            _create_notification(
                supabase,
                captain_id,
                "Participation confirmed",
                f"{sender_name} confirmed participation.",
                "confirmation",
                related_group_id=group_id,
            )
        return rows[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not confirm participation: {exc}") from exc


@router.post("/groups/{group_id}/decline")
def decline_participation(group_id: str, payload: ConfirmParticipationRequest) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("group_members")
            .update({"confirmed": False})
            .eq("group_id", group_id)
            .eq("user_id", payload.user_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Group membership not found")
        return rows[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not decline participation: {exc}") from exc


@router.get("/groups/{group_id}/messages")
def get_group_messages(group_id: str) -> list[dict]:
    supabase = require_supabase()
    try:
        try:
            # Group chat: only messages where event_id IS NULL (pure group messages).
            rows = (
                supabase.table("messages")
                .select("id,group_id,event_id,sender_id,content,created_at")
                .eq("group_id", group_id)
                .is_("event_id", "null")
                .order("created_at", desc=False)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            if not _is_missing_event_messages_error(exc):
                raise
            rows = (
                supabase.table("messages")
                .select("id,group_id,sender_id,content,created_at")
                .eq("group_id", group_id)
                .order("created_at", desc=False)
                .execute()
                .data
                or []
            )
        return _messages_with_senders(supabase, rows)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read group messages: {exc}") from exc


@router.post("/groups/{group_id}/messages")
def send_group_message(group_id: str, payload: MessageCreate) -> dict:
    supabase = require_supabase()
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content is required")

    try:
        member_ids = _group_member_ids(supabase, group_id)
        if payload.sender_id not in member_ids:
            raise HTTPException(status_code=403, detail="You are not part of this group")

        row = (
            supabase.table("messages")
            .insert({
                "group_id": group_id,
                "event_id": None,  # Group messages never belong to an event chat.
                "sender_id": payload.sender_id,
                "content": content,
            })
            .execute()
            .data[0]
        )
        try:
            sender_profile = _sender_profiles(supabase, [payload.sender_id]).get(payload.sender_id, {})
        except Exception:
            sender_profile = {}
        sender_name = sender_profile.get("full_name") or sender_profile.get("username") or "A teammate"
        for member_id in member_ids:
            if member_id != payload.sender_id:
                _create_notification(
                    supabase,
                    member_id,
                    "New group message",
                    f"{sender_name}: {content[:80]}",
                    "message",
                    related_group_id=group_id,
                )
        return _messages_with_senders(supabase, [row])[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not send group message: {exc}") from exc


@router.get("/events/{event_id}/messages")
def get_event_messages(event_id: str) -> list[dict]:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("messages")
            .select("id,group_id,event_id,sender_id,content,created_at")
            .eq("event_id", event_id)
            .order("created_at", desc=False)
            .execute()
            .data
            or []
        )
        return _messages_with_senders(supabase, rows)
    except Exception as exc:
        if _is_missing_event_messages_error(exc):
            return []
        raise HTTPException(status_code=500, detail=f"Could not read event messages: {exc}") from exc


@router.post("/events/{event_id}/messages")
def send_event_message(event_id: str, payload: MessageCreate) -> dict:
    supabase = require_supabase()
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content is required")

    try:
        profile_rows = supabase.table("profiles").select("id").eq("id", payload.sender_id).execute().data or []
        if not profile_rows:
            raise HTTPException(status_code=403, detail="Create a profile before sending messages")

        # Fetch the event to get group_id context for the message.
        event_rows = supabase.table("events").select("group_id").eq("id", event_id).execute().data or []
        event_group_id = event_rows[0].get("group_id") if event_rows else None

        row = (
            supabase.table("messages")
            .insert({
                "event_id": event_id,
                "group_id": event_group_id,  # Carry group context; event_id still distinguishes event chat.
                "sender_id": payload.sender_id,
                "content": content,
            })
            .execute()
            .data[0]
        )
        return _messages_with_senders(supabase, [row])[0]
    except HTTPException:
        raise
    except Exception as exc:
        if _is_missing_event_messages_error(exc):
            raise HTTPException(
                status_code=500,
                detail="Event chat needs backend/migrations/001_communication_realtime.sql.",
            ) from exc
        raise HTTPException(status_code=500, detail=f"Could not send event message: {exc}") from exc


@router.get("/notifications/{user_id}")
def get_notifications(user_id: str) -> list[dict]:
    supabase = require_supabase()
    try:
        return (
            supabase.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read notifications: {exc}") from exc


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("notifications")
            .update({"read": True})
            .eq("id", notification_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Notification not found")
        return rows[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not update notification: {exc}") from exc


@router.post("/notifications/{user_id}/read-all")
def mark_all_notifications_read(user_id: str) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("notifications")
            .update({"read": True})
            .eq("user_id", user_id)
            .eq("read", False)
            .execute()
            .data
            or []
        )
        return {"updated": len(rows)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not update notifications: {exc}") from exc


@router.get("/achievements/{user_id}")
def get_achievements(user_id: str) -> dict:
    supabase = require_supabase()
    try:
        achievements = supabase.table("achievements").select("*").execute().data or []
        unlocked_rows = (
            supabase.table("user_achievements")
            .select("achievement_id,unlocked_at")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        unlocked_by_id = {row["achievement_id"]: row.get("unlocked_at") for row in unlocked_rows}
        result = []
        total_points = 0
        for achievement in achievements:
            unlocked_at = unlocked_by_id.get(achievement["id"])
            unlocked = bool(unlocked_at)
            if unlocked:
                total_points += achievement.get("points") or 0
            result.append(
                {
                    **achievement,
                    "unlocked": unlocked,
                    "unlocked_at": unlocked_at,
                }
            )
        return {"user_id": user_id, "total_points": total_points, "achievements": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read achievements: {exc}") from exc


@router.post("/achievements/check/{user_id}")
def check_achievements(user_id: str) -> dict:
    supabase = require_supabase()
    try:
        achievements = supabase.table("achievements").select("*").execute().data or []
        if not achievements:
            return {"user_id": user_id, "unlocked_now": [], "total_points": 0}

        achievements_by_code = {achievement["code"]: achievement for achievement in achievements}
        unlocked_rows = (
            supabase.table("user_achievements")
            .select("achievement_id")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        unlocked_ids = {row["achievement_id"] for row in unlocked_rows}

        availability_rows = (
            supabase.table("availability")
            .select("id")
            .eq("user_id", user_id)
            .eq("is_available", True)
            .execute()
            .data
            or []
        )
        group_rows = (
            supabase.table("group_members")
            .select("id")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        event_rows = (
            supabase.table("events")
            .select("id")
            .eq("created_by", user_id)
            .execute()
            .data
            or []
        )
        message_rows = (
            supabase.table("messages")
            .select("id")
            .eq("sender_id", user_id)
            .execute()
            .data
            or []
        )

        availability_count = len(availability_rows)
        conditions = {
            "first_showup": availability_count >= 1,
            "first_match": len(group_rows) >= 1,
            "first_event": len(event_rows) >= 1,
            "social_player": len(message_rows) >= 1,
            "consistent_mover": availability_count >= 3,
        }

        unlocked_now = []
        for code, satisfied in conditions.items():
            achievement = achievements_by_code.get(code)
            if not satisfied or not achievement:
                continue
            if achievement["id"] in unlocked_ids:
                continue
            try:
                supabase.table("user_achievements").insert(
                    {"user_id": user_id, "achievement_id": achievement["id"]}
                ).execute()
            except Exception:
                continue
            unlocked_ids.add(achievement["id"])
            unlocked_now.append(achievement)

        total_points = sum(
            (achievement.get("points") or 0)
            for achievement in achievements
            if achievement["id"] in unlocked_ids
        )
        return {"user_id": user_id, "unlocked_now": unlocked_now, "total_points": total_points}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not check achievements: {exc}") from exc


@router.get("/fitness/{user_id}")
def get_fitness_integrations(user_id: str) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("fitness_integrations")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
            .data
            or []
        )
        return {"user_id": user_id, "integrations": rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read fitness integrations: {exc}") from exc


@router.post("/fitness/{user_id}/connect-demo")
def connect_fitness_demo(user_id: str, payload: FitnessConnectRequest) -> dict:
    supabase = require_supabase()
    provider = payload.provider.strip()
    if not provider:
        raise HTTPException(status_code=400, detail="provider is required")
    try:
        demo_steps = randint(3500, 14500)
        demo_minutes = randint(60, 320)
        now = datetime.now(timezone.utc).isoformat()

        existing = (
            supabase.table("fitness_integrations")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
            .data
            or []
        )
        payload_data = {
            "user_id": user_id,
            "provider": provider,
            "connected": True,
            "weekly_steps": demo_steps,
            "weekly_active_minutes": demo_minutes,
            "last_sync_at": now,
        }

        if existing:
            rows = (
                supabase.table("fitness_integrations")
                .update(payload_data)
                .eq("id", existing[0]["id"])
                .execute()
                .data
                or []
            )
            return rows[0] if rows else {**existing[0], **payload_data}

        rows = supabase.table("fitness_integrations").insert(payload_data).execute().data or []
        return rows[0] if rows else payload_data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not connect demo integration: {exc}") from exc


@router.post("/fitness/{user_id}/disconnect-demo")
def disconnect_fitness_demo(user_id: str, payload: FitnessConnectRequest) -> dict:
    supabase = require_supabase()
    provider = payload.provider.strip()
    if not provider:
        raise HTTPException(status_code=400, detail="provider is required")
    try:
        rows = (
            supabase.table("fitness_integrations")
            .update({"connected": False})
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
            .data
            or []
        )
        if not rows:
            return {"user_id": user_id, "provider": provider, "connected": False}
        return rows[0]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not disconnect demo integration: {exc}") from exc


@router.get("/matches/status/{user_id}")
def get_match_status(user_id: str, day: date | None = None) -> dict:
    supabase = require_supabase()
    target_day = (day or date.today()).isoformat()
    try:
        availability_rows = (
            supabase.table("availability")
            .select("*")
            .eq("user_id", user_id)
            .eq("date", target_day)
            .execute()
            .data
            or []
        )
        memberships = (
            supabase.table("group_members")
            .select("group_id,confirmed")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        if not memberships:
            return {
                "availability": availability_rows[0] if availability_rows else None,
                "group": None,
                "confirmed": None,
            }

        group_ids = [row["group_id"] for row in memberships]
        try:
            groups = (
                supabase.table("groups")
                .select("*")
                .in_("id", group_ids)
                .eq("match_date", target_day)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            if not _is_missing_group_metadata_error(exc):
                raise
            groups = (
                supabase.table("groups")
                .select("*")
                .in_("id", group_ids)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
        group = groups[0] if groups else None
        confirmed_by_group = {row["group_id"]: row.get("confirmed", False) for row in memberships}
        return {
            "availability": availability_rows[0] if availability_rows else None,
            "group": group,
            "confirmed": confirmed_by_group.get(group["id"]) if group else None,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read match status: {exc}") from exc


@router.post("/events")
def create_event(payload: EventCreate) -> dict:
    supabase = get_supabase()
    record = payload.model_dump(mode="json")

    if supabase is None:
        event = {
            "id": str(uuid4()),
            "sport_name": next(
                (sport["name"] for sport in mock_data.SPORTS if sport["id"] == payload.sport_id),
                "Open sport",
            ),
            **record,
        }
        mock_data.EVENTS.insert(0, event)
        return event

    event = supabase.table("events").insert(record).execute().data[0]
    if payload.group_id:
        sport_rows = (
            supabase.table("sports").select("name").eq("id", payload.sport_id).execute().data
            if payload.sport_id
            else []
        ) or []
        sport_name = sport_rows[0].get("name") if sport_rows else None
        for member_id in _group_member_ids(supabase, payload.group_id):
            if member_id == payload.created_by:
                continue
            _create_notification(
                supabase,
                member_id,
                "New event planned",
                f"A new {sport_name} event was created for your group." if sport_name else "A new event was created for your group.",
                "event_created",
                related_group_id=payload.group_id,
                related_event_id=event["id"],
            )
    return event


@router.get("/events")
def get_events(user_id: str | None = None) -> list[dict]:
    supabase = get_supabase()
    if supabase is None:
        return mock_data.EVENTS
    try:
        visible_group_ids: set[str] = set()
        if user_id:
            memberships = (
                supabase.table("group_members").select("group_id").eq("user_id", user_id).execute().data or []
            )
            visible_group_ids = {row["group_id"] for row in memberships}

        rows = (
            supabase.table("events")
            .select("*, sports(name)")
            .order("event_time", desc=False)
            .execute()
            .data
            or []
        )
        if user_id:
            rows = [
                row
                for row in rows
                if row.get("created_by") == user_id
                or (row.get("group_id") and row.get("group_id") in visible_group_ids)
            ]
        return _event_response_rows(supabase, rows)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read events: {exc}") from exc


@router.get("/events/{event_id}")
def get_event(event_id: str) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("events")
            .select("*, sports(name)")
            .eq("id", event_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Event not found")
        return _event_response_rows(supabase, rows)[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read event: {exc}") from exc


@router.get("/events/{event_id}/calendar.ics")
def export_event_calendar(event_id: str) -> Response:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("events")
            .select("*, sports(name)")
            .eq("id", event_id)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Event not found")

        event = rows[0]
        start = _parse_datetime(event.get("event_time"))
        if not start:
            raise HTTPException(status_code=400, detail="Event time is required for calendar export")

        end = start + timedelta(hours=1)
        sport_name = (event.get("sports") or {}).get("name") or "Sport"
        summary = event.get("title") or "ShowUp2Move event"
        location = event.get("location_name") or ""
        description = f"ShowUp2Move event for {sport_name}."

        ics_lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//ShowUp2Move//EN",
            "CALSCALE:GREGORIAN",
            "BEGIN:VEVENT",
            f"UID:{event_id}@showup2move",
            f"DTSTAMP:{_ics_datetime(datetime.now(timezone.utc))}",
            f"DTSTART:{_ics_datetime(start)}",
            f"DTEND:{_ics_datetime(end)}",
            f"SUMMARY:{_ics_escape(summary)}",
            f"LOCATION:{_ics_escape(location)}",
            f"DESCRIPTION:{_ics_escape(description)}",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        ics_content = "\r\n".join(ics_lines) + "\r\n"

        try:
            supabase.table("events").update({"calendar_exported": True}).eq("id", event_id).execute()
        except Exception:
            pass

        filename = f"showup2move-{event_id}.ics"
        return Response(
            content=ics_content,
            media_type="text/calendar; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not export calendar: {exc}") from exc


@router.delete("/events/{event_id}")
def delete_event(event_id: str, user_id: str | None = None) -> dict:
    supabase = require_supabase()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required to delete an event")

    try:
        rows = supabase.table("events").select("*").eq("id", event_id).execute().data or []
        if not rows:
            raise HTTPException(status_code=404, detail="Event not found")
        event = rows[0]

        # Allow deletion by event creator OR group captain.
        is_creator = event.get("created_by") == user_id
        is_captain = False
        if not is_creator and event.get("group_id"):
            group_rows = (
                supabase.table("groups").select("captain_id").eq("id", event["group_id"]).execute().data or []
            )
            captain_id = group_rows[0].get("captain_id") if group_rows else None
            is_captain = captain_id == user_id
        if not is_creator and not is_captain:
            raise HTTPException(status_code=403, detail="Only the event creator or group captain can delete this event")

        member_ids = _group_member_ids(supabase, event["group_id"]) if event.get("group_id") else []
        supabase.table("events").delete().eq("id", event_id).execute()

        for member_id in member_ids:
            if member_id == user_id:
                continue
            _create_notification(
                supabase,
                member_id,
                "Event cancelled",
                "An event for your group was cancelled.",
                "event_deleted",
                related_group_id=event.get("group_id"),
            )

        return {"message": "Event deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not delete event: {exc}") from exc


@router.post("/events/{event_id}/participate")
def update_event_participation(event_id: str, payload: EventParticipationRequest) -> dict:
    supabase = require_supabase()
    try:
        # Check if event exists
        event_rows = supabase.table("events").select("*").eq("id", event_id).execute().data or []
        if not event_rows:
            raise HTTPException(status_code=404, detail="Event not found")

        # Upsert participation
        participation_data = {
            "event_id": event_id,
            "user_id": payload.user_id,
            "status": payload.status,
        }
        result = (
            supabase.table("event_participants")
            .upsert(participation_data, on_conflict="event_id,user_id")
            .execute()
        )
        return result.data[0] if result.data else participation_data
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not update participation: {exc}") from exc


@router.get("/events/{event_id}/participants")
def get_event_participants(event_id: str) -> list[dict]:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("event_participants")
            .select("*, profiles(id, full_name, username, avatar_url)")
            .eq("event_id", event_id)
            .execute()
            .data
            or []
        )
        return rows
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read participants: {exc}") from exc


@router.post("/events/{event_id}/invites")
def create_event_invite(event_id: str, payload: InviteCreateRequest) -> dict:
    supabase = require_supabase()
    try:
        event_rows = (
            supabase.table("events")
            .select("id,title,location_name,event_time,created_by")
            .eq("id", event_id)
            .execute()
            .data
            or []
        )
        if not event_rows:
            raise HTTPException(status_code=404, detail="Event not found")

        event = event_rows[0]
        invited_by = payload.invited_by or event.get("created_by")
        if not invited_by:
            raise HTTPException(status_code=400, detail="invited_by is required")

        token = uuid4().hex
        invite_record = {
            "event_id": event_id,
            "invited_by": invited_by,
            "invited_email": payload.invited_email,
            "invited_user_id": payload.invited_user_id,
            "invite_token": token,
            "status": "pending",
        }

        rows = supabase.table("event_invites").insert(invite_record).execute().data or []
        if payload.invited_user_id and payload.invited_user_id != invited_by:
            _create_notification(
                supabase,
                payload.invited_user_id,
                "Event invite",
                f"You were invited to {event.get('title') or 'an event'}.",
                "invite",
                related_event_id=event_id,
            )

        frontend_url = os.getenv("FRONTEND_URL") or "http://localhost:3000"
        invite_link = f"{frontend_url.rstrip('/')}/invite/{token}"
        return {
            "invite": rows[0] if rows else invite_record,
            "invite_link": invite_link,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not create invite: {exc}") from exc


@router.get("/invites/{token}")
def get_invite(token: str) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("event_invites")
            .select("*, events(title,location_name,event_time)")
            .eq("invite_token", token)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Invite not found")

        invite = rows[0]
        event = invite.get("events") or {}
        return {
            "invite_id": invite.get("id"),
            "event_id": invite.get("event_id"),
            "status": invite.get("status"),
            "invited_email": invite.get("invited_email"),
            "invited_user_id": invite.get("invited_user_id"),
            "invited_by": invite.get("invited_by"),
            "event": {
                "title": event.get("title"),
                "location_name": event.get("location_name"),
                "event_time": event.get("event_time"),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read invite: {exc}") from exc


@router.post("/invites/{token}/accept")
def accept_invite(token: str, payload: InviteAcceptRequest) -> dict:
    supabase = require_supabase()
    try:
        rows = (
            supabase.table("event_invites")
            .select("*")
            .eq("invite_token", token)
            .execute()
            .data
            or []
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Invite not found")

        invite = rows[0]
        update_payload = {"status": "accepted"}
        if not invite.get("invited_user_id"):
            update_payload["invited_user_id"] = payload.user_id

        updated_rows = (
            supabase.table("event_invites")
            .update(update_payload)
            .eq("id", invite.get("id"))
            .execute()
            .data
            or []
        )

        inviter_id = invite.get("invited_by")
        if inviter_id and inviter_id != payload.user_id:
            _create_notification(
                supabase,
                inviter_id,
                "Invite accepted",
                "Your event invite was accepted.",
                "invite_accepted",
                related_event_id=invite.get("event_id"),
            )

        return {"invite": updated_rows[0] if updated_rows else {**invite, **update_payload}}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not accept invite: {exc}") from exc


@router.post("/ai/extract-interests")
def ai_extract_interests(payload: ExtractInterestsRequest) -> dict:
    return extract_profile_interests(payload.description)


@router.post("/ai/extract-photo-interests")
def ai_extract_photo_interests(payload: ExtractPhotoInterestsRequest) -> dict:
    return extract_photo_interests(payload.image_url)


@router.post("/ai/compatibility-score")
def ai_compatibility_score(payload: CompatibilityRequest) -> dict:
    return compatibility_score_ai(payload.user_a, payload.user_b)


@router.post("/ai/teammate-recommendations")
def ai_teammate_recommendations(payload: TeammateRecommendationsRequest) -> dict:
    return teammate_recommendations(payload.current_user, payload.candidates)


@router.get("/demo/messages/{group_id}")
def get_demo_messages(group_id: str) -> list[dict]:
    return [message for message in mock_data.MESSAGES if message["group_id"] == group_id]


@router.get("/ai/local/health")
def ai_local_health() -> dict:
    """Check if local AI (Ollama) is available."""
    return get_ai_health()


@router.post("/ai/explain-match")
def ai_explain_match(payload: ExplainMatchRequest) -> dict:
    """Generate AI explanation for why a group match works."""
    supabase = require_supabase()
    try:
        # Fetch group data
        group_rows = (
            supabase.table("groups")
            .select("*")
            .eq("id", payload.group_id)
            .execute()
            .data
            or []
        )
        if not group_rows:
            raise HTTPException(status_code=404, detail="Group not found")
        
        group = group_rows[0]
        
        # Get sport name
        sport_name = None
        if group.get("sport_id"):
            sport_rows = (
                supabase.table("sports")
                .select("name")
                .eq("id", group["sport_id"])
                .execute()
                .data
                or []
            )
            if sport_rows:
                sport_name = sport_rows[0].get("name")
        
        # Get members
        members = (
            supabase.table("group_members")
            .select("user_id,confirmed")
            .eq("group_id", payload.group_id)
            .execute()
            .data
            or []
        )
        
        member_ids = [m["user_id"] for m in members]
        profiles = []
        if member_ids:
            profiles = (
                supabase.table("profiles")
                .select("id,full_name,city")
                .in_("id", member_ids)
                .execute()
                .data
                or []
            )
        
        # Get skill levels
        user_sports = []
        if member_ids and group.get("sport_id"):
            user_sports = (
                supabase.table("user_sports")
                .select("user_id,skill_level")
                .in_("user_id", member_ids)
                .eq("sport_id", group["sport_id"])
                .execute()
                .data
                or []
            )
        
        skill_by_user = {row["user_id"]: row.get("skill_level", "intermediate") for row in user_sports}
        
        # Build group data for AI
        group_data = {
            "sport_name": sport_name or "sport",
            "member_count": len(members),
            "city": group.get("city"),
            "members": [
                {
                    "id": p["id"],
                    "full_name": p.get("full_name", "Player"),
                    "skill_level": skill_by_user.get(p["id"], "intermediate"),
                }
                for p in profiles
            ],
        }
        
        # Generate explanation
        result = explain_match(group_data)
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not generate match explanation: {exc}") from exc


@router.post("/ai/captain-plan")
def ai_captain_plan(payload: CaptainPlanRequest) -> dict:
    """Generate AI captain coordination plan for an event."""
    supabase = require_supabase()
    try:
        # Fetch event data
        event_rows = (
            supabase.table("events")
            .select("*,sports(name)")
            .eq("id", payload.event_id)
            .execute()
            .data
            or []
        )
        if not event_rows:
            raise HTTPException(status_code=404, detail="Event not found")
        
        event = event_rows[0]
        
        # Get participant count
        participants = (
            supabase.table("event_participants")
            .select("user_id,status")
            .eq("event_id", payload.event_id)
            .execute()
            .data
            or []
        )
        
        participant_count = len([p for p in participants if p.get("status") == "attending"])
        
        # Build event data for AI
        event_data = {
            "title": event.get("title", "Event"),
            "sport_name": (event.get("sports") or {}).get("name", "sport"),
            "location_name": event.get("location_name", "venue"),
            "event_time": event.get("event_time", ""),
            "participant_count": participant_count,
            "price": event.get("price_estimate"),
        }
        
        # Generate plan
        result = generate_captain_plan(event_data)
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not generate captain plan: {exc}") from exc
