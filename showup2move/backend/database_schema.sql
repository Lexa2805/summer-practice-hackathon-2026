create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  description text,
  avatar_url text,
  city text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default now()
);

create table sports (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  min_players int not null,
  max_players int not null
);

create table user_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  sport_id uuid references sports(id) on delete cascade,
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  unique(user_id, sport_id)
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  is_available boolean not null,
  preferred_time text,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references sports(id),
  captain_id uuid references profiles(id),
  status text default 'pending',
  match_date date,
  city text,
  average_skill text,
  match_score int default 0,
  created_at timestamp with time zone default now()
);

-- Safe migration for existing Supabase projects created before Smart Matching metadata.
alter table groups
add column if not exists match_date date,
add column if not exists city text,
add column if not exists average_skill text,
add column if not exists match_score int default 0;

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  confirmed boolean default false,
  unique(group_id, user_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete set null,
  created_by uuid references profiles(id),
  sport_id uuid references sports(id),
  title text not null,
  location_name text,
  latitude double precision,
  longitude double precision,
  event_time timestamp with time zone,
  price_estimate numeric,
  created_at timestamp with time zone default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

insert into sports (name, min_players, max_players)
values
('Football', 10, 14),
('Tennis', 2, 4),
('Basketball', 6, 10),
('Running', 2, 20),
('Volleyball', 8, 12);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar images are publicly readable'
  ) then
    create policy "Avatar images are publicly readable"
    on storage.objects for select
    using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their own avatar images'
  ) then
    create policy "Users can upload their own avatar images"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their own avatar images'
  ) then
    create policy "Users can update their own avatar images"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their own avatar images'
  ) then
    create policy "Users can delete their own avatar images"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
