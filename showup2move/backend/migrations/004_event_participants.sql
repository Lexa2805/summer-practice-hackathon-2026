-- Event participants tracking for calendar color-coding.
-- Safe to run multiple times.

create table if not exists event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  status text default 'attending' check (status in ('attending', 'maybe', 'declined')),
  created_at timestamp with time zone default now(),
  unique(event_id, user_id)
);

-- RLS policies for event participants.
alter table event_participants enable row level security;

drop policy if exists "Users can read event participants" on event_participants;
create policy "Users can read event participants"
on event_participants
for select
to authenticated
using (true);

drop policy if exists "Users can manage their own participation" on event_participants;
create policy "Users can manage their own participation"
on event_participants
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Automatically add event creator as participant.
create or replace function add_creator_as_participant()
returns trigger as $$
begin
  insert into event_participants (event_id, user_id, status)
  values (new.id, new.created_by, 'attending')
  on conflict (event_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists event_creator_participant on events;
create trigger event_creator_participant
after insert on events
for each row
execute function add_creator_as_participant();
