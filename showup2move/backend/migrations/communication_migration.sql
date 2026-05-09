-- Safe migration for Communication features on an existing ShowUp2Move Supabase project.
-- Run this in Supabase SQL Editor. It is intentionally standalone, so it will not stop
-- on older "create table profiles" statements that already exist.

alter table messages
add column if not exists event_id uuid references events(id) on delete cascade;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Authenticated users can read messages'
  ) then
    create policy "Authenticated users can read messages"
    on messages for select
    to authenticated
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Authenticated users can send messages'
  ) then
    create policy "Authenticated users can send messages"
    on messages for insert
    to authenticated
    with check (auth.uid() = sender_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can read their own notifications'
  ) then
    create policy "Users can read their own notifications"
    on notifications for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'Users can update their own notifications'
  ) then
    create policy "Users can update their own notifications"
    on notifications for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table group_members;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
