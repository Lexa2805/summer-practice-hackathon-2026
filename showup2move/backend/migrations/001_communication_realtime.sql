-- Communication realtime migration for existing ShowUp2Move Supabase projects.
-- Safe to run multiple times where Postgres allows it.

-- Event-specific chat support. Group chat keeps using messages.group_id.
alter table messages
add column if not exists event_id uuid references events(id) on delete cascade;

-- Database notifications for matches, messages, event creation/deletion, and reminders.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  related_group_id uuid references groups(id) on delete cascade,
  related_event_id uuid references events(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- Notifications are read/updated by the owning authenticated user.
alter table notifications enable row level security;

drop policy if exists "Users can read their own notifications" on notifications;
create policy "Users can read their own notifications"
on notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on notifications;
create policy "Users can update their own notifications"
on notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can insert their own notifications" on notifications;
create policy "Users can insert their own notifications"
on notifications
for insert
to authenticated
with check (auth.uid() = user_id);

-- Basic chat RLS for frontend realtime visibility and authenticated inserts.
alter table messages enable row level security;

drop policy if exists "Authenticated users can read messages" on messages;
create policy "Authenticated users can read messages"
on messages
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can send messages" on messages;
create policy "Authenticated users can send messages"
on messages
for insert
to authenticated
with check (auth.uid() = sender_id);

-- Add realtime publications only when missing. Supabase may already include them.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table events;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_members'
  ) then
    alter publication supabase_realtime add table group_members;
  end if;
end $$;
