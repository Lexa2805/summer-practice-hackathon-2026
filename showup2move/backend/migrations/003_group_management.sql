-- Add new fields to groups table for manual group creation
alter table groups
add column if not exists name text,
add column if not exists description text,
add column if not exists city text;
