-- QA Dashboard Schema for Supabase
-- Run this against your Supabase project via the SQL editor

-- Users/profiles (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  email text,
  full_name text,
  role text check (role in ('admin', 'tester')) default 'tester',
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  url text,
  github_url text,
  platform text check (platform in ('web', 'ios', 'both')) default 'web',
  status text check (status in ('active', 'in-dev', 'maintenance')) default 'active',
  description text,
  language text,
  last_tested timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bugs
create table if not exists bugs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  severity text check (severity in ('critical', 'high', 'medium', 'low')) default 'medium',
  status text check (status in ('open', 'in-progress', 'resolved', 'wont-fix')) default 'open',
  steps_to_reproduce text,
  assigned_to uuid references profiles(id),
  reported_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Test cases
create table if not exists test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  category text check (category in ('auth', 'payments', 'ui', 'api', 'performance', 'security', 'other')) default 'other',
  description text,
  expected_result text,
  status text check (status in ('pass', 'fail', 'skip', 'untested')) default 'untested',
  last_run timestamptz,
  run_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Checklist items
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  label text not null,
  checked boolean default false,
  category text default 'general',
  checked_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Activity log
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null,
  details text,
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table projects enable row level security;
alter table bugs enable row level security;
alter table test_cases enable row level security;
alter table checklist_items enable row level security;
alter table activity_log enable row level security;

-- RLS policies: authenticated users can read/write everything (internal tool)
create policy "Authenticated users can view all profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Authenticated users full access to projects" on projects for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access to bugs" on bugs for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access to test_cases" on test_cases for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access to checklist_items" on checklist_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access to activity_log" on activity_log for all using (auth.role() = 'authenticated');

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'tester');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
