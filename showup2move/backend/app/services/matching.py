from collections import Counter, defaultdict
from datetime import date, datetime, timezone
from math import asin, cos, radians, sin, sqrt
from random import choice, shuffle
from uuid import uuid4

from app.core.supabase import get_supabase
from app.services import mock_data

SKILL_SCORE = {"beginner": 1, "intermediate": 2, "advanced": 3}
SPORT_WORDS = {"football", "tennis", "basketball", "running", "run", "volleyball", "gym", "fitness"}


def _is_missing_group_metadata_error(exc: Exception) -> bool:
    message = str(exc)
    return (
        "groups.match_date" in message
        or "groups.city" in message
        or "groups.average_skill" in message
        or "groups.match_score" in message
        or "column groups." in message
    )


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    a = (
        sin(delta_lat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(delta_lon / 2) ** 2
    )
    return 2 * radius_km * asin(sqrt(a))


def _text_tokens(value: str | None) -> set[str]:
    if not value:
        return set()
    return {
        token.strip(".,!?;:()[]{}").lower()
        for token in value.split()
        if len(token.strip(".,!?;:()[]{}")) >= 3
    }


def _average_skill(skill_levels: list[str]) -> str:
    if not skill_levels:
        return "intermediate"
    average = sum(SKILL_SCORE.get(level, 2) for level in skill_levels) / len(skill_levels)
    if average < 1.5:
        return "beginner"
    if average > 2.45:
        return "advanced"
    return "intermediate"


def _group_match_score(candidates: list[dict], sport_name: str, target_city: str | None) -> int:
    if not candidates:
        return 0

    score = 50
    city_counts = Counter((candidate["profile"].get("city") or "").lower() for candidate in candidates)
    common_city, common_city_count = city_counts.most_common(1)[0]
    if common_city and common_city_count == len(candidates):
        score += 20
    elif target_city and common_city == target_city.lower():
        score += 10

    skills = [candidate["skill_level"] for candidate in candidates]
    if len(set(skills)) == 1:
        score += 15
    elif max(SKILL_SCORE.get(skill, 2) for skill in skills) - min(SKILL_SCORE.get(skill, 2) for skill in skills) <= 1:
        score += 8

    sport_token = sport_name.lower()
    descriptions = [_text_tokens(candidate["profile"].get("description")) for candidate in candidates]
    if any(sport_token in tokens or SPORT_WORDS.intersection(tokens) for tokens in descriptions):
        score += 10

    return min(score, 100)


def _candidate_sort_key(candidate: dict, target_city: str | None, anchor: dict | None, max_distance_km: float | None) -> tuple:
    profile = candidate["profile"]
    same_city = bool(target_city and (profile.get("city") or "").lower() == target_city.lower())

    distance = 9999.0
    if anchor and None not in (
        profile.get("latitude"),
        profile.get("longitude"),
        anchor.get("latitude"),
        anchor.get("longitude"),
    ):
        distance = calculate_distance_km(
            float(profile["latitude"]),
            float(profile["longitude"]),
            float(anchor["latitude"]),
            float(anchor["longitude"]),
        )

    within_distance = max_distance_km is None or distance == 9999.0 or distance <= max_distance_km
    tokens = _text_tokens(profile.get("description"))
    interest_score = len(tokens.intersection(SPORT_WORDS))
    return (not same_city, not within_distance, distance, -interest_score, profile.get("full_name") or "")


def _chunk_users(users: list[str], max_players: int) -> list[list[str]]:
    shuffled = users[:]
    shuffle(shuffled)
    return [shuffled[index : index + max_players] for index in range(0, len(shuffled), max_players)]


def run_mock_matching() -> dict:
    available_user_ids = [
        item["user_id"]
        for item in mock_data.AVAILABILITY
        if item["date"] == date.today().isoformat() and item["is_available"]
    ]
    users_by_sport: dict[str, list[str]] = defaultdict(list)
    for user_id in available_user_ids:
        for sport in mock_data.PROFILES[user_id].get("sports", []):
            users_by_sport[sport].append(user_id)

    created_groups = []
    skipped = []

    for sport in mock_data.SPORTS:
        sport_name = sport["name"]
        users = users_by_sport.get(sport_name, [])
        if len(users) < sport["min_players"]:
            skipped.append(
                {
                    "sport": sport_name,
                    "available_users": len(users),
                    "needed": sport["min_players"],
                }
            )
            continue

        for member_ids in _chunk_users(users, sport["max_players"]):
            if len(member_ids) < sport["min_players"]:
                skipped.append(
                    {
                        "sport": sport_name,
                        "available_users": len(member_ids),
                        "needed": sport["min_players"],
                    }
                )
                continue
            captain_id = choice(member_ids)
            group = {
                "id": str(uuid4()),
                "sport_id": sport["id"],
                "sport_name": sport_name,
                "captain_id": captain_id,
                "captain_name": mock_data.PROFILES[captain_id]["full_name"],
                "status": "pending",
                "member_count": len(member_ids),
                "members": [mock_data.PROFILES[user_id] for user_id in member_ids],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            mock_data.GROUPS.append(group)
            created_groups.append(group)

    return {
        "source": "mock",
        "created_groups": len(created_groups),
        "groups": created_groups,
        "skipped": skipped,
        "message": f"{len(created_groups)} groups created successfully",
    }


def run_supabase_matching(
    match_date: date | None = None,
    city: str | None = None,
    sport_id: str | None = None,
    max_distance_km: float | None = None,
) -> dict:
    supabase = get_supabase()
    if supabase is None:
        return run_mock_matching()

    target_date = (match_date or date.today()).isoformat()
    available = (
        supabase.table("availability")
        .select("user_id,date,is_available,preferred_time")
        .eq("date", target_date)
        .eq("is_available", True)
        .execute()
        .data
        or []
    )
    available_user_ids = [row["user_id"] for row in available]
    if not available_user_ids:
        return {
            "source": "supabase",
            "created_groups": 0,
            "groups": [],
            "skipped": [],
            "message": "No available players for this date.",
        }

    sports_query = supabase.table("sports").select("*")
    if sport_id:
        sports_query = sports_query.eq("id", sport_id)
    sports = sports_query.execute().data or []
    if not sports:
        return {
            "source": "supabase",
            "created_groups": 0,
            "groups": [],
            "skipped": [],
            "message": "No matching sport found.",
        }

    profiles = (
        supabase.table("profiles")
        .select("id,full_name,username,description,avatar_url,city,latitude,longitude")
        .in_("id", available_user_ids)
        .execute()
        .data
        or []
    )
    profiles_by_id = {profile["id"]: profile for profile in profiles}

    user_sports = (
        supabase.table("user_sports")
        .select("user_id,sport_id,skill_level")
        .in_("user_id", available_user_ids)
        .execute()
        .data
        or []
    )

    users_by_sport: dict[str, list[dict]] = defaultdict(list)
    for row in user_sports:
        profile = profiles_by_id.get(row["user_id"])
        if profile:
            users_by_sport[row["sport_id"]].append(
                {
                    "user_id": row["user_id"],
                    "sport_id": row["sport_id"],
                    "skill_level": row.get("skill_level") or "intermediate",
                    "profile": profile,
                }
            )

    existing_group_ids = []
    existing_users_by_sport: dict[str, set[str]] = defaultdict(set)
    group_metadata_supported = True
    try:
        existing_query = supabase.table("groups").select("id,sport_id,match_date,city").eq("match_date", target_date)
        if city:
            existing_query = existing_query.eq("city", city)
        existing_groups = existing_query.execute().data or []
        if sport_id:
            existing_groups = [group for group in existing_groups if group.get("sport_id") == sport_id]
    except Exception as exc:
        if not _is_missing_group_metadata_error(exc):
            raise
        group_metadata_supported = False
        existing_query = supabase.table("groups").select("id,sport_id")
        if sport_id:
            existing_query = existing_query.eq("sport_id", sport_id)
        existing_groups = existing_query.execute().data or []
    existing_group_ids = [group["id"] for group in existing_groups]
    if existing_group_ids:
        existing_members = (
            supabase.table("group_members")
            .select("group_id,user_id")
            .in_("group_id", existing_group_ids)
            .execute()
            .data
            or []
        )
        sport_by_group = {group["id"]: group.get("sport_id") for group in existing_groups}
        for member in existing_members:
            group_sport_id = sport_by_group.get(member["group_id"])
            if group_sport_id:
                existing_users_by_sport[group_sport_id].add(member["user_id"])

    created_groups = []
    skipped = []
    for sport in sports:
        candidates = [
            candidate
            for candidate in users_by_sport.get(sport["id"], [])
            if candidate["user_id"] not in existing_users_by_sport.get(sport["id"], set())
        ]

        if len(candidates) < sport["min_players"]:
            skipped.append(
                {
                    "sport": sport["name"],
                    "available_users": len(candidates),
                    "needed": sport["min_players"],
                }
            )
            continue

        city_sorted = sorted(
            candidates,
            key=lambda candidate: _candidate_sort_key(candidate, city, None, max_distance_km),
        )

        while len(city_sorted) >= sport["min_players"]:
            anchor = city_sorted[0]["profile"]
            sorted_for_anchor = sorted(
                city_sorted,
                key=lambda candidate: _candidate_sort_key(candidate, city, anchor, max_distance_km),
            )
            selected = sorted_for_anchor[: sport["max_players"]]
            if len(selected) < sport["min_players"]:
                continue

            selected_ids = {candidate["user_id"] for candidate in selected}
            city_sorted = [candidate for candidate in city_sorted if candidate["user_id"] not in selected_ids]

            captain_id = choice([candidate["user_id"] for candidate in selected])
            selected_profiles = [candidate["profile"] for candidate in selected]
            group_city = city or next((profile.get("city") for profile in selected_profiles if profile.get("city")), "")
            skill_levels = [candidate["skill_level"] for candidate in selected]
            match_score = _group_match_score(selected, sport["name"], city)
            group_payload = {
                "sport_id": sport["id"],
                "captain_id": captain_id,
                "status": "pending",
            }
            if group_metadata_supported:
                group_payload.update(
                    {
                        "match_date": target_date,
                        "city": group_city,
                        "average_skill": _average_skill(skill_levels),
                        "match_score": match_score,
                    }
                )
            try:
                group = supabase.table("groups").insert(group_payload).execute().data[0]
            except Exception as exc:
                if not group_metadata_supported or not _is_missing_group_metadata_error(exc):
                    raise
                group_metadata_supported = False
                group = (
                    supabase.table("groups")
                    .insert({"sport_id": sport["id"], "captain_id": captain_id, "status": "pending"})
                    .execute()
                    .data[0]
                )
            members = [
                {"group_id": group["id"], "user_id": candidate["user_id"], "confirmed": candidate["user_id"] == captain_id}
                for candidate in selected
            ]
            supabase.table("group_members").upsert(members, on_conflict="group_id,user_id").execute()
            created_groups.append(
                {
                    **group,
                    "sport_name": sport["name"],
                    "member_count": len(selected),
                    "members": [
                        {
                            **candidate["profile"],
                            "skill_level": candidate["skill_level"],
                            "confirmed": candidate["user_id"] == captain_id,
                        }
                        for candidate in selected
                    ],
                    "explanations": [
                        f"Matched because you all like {sport['name']} and are available today.",
                        "Nearby match: same city" if group_city else "Location kept flexible",
                        "Similar skill level" if len(set(skill_levels)) <= 2 else "Mixed skill group",
                    ],
                }
            )

    return {
        "source": "supabase",
        "created_groups": len(created_groups),
        "groups": created_groups,
        "skipped": skipped,
        "message": (
            f"{len(created_groups)} groups created successfully"
            if created_groups
            else "Not enough available players yet. Invite more friends or try another sport."
        ),
    }
