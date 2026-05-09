from datetime import date
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.core.supabase import get_supabase, require_supabase
from app.models.schemas import (
    AvailabilityCreate,
    CompatibilityRequest,
    ConfirmParticipationRequest,
    EventCreate,
    ExtractInterestsRequest,
    MatchRunRequest,
    ProfileCreate,
)
from app.services import mock_data
from app.services.ai import compatibility_score, extract_interests
from app.services.matching import run_supabase_matching


def _is_missing_group_metadata_error(exc: Exception) -> bool:
    message = str(exc)
    return "groups.match_date" in message or "column groups." in message

router = APIRouter()


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
            supabase.table("group_members")
            .select("group_id,confirmed")
            .eq("user_id", user_id)
            .execute()
            .data
            or []
        )
        group_ids = [row["group_id"] for row in memberships]
        confirmed_by_group = {row["group_id"]: row.get("confirmed", False) for row in memberships}
        if not group_ids:
            return []

        groups = (
            supabase.table("groups")
            .select("*")
            .in_("id", group_ids)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
        sport_ids = list({group["sport_id"] for group in groups if group.get("sport_id")})
        captain_ids = list({group["captain_id"] for group in groups if group.get("captain_id")})
        all_members = (
            supabase.table("group_members")
            .select("group_id,user_id,confirmed")
            .in_("group_id", group_ids)
            .execute()
            .data
            or []
        )
        member_user_ids = list({row["user_id"] for row in all_members})
        profile_ids = list({*captain_ids, *member_user_ids})

        sports = (
            supabase.table("sports").select("id,name").in_("id", sport_ids).execute().data
            if sport_ids
            else []
        ) or []
        profiles = (
            supabase.table("profiles")
            .select("id,full_name,username,description,avatar_url,city")
            .in_("id", profile_ids)
            .execute()
            .data
            if profile_ids
            else []
        ) or []
        member_sports = (
            supabase.table("user_sports")
            .select("user_id,sport_id,skill_level")
            .in_("user_id", member_user_ids)
            .in_("sport_id", sport_ids)
            .execute()
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

    return supabase.table("events").insert(record).execute().data[0]


@router.get("/events")
def get_events() -> list[dict]:
    supabase = get_supabase()
    if supabase is None:
        return mock_data.EVENTS
    try:
        rows = (
            supabase.table("events")
            .select("*, sports(name)")
            .order("event_time", desc=False)
            .execute()
            .data
            or []
        )
        return [
            {
                **row,
                "sport_name": (row.get("sports") or {}).get("name"),
            }
            for row in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read events: {exc}") from exc


@router.post("/ai/extract-interests")
def ai_extract_interests(payload: ExtractInterestsRequest) -> dict:
    return extract_interests(payload.description)


@router.post("/ai/compatibility-score")
def ai_compatibility_score(payload: CompatibilityRequest) -> dict:
    return compatibility_score(payload.user_a, payload.user_b)


@router.get("/demo/messages/{group_id}")
def get_demo_messages(group_id: str) -> list[dict]:
    return [message for message in mock_data.MESSAGES if message["group_id"] == group_id]
