-- Migration 002: Per-project access control, enhanced bug fields, bot-ready API support
-- Run this against your Supabase project via the SQL editor

-- ============ Project Access Table ============
create table if not exists project_access (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  granted_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

alter table project_access enable row level security;

create policy "auth_all_project_access" on project_access for all using (auth.role() = 'authenticated');

-- ============ Profiles insert policy (for trigger) ============
create policy "Service can insert profiles" on profiles for insert with check (true);

-- ============ Enhanced Bug Fields ============
alter table bugs add column if not exists type text check (type in ('bug', 'feature', 'ui', 'performance', 'security', 'other')) default 'bug';
alter table bugs add column if not exists expected_behavior text;
alter table bugs add column if not exists actual_behavior text;
alter table bugs add column if not exists device_browser text;
alter table bugs add column if not exists screenshot_url text;
alter table bugs add column if not exists page_screen text;
alter table bugs add column if not exists resolution_note text;
