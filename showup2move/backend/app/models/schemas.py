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
    calendar_exported: bool | None = False
    weather_summary: str | None = None
    weather_score: int | None = 0


class MessageCreate(BaseModel):
    sender_id: str
    content: str


class ExtractInterestsRequest(BaseModel):
    description: str


class ExtractPhotoInterestsRequest(BaseModel):
    image_url: str


class CompatibilityRequest(BaseModel):
    user_a: dict[str, Any]
    user_b: dict[str, Any]


class TeammateRecommendationsRequest(BaseModel):
    current_user: dict[str, Any]
    candidates: list[dict[str, Any]] = Field(default_factory=list)


class ConfirmParticipationRequest(BaseModel):
    user_id: str


class GroupCreate(BaseModel):
    name: str | None = None
    sport_id: str | None = None
    city: str | None = None
    description: str | None = None
    created_by: str
    member_ids: list[str] = Field(default_factory=list)


class GroupDeleteRequest(BaseModel):
    user_id: str


class GroupAddMembersRequest(BaseModel):
    user_ids: list[str]
    added_by: str


class TeamBalancePlayer(BaseModel):
    user_id: str
    full_name: str
    skill_level: str = "intermediate"


class TeamBalanceRequest(BaseModel):
    sport: str
    players: list[TeamBalancePlayer]
    teams_count: int = 2


class InviteCreateRequest(BaseModel):
    invited_email: str | None = None
    invited_user_id: str | None = None
    invited_by: str | None = None


class InviteAcceptRequest(BaseModel):
    user_id: str


class FitnessConnectRequest(BaseModel):
    provider: str


class EventParticipationRequest(BaseModel):
    user_id: str
    status: str = "attending"


class ExplainMatchRequest(BaseModel):
    group_id: str


class CaptainPlanRequest(BaseModel):
    group_id: str
    event_id: str
