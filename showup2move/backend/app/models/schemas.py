from datetime import date as date_type, datetime
from typing import Any

from pydantic import BaseModel, Field


class UserSportPreference(BaseModel):
    sport_id: str
    skill_level: str = "intermediate"


class ProfileCreate(BaseModel):
    id: str
    full_name: str
    username: str
    description: str = ""
    avatar_url: str | None = None
    city: str = ""
    latitude: float | None = None
    longitude: float | None = None
    sports: list[str] = Field(default_factory=list)
    sports_preferences: list[UserSportPreference] = Field(default_factory=list)


class AvailabilityCreate(BaseModel):
    user_id: str
    date: date_type
    is_available: bool
    preferred_time: str | None = "Evening"


class MatchRunRequest(BaseModel):
    date: date_type | None = None
    city: str | None = None
    sport_id: str | None = None
    max_distance_km: float | None = None


class EventCreate(BaseModel):
    created_by: str
    sport_id: str | None = None
    group_id: str | None = None
    title: str
    location_name: str = ""
    latitude: float | None = None
    longitude: float | None = None
    event_time: datetime | None = None
    price_estimate: float | None = None


class ExtractInterestsRequest(BaseModel):
    description: str


class CompatibilityRequest(BaseModel):
    user_a: dict[str, Any]
    user_b: dict[str, Any]


class ConfirmParticipationRequest(BaseModel):
    user_id: str
