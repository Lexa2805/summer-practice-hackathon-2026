-- Bonus features migration: achievements, invites, weather, calendar, fitness demo.
-- Safe to run multiple times where Postgres allows it.

-- 1) Achievements and user unlocks.
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text,
  points int default 0,
  created_at timestamp with time zone default now()
);

create table if not exists user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  achievement_id uuid references achievements(id) on delete cascade,
  unlocked_at timestamp with time zone default now(),
  unique(user_id, achievement_id)
);

-- Seed baseline achievements for MVP.
insert into achievements (code, title, description, points)
values
  ('first_showup', 'First ShowUp', 'Marked availability for the first time.', 50),
  ('first_match', 'First Match', 'Joined your first matched group.', 80),
  ('first_event', 'First Event', 'Created your first event.', 80),
  ('social_player', 'Social Player', 'Sent your first group or event message.', 60),
  ('consistent_mover', 'Consistent Mover', 'Marked availability 3 times.', 120)
on conflict (code) do nothing;

-- 2) Event invites for social sharing.
create table if not exists event_invites (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  invited_by uuid references profiles(id) on delete cascade,
  invited_email text,
  invited_user_id uuid references profiles(id) on delete set null,
  invite_token text unique not null,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- 3) Fitness integrations demo table.
create table if not exists fitness_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider text not null,
  connected boolean default false,
  weekly_steps int default 0,
  weekly_active_minutes int default 0,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 4) Optional event fields for calendar/weather MVP.
alter table events
add column if not exists calendar_exported boolean default false,
add column if not exists weather_summary text,
add column if not exists weather_score int default 0;

-- 5) RLS policies for bonus tables.
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table event_invites enable row level security;
alter table fitness_integrations enable row level security;

drop policy if exists "Anyone can read achievements" on achievements;
create policy "Anyone can read achievements"
on achievements
for select
to authenticated
using (true);

drop policy if exists "Users can read their own achievements" on user_achievements;
create policy "Users can read their own achievements"
on user_achievements
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own achievements" on user_achievements;
create policy "Users can insert their own achievements"
on user_achievements
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read their invites" on event_invites;
create policy "Users can read their invites"
on event_invites
for select
to authenticated
using (auth.uid() = invited_user_id or auth.uid() = invited_by);

drop policy if exists "Users can create invites" on event_invites;
create policy "Users can create invites"
on event_invites
for insert
to authenticated
with check (auth.uid() = invited_by);

drop policy if exists "Users can read their fitness integrations" on fitness_integrations;
create policy "Users can read their fitness integrations"
on fitness_integrations
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their fitness integrations" on fitness_integrations;
create policy "Users can update their fitness integrations"
on fitness_integrations
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
