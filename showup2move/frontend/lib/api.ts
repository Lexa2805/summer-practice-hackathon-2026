import { demoUserId, events, groups, messages, profile, sports } from "@/lib/mock-data";
import type {
  EventItem,
  AvailableUser,
  CompatibilityResult,
  DirectConversation,
  DirectMessage,
  WeatherRecommendation,
  TeamBalanceResult,
  TeamBalancePlayer,
  AchievementsResponse,
  AchievementsCheckResponse,
  InviteDetails,
  InviteCreateResponse,
  FitnessIntegration,
  FitnessIntegrationsResponse,
  ExtractInterestsResult,
  ExtractPhotoInterestsResult,
  Group,
  MatchRunPayload,
  MatchRunResult,
  Message,
  NotificationItem,
  Profile,
  Sport,
  TeammateRecommendation,
  UserSportPreference
} from "@/lib/types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function apiFetch<T>(path: string, init?: RequestInit, fallback?: T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Unable to reach API at ${API_URL}${path}`);
  }
}

async function apiFetchStrict<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let detail = `API ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail || detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

export function getSports() {
  return apiFetch<Sport[]>("/sports", undefined, sports);
}

export function getProfile(userId = demoUserId) {
  return apiFetchStrict<Profile>(`/profiles/${userId}`);
}

export function getProfileWithFallback(userId = demoUserId) {
  return apiFetch<Profile>(`/profiles/${userId}`, undefined, profile);
}

export function saveProfile(payload: Profile & { sports_preferences?: UserSportPreference[] }) {
  return apiFetchStrict<Profile>(
    "/profiles",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function setAvailability(payload: {
  user_id: string;
  date: string;
  is_available: boolean;
  preferred_time?: string;
}) {
  return apiFetchStrict(
    "/availability",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function getAvailability(userId: string, day?: string) {
  const query = day ? `?day=${day}` : "";
  return apiFetchStrict<{ user_id: string; date: string; is_available: boolean | null }>(
    `/availability/${userId}${query}`
  );
}

export function runMatching(payload: MatchRunPayload) {
  return apiFetchStrict<MatchRunResult>(
    "/match/run",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function getGroups(userId = demoUserId) {
  return apiFetchStrict<Group[]>(`/groups/${userId}`);
}

export function getGroupsWithFallback(userId = demoUserId) {
  return apiFetch<Group[]>(`/groups/${userId}`, undefined, groups);
}

export function getEvents(userId?: string) {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return apiFetchStrict<EventItem[]>(`/events${query}`);
}

export function getEvent(eventId: string) {
  return apiFetchStrict<EventItem>(`/events/${eventId}`);
}

export function getEventsWithFallback() {
  return apiFetch<EventItem[]>("/events", undefined, events);
}

export function getEventCalendarUrl(eventId: string) {
  return `${API_URL}/events/${eventId}/calendar.ics`;
}

export function createEvent(payload: Omit<EventItem, "id">) {
  return apiFetchStrict<EventItem>(
    "/events",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function deleteEvent(eventId: string, userId: string) {
  return apiFetchStrict<{ message: string }>(
    `/events/${eventId}?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export function confirmParticipation(groupId: string, userId: string) {
  return apiFetchStrict<{ group_id: string; user_id: string; confirmed: boolean }>(
    `/groups/${groupId}/confirm`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) }
  );
}

export function declineParticipation(groupId: string, userId: string) {
  return apiFetchStrict<{ group_id: string; user_id: string; confirmed: boolean }>(
    `/groups/${groupId}/decline`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) }
  );
}

export function createGroup(payload: any) {
  return apiFetchStrict<Group>(
    "/groups",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function deleteGroup(groupId: string, userId: string) {
  return apiFetchStrict<{ message: string }>(
    `/groups/${groupId}`,
    { method: "DELETE", body: JSON.stringify({ user_id: userId }) }
  );
}

export function addGroupMembers(groupId: string, userIds: string[], addedBy: string) {
  return apiFetchStrict<any[]>(
    `/groups/${groupId}/members`,
    { method: "POST", body: JSON.stringify({ user_ids: userIds, added_by: addedBy }) }
  );
}

export function searchUsers(query: string, sportId?: string, city?: string, excludeGroupId?: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (sportId) params.set("sport_id", sportId);
  if (city) params.set("city", city);
  if (excludeGroupId) params.set("exclude_group_id", excludeGroupId);
  return apiFetchStrict<AvailableUser[]>(`/users/search?${params.toString()}`);
}

export function getMatchStatus(userId: string, day?: string) {
  const query = day ? `?day=${day}` : "";
  return apiFetchStrict<{
    availability: { user_id: string; date: string; is_available: boolean | null } | null;
    group: Group | null;
    confirmed: boolean | null;
  }>(`/matches/status/${userId}${query}`);
}

export function getMessages(groupId = "demo-running-group") {
  return apiFetch<Message[]>(`/demo/messages/${groupId}`, undefined, messages);
}

export function getGroupMessages(groupId: string) {
  return apiFetchStrict<Message[]>(`/groups/${groupId}/messages`);
}

export function sendGroupMessage(groupId: string, senderId: string, content: string) {
  return apiFetchStrict<Message>(
    `/groups/${groupId}/messages`,
    { method: "POST", body: JSON.stringify({ sender_id: senderId, content }) }
  );
}

export function getEventMessages(eventId: string) {
  return apiFetchStrict<Message[]>(`/events/${eventId}/messages`);
}

export function sendEventMessage(eventId: string, senderId: string, content: string) {
  return apiFetchStrict<Message>(
    `/events/${eventId}/messages`,
    { method: "POST", body: JSON.stringify({ sender_id: senderId, content }) }
  );
}

export function createDirectConversation(currentUserId: string, otherUserId: string) {
  return apiFetchStrict<DirectConversation>(
    "/direct/conversations",
    { method: "POST", body: JSON.stringify({ current_user_id: currentUserId, other_user_id: otherUserId }) }
  );
}

export function getDirectConversations(userId: string) {
  return apiFetchStrict<DirectConversation[]>(`/direct/conversations/${userId}`);
}

export function getDirectMessages(conversationId: string, userId: string) {
  const params = new URLSearchParams({ user_id: userId });
  return apiFetchStrict<DirectMessage[]>(`/direct/conversations/${conversationId}/messages?${params.toString()}`);
}

export function sendDirectMessage(conversationId: string, senderId: string, content: string) {
  return apiFetchStrict<DirectMessage>(
    `/direct/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify({ sender_id: senderId, content }) }
  );
}

export function markDirectMessagesRead(conversationId: string, userId: string) {
  return apiFetchStrict<{ success: boolean; updated: number }>(
    `/direct/conversations/${conversationId}/read`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) }
  );
}

export function getNotifications(userId: string) {
  return apiFetchStrict<NotificationItem[]>(`/notifications/${userId}`);
}

export function markNotificationRead(notificationId: string) {
  return apiFetchStrict<NotificationItem>(
    `/notifications/${notificationId}/read`,
    { method: "POST" }
  );
}

export function markAllNotificationsRead(userId: string) {
  return apiFetchStrict<{ updated: number }>(
    `/notifications/${userId}/read-all`,
    { method: "POST" }
  );
}

export function extractInterests(description: string) {
  return apiFetchStrict<ExtractInterestsResult>(
    "/ai/extract-interests",
    { method: "POST", body: JSON.stringify({ description }) }
  );
}

export function extractPhotoInterests(imageUrl: string) {
  return apiFetchStrict<ExtractPhotoInterestsResult>(
    "/ai/extract-photo-interests",
    { method: "POST", body: JSON.stringify({ image_url: imageUrl }) }
  );
}

export function getCompatibilityScore(userA: Record<string, unknown>, userB: Record<string, unknown>) {
  return apiFetchStrict<CompatibilityResult>(
    "/ai/compatibility-score",
    { method: "POST", body: JSON.stringify({ user_a: userA, user_b: userB }) }
  );
}

export function getAvailableUsers(date: string, city?: string) {
  const params = new URLSearchParams({ date });
  if (city) params.set("city", city);
  return apiFetchStrict<AvailableUser[]>(`/users/available?${params.toString()}`);
}

export function getTeammateRecommendations(
  currentUser: Record<string, unknown>,
  candidates: Array<Record<string, unknown>>
) {
  return apiFetchStrict<{ recommendations: TeammateRecommendation[]; provider?: string }>(
    "/ai/teammate-recommendations",
    { method: "POST", body: JSON.stringify({ current_user: currentUser, candidates }) }
  );
}

export function getWeatherRecommendation(city: string, sport: string, date: string) {
  const params = new URLSearchParams({ city, sport, date });
  return apiFetchStrict<WeatherRecommendation>(`/weather/recommendation?${params.toString()}`);
}

export function balanceTeams(payload: { sport: string; players: TeamBalancePlayer[]; teams_count: number }) {
  return apiFetchStrict<TeamBalanceResult>(
    "/teams/balance",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function getAchievements(userId: string) {
  return apiFetchStrict<AchievementsResponse>(`/achievements/${userId}`);
}

export function checkAchievements(userId: string) {
  return apiFetchStrict<AchievementsCheckResponse>(`/achievements/check/${userId}`, { method: "POST" });
}

export function createEventInvite(
  eventId: string,
  payload: { invited_email?: string; invited_user_id?: string; invited_by?: string }
) {
  return apiFetchStrict<InviteCreateResponse>(
    `/events/${eventId}/invites`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function getInvite(token: string) {
  return apiFetchStrict<InviteDetails>(`/invites/${token}`);
}

export function acceptInvite(token: string, userId: string) {
  return apiFetchStrict<{ invite: InviteDetails }>(
    `/invites/${token}/accept`,
    { method: "POST", body: JSON.stringify({ user_id: userId }) }
  );
}

export function getFitnessIntegrations(userId: string) {
  return apiFetchStrict<FitnessIntegrationsResponse>(`/fitness/${userId}`);
}

export function connectFitnessDemo(userId: string, provider: string) {
  return apiFetchStrict<FitnessIntegration>(
    `/fitness/${userId}/connect-demo`,
    { method: "POST", body: JSON.stringify({ provider }) }
  );
}

export function disconnectFitnessDemo(userId: string, provider: string) {
  return apiFetchStrict<FitnessIntegration>(
    `/fitness/${userId}/disconnect-demo`,
    { method: "POST", body: JSON.stringify({ provider }) }
  );
}


export function updateEventParticipation(eventId: string, userId: string, status: "attending" | "maybe" | "declined") {
  return apiFetchStrict<any>(
    `/events/${eventId}/participate`,
    { method: "POST", body: JSON.stringify({ user_id: userId, status }) }
  );
}

export function getEventParticipants(eventId: string) {
  return apiFetchStrict<any[]>(`/events/${eventId}/participants`);
}

export function getLocalAIHealth() {
  return apiFetchStrict<{
    provider: string;
    available: boolean;
    model?: string;
    error?: string;
  }>("/ai/local/health");
}

export function explainMatch(groupId: string) {
  return apiFetchStrict<{
    title: string;
    reasons: string[];
    summary: string;
    source: string;
  }>(
    "/ai/explain-match",
    { method: "POST", body: JSON.stringify({ group_id: groupId }) }
  );
}

export function generateCaptainPlan(groupId: string, eventId: string) {
  return apiFetchStrict<{
    plan: string[];
    message: string;
    source: string;
  }>(
    "/ai/captain-plan",
    { method: "POST", body: JSON.stringify({ group_id: groupId, event_id: eventId }) }
  );
}
