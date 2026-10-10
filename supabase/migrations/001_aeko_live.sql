-- Aeko live demo — schema (Part A)
-- Paste-runnable in the Supabase SQL editor as-is.

create table if not exists users (
  id text primary key, email text unique not null, password text not null,
  role text not null check (role in ('BRAND','SUPPLIER','ADMIN')),
  name text, company text, supplier_id text, created_at timestamptz default now());
create table if not exists sessions (token text primary key, user_id text references users(id) on delete cascade, created_at timestamptz default now());
create table if not exists suppliers (
  id text primary key, name text not null, location text, email text, category text,
  capabilities jsonb default '[]', equipment jsonb default '[]', certifications jsonb default '[]',
  moq integer, capacity_per_month integer, languages jsonb default '["en"]',
  is_live_demo boolean default false, talking_points text);
create table if not exists project_requests (
  id text primary key, brand_user_id text references users(id), raw_query text, input_mode text,
  language text, category text, product text, volume integer, moq integer,
  specialty jsonb default '{}', search_terms jsonb default '[]', deadline text,
  status text default 'NEW' check (status in ('NEW','MATCHING','CALLING','INTRO_BOOKED','NO_MATCH')),
  created_at timestamptz default now());
create table if not exists matches (
  id text primary key, request_id text references project_requests(id) on delete cascade,
  supplier_id text references suppliers(id), score integer, reasons jsonb default '[]', rank integer);
create table if not exists calls (
  id text primary key, request_id text references project_requests(id) on delete cascade,
  supplier_id text references suppliers(id),
  status text default 'RINGING' check (status in ('RINGING','CONNECTED','ENDED','MISSED')),
  outcome text check (outcome in ('YES','NO','MAYBE')), outcome_reason text, language text,
  intro_slot text, started_at timestamptz, ended_at timestamptz, created_at timestamptz default now());
create table if not exists call_events (
  id bigserial primary key, call_id text references calls(id) on delete cascade,
  kind text, speaker text, text text, data jsonb, created_at timestamptz default now());

-- Realtime: the browser (anon key) may READ these demo tables; all writes go through the API (service role).
alter table calls enable row level security;
alter table project_requests enable row level security;
alter table matches enable row level security;
alter table call_events enable row level security;
create policy "demo read calls" on calls for select using (true);
create policy "demo read requests" on project_requests for select using (true);
create policy "demo read matches" on matches for select using (true);
create policy "demo read events" on call_events for select using (true);
alter table users enable row level security;      -- no anon policies: never readable from the browser
alter table sessions enable row level security;
alter table suppliers enable row level security;
create policy "demo read suppliers" on suppliers for select using (true);
alter publication supabase_realtime add table calls, project_requests, call_events;
