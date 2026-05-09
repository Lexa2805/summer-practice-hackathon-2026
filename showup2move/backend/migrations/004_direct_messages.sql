-- Direct messages / private 1-to-1 chat for ShowUp2Move.
-- Safe to run multiple times.

create table if not exists direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid references profiles(id) on delete cascade,
  user_two_id uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references direct_conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'direct_conversations_different_users'
      and conrelid = 'direct_conversations'::regclass
  ) then
    alter table direct_conversations
    add constraint direct_conversations_different_users
    check (user_one_id <> user_two_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'direct_conversations_sorted_users'
      and conrelid = 'direct_conversations'::regclass
  ) then
    alter table direct_conversations
    add constraint direct_conversations_sorted_users
    check (user_one_id < user_two_id);
  end if;
end $$;

create unique index if not exists direct_conversations_user_pair_idx
on direct_conversations (user_one_id, user_two_id);

create index if not exists direct_conversations_user_one_idx
on direct_conversations (user_one_id);

create index if not exists direct_conversations_user_two_idx
on direct_conversations (user_two_id);

create index if not exists direct_messages_conversation_created_idx
on direct_messages (conversation_id, created_at);

create index if not exists direct_messages_unread_idx
on direct_messages (conversation_id, read, sender_id);

alter table direct_conversations enable row level security;
alter table direct_messages enable row level security;

drop policy if exists "Users can read their direct conversations" on direct_conversations;
create policy "Users can read their direct conversations"
on direct_conversations
for select
to authenticated
using (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Users can create their direct conversations" on direct_conversations;
create policy "Users can create their direct conversations"
on direct_conversations
for insert
to authenticated
with check (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Users can update their direct conversations" on direct_conversations;
create policy "Users can update their direct conversations"
on direct_conversations
for update
to authenticated
using (auth.uid() = user_one_id or auth.uid() = user_two_id)
with check (auth.uid() = user_one_id or auth.uid() = user_two_id);

drop policy if exists "Users can read direct messages in their conversations" on direct_messages;
create policy "Users can read direct messages in their conversations"
on direct_messages
for select
to authenticated
using (
  exists (
    select 1
    from direct_conversations
    where direct_conversations.id = direct_messages.conversation_id
      and (auth.uid() = direct_conversations.user_one_id or auth.uid() = direct_conversations.user_two_id)
  )
);

drop policy if exists "Users can insert direct messages in their conversations" on direct_messages;
create policy "Users can insert direct messages in their conversations"
on direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from direct_conversations
    where direct_conversations.id = direct_messages.conversation_id
      and (auth.uid() = direct_conversations.user_one_id or auth.uid() = direct_conversations.user_two_id)
  )
);

drop policy if exists "Users can update direct messages in their conversations" on direct_messages;
create policy "Users can update direct messages in their conversations"
on direct_messages
for update
to authenticated
using (
  exists (
    select 1
    from direct_conversations
    where direct_conversations.id = direct_messages.conversation_id
      and (auth.uid() = direct_conversations.user_one_id or auth.uid() = direct_conversations.user_two_id)
  )
)
with check (
  exists (
    select 1
    from direct_conversations
    where direct_conversations.id = direct_messages.conversation_id
      and (auth.uid() = direct_conversations.user_one_id or auth.uid() = direct_conversations.user_two_id)
  )
);

alter table if exists notifications
add column if not exists related_direct_conversation_id uuid references direct_conversations(id) on delete cascade;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table direct_messages;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_conversations'
  ) then
    alter publication supabase_realtime add table direct_conversations;
  end if;
end $$;
