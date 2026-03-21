-- Migration 003: Bot workflow columns and verified status
-- Run this against your Supabase database

-- Add bot workflow columns to bugs table
alter table bugs add column if not exists claimed_by text;
alter table bugs add column if not exists branch_name text;
alter table bugs add column if not exists claimed_at timestamptz;
alter table bugs add column if not exists resolved_at timestamptz;

-- Update status check constraint to include 'verified'
alter table bugs drop constraint if exists bugs_status_check;
alter table bugs add constraint bugs_status_check check (status in ('open', 'in-progress', 'resolved', 'verified', 'wont-fix'));
