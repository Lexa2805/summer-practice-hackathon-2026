import { demoUserId, events, groups, messages, profile, sports } from "@/lib/mock-data";
import type {
  EventItem,
  Group,
  MatchRunPayload,
  MatchRunResult,
  Message,
  Profile,
  Sport,
  UserSportPreference
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

export function getEvents() {
  return apiFetchStrict<EventItem[]>("/events");
}

export function getEventsWithFallback() {
  return apiFetch<EventItem[]>("/events", undefined, events);
}

export function createEvent(payload: Omit<EventItem, "id">) {
  return apiFetchStrict<EventItem>(
    "/events",
    { method: "POST", body: JSON.stringify(payload) },
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

export function extractInterests(description: string) {
  return apiFetch(
    "/ai/extract-interests",
    { method: "POST", body: JSON.stringify({ description }) },
    { sports: ["Running", "Tennis"], traits: ["social"], provider: "local-fallback" }
  );
}
