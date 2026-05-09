from datetime import date, datetime, timezone
from uuid import uuid4


SPORTS = [
    {"id": "football", "name": "Football", "min_players": 10, "max_players": 14},
    {"id": "tennis", "name": "Tennis", "min_players": 2, "max_players": 4},
    {"id": "basketball", "name": "Basketball", "min_players": 6, "max_players": 10},
    {"id": "running", "name": "Running", "min_players": 2, "max_players": 20},
    {"id": "volleyball", "name": "Volleyball", "min_players": 8, "max_players": 12},
]

PROFILES: dict[str, dict] = {
    "demo-alex": {
        "id": "demo-alex",
        "full_name": "Alex Popescu",
        "username": "alexruns",
        "description": "Weekend runner, casual tennis player, always up for after-work matches.",
        "avatar_url": "",
        "city": "Bucharest",
        "latitude": 44.4268,
        "longitude": 26.1025,
        "sports": ["Running", "Tennis"],
    },
    "demo-mira": {
        "id": "demo-mira",
        "full_name": "Mira Ionescu",
        "username": "mira_moves",
        "description": "Basketball guard and volleyball fan looking for friendly weekday games.",
        "avatar_url": "",
        "city": "Bucharest",
        "latitude": 44.433,
        "longitude": 26.095,
        "sports": ["Basketball", "Volleyball"],
    },
    "demo-vlad": {
        "id": "demo-vlad",
        "full_name": "Vlad Matei",
        "username": "vladfc",
        "description": "Football defender, intermediate level, happy to captain a quick pickup game.",
        "avatar_url": "",
        "city": "Bucharest",
        "latitude": 44.42,
        "longitude": 26.11,
        "sports": ["Football", "Running"],
    },
}

AVAILABILITY: list[dict] = [
    {
        "id": str(uuid4()),
        "user_id": user_id,
        "date": date.today().isoformat(),
        "is_available": True,
        "preferred_time": "Evening",
    }
    for user_id in PROFILES
]

GROUPS: list[dict] = [
    {
        "id": "demo-running-group",
        "sport_id": "running",
        "sport_name": "Running",
        "captain_id": "demo-alex",
        "captain_name": "Alex Popescu",
        "status": "ready",
        "member_count": 3,
        "members": list(PROFILES.values()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
]

EVENTS: list[dict] = [
    {
        "id": "demo-event-1",
        "title": "Sunset run in Herastrau",
        "created_by": "demo-alex",
        "sport_id": "running",
        "sport_name": "Running",
        "location_name": "King Michael I Park",
        "event_time": datetime.now(timezone.utc).isoformat(),
        "price_estimate": 0,
    },
    {
        "id": "demo-event-2",
        "title": "Friendly tennis doubles",
        "created_by": "demo-mira",
        "sport_id": "tennis",
        "sport_name": "Tennis",
        "location_name": "Tineretului Courts",
        "event_time": datetime.now(timezone.utc).isoformat(),
        "price_estimate": 60,
    },
]

MESSAGES: list[dict] = [
    {
        "id": "message-1",
        "group_id": "demo-running-group",
        "sender_name": "Alex",
        "content": "I can bring the route. Who is in for 7 PM?",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "message-2",
        "group_id": "demo-running-group",
        "sender_name": "Mira",
        "content": "In. Easy pace works best for me today.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

