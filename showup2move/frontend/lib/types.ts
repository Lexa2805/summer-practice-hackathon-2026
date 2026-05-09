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
  name?: string | null;
  description?: string | null;
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

export type ExtractInterestsResult = {
  sports: string[];
  interests: string[];
  skill_level: SkillLevel;
  summary: string;
  provider?: string;
};

export type ExtractPhotoInterestsResult = {
  detected_sports: string[];
  detected_interests: string[];
  confidence: number;
  summary: string;
  provider?: string;
};

export type CompatibilityResult = {
  score: number;
  reason: string;
  shared_sports: string[];
  recommendation: string;
  provider?: string;
};

export type AvailableUser = Profile & {
  sports?: string[];
  skill_level?: SkillLevel;
  availability?: string;
};

export type TeammateRecommendation = {
  user_id: string;
  full_name: string;
  score: number;
  reason: string;
  shared_sports?: string[];
};

export type DirectUser = Pick<Profile, "id" | "full_name" | "username" | "avatar_url" | "city">;

export type DirectConversation = {
  id: string;
  user_one_id?: string;
  user_two_id?: string;
  created_at?: string;
  updated_at?: string;
  other_user: DirectUser;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  content: string;
  read?: boolean;
  created_at: string;
};

export type EventItem = {
  id: string;
  title: string;
  created_by: string;
  sport_id?: string | null;
  sport_name?: string;
  group_id?: string | null;
  group_captain_id?: string | null;
  location_name?: string;
  event_time?: string | null;
  price_estimate?: number | null;
  calendar_exported?: boolean | null;
  weather_summary?: string | null;
  weather_score?: number | null;
  created_at?: string;
  participants?: EventParticipant[];
  participant_count?: number;
};

export type EventParticipant = {
  event_id: string;
  user_id: string;
  status: "attending" | "maybe" | "declined";
  created_at?: string;
};

export type Message = {
  id: string;
  group_id?: string | null;
  event_id?: string | null;
  sender_id?: string;
  sender_name?: string;
  sender?: Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;
  content: string;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  related_group_id?: string | null;
  related_event_id?: string | null;
  related_direct_conversation_id?: string | null;
  created_at: string;
};

export type WeatherRecommendation = {
  city: string;
  sport: string;
  recommendation: string;
  score: number;
  summary: string;
};

export type TeamBalancePlayer = {
  user_id: string;
  full_name: string;
  skill_level: SkillLevel;
};

export type BalancedTeam = {
  name: string;
  players: TeamBalancePlayer[];
  average_skill: number;
};

export type TeamBalanceResult = {
  teams: BalancedTeam[];
};

export type Achievement = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  points?: number | null;
  created_at?: string;
  unlocked?: boolean;
  unlocked_at?: string | null;
};

export type AchievementsResponse = {
  user_id: string;
  total_points: number;
  achievements: Achievement[];
};

export type AchievementsCheckResponse = {
  user_id: string;
  total_points: number;
  unlocked_now: Achievement[];
};

export type InviteDetails = {
  invite_id: string;
  event_id: string;
  status: string;
  invited_email?: string | null;
  invited_user_id?: string | null;
  invited_by?: string | null;
  event?: {
    title?: string | null;
    location_name?: string | null;
    event_time?: string | null;
  };
};

export type InviteCreateResponse = {
  invite: {
    id?: string;
    event_id: string;
    invited_by: string;
    invited_email?: string | null;
    invited_user_id?: string | null;
    invite_token: string;
    status: string;
  };
  invite_link: string;
};

export type FitnessIntegration = {
  id: string;
  user_id: string;
  provider: string;
  connected: boolean;
  weekly_steps: number;
  weekly_active_minutes: number;
  last_sync_at?: string | null;
  created_at?: string;
};

export type FitnessIntegrationsResponse = {
  user_id: string;
  integrations: FitnessIntegration[];
};
