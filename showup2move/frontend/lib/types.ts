export type Sport = {
  id: string;
  name: string;
  min_players: number;
  max_players: number;
};

export type Profile = {
  id: string;
  full_name: string;
  username: string;
  description: string;
  avatar_url?: string | null;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  sports?: string[];
  sports_preferences?: UserSportPreference[];
};

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export type UserSportPreference = {
  sport_id: string;
  sport_name?: string;
  skill_level: SkillLevel;
};

export type GroupMember = Profile & {
  skill_level?: SkillLevel;
  confirmed?: boolean;
};

export type Group = {
  id: string;
  sport_id?: string;
  sport_name?: string;
  captain_id?: string;
  captain_name?: string;
  captain?: Profile | null;
  status: string;
  member_count?: number;
  members?: GroupMember[];
  current_user_confirmed?: boolean;
  match_date?: string | null;
  city?: string | null;
  average_skill?: SkillLevel | string | null;
  match_score?: number;
  explanations?: string[];
  created_at?: string;
};

export type MatchRunPayload = {
  date: string;
  city?: string;
  sport_id?: string;
  max_distance_km?: number;
};

export type MatchRunResult = {
  source: string;
  created_groups: number;
  groups: Group[];
  skipped?: Array<{ sport?: string; available_users?: number; needed?: number }>;
  message: string;
};

export type EventItem = {
  id: string;
  title: string;
  created_by: string;
  sport_id?: string | null;
  sport_name?: string;
  group_id?: string | null;
  location_name?: string;
  event_time?: string | null;
  price_estimate?: number | null;
};

export type Message = {
  id: string;
  group_id: string;
  sender_name: string;
  content: string;
  created_at: string;
};
