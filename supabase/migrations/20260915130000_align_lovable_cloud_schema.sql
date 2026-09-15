-- Paste this into Lovable Cloud → SQL editor (or the linked Supabase SQL editor).
-- Files in this folder do not apply themselves. Run this once against Cloud.
-- Safe to re-run. Designed for the old Sept 14 tables plus the current app schema.

-- ---------------------------------------------------------------------------
-- New tables the login screen and settings need
-- ---------------------------------------------------------------------------

create table if not exists public.it_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'staff', 'management')),
  active boolean not null default true,
  password_hash text not null,
  created_at timestamptz not null default now(),
  must_change_password boolean not null default false,
  session_version int not null default 1
);

alter table public.it_profiles add column if not exists must_change_password boolean not null default false;
alter table public.it_profiles add column if not exists session_version int not null default 1;

create table if not exists public.it_settings (
  id int primary key default 1 check (id = 1),
  department_name text not null default 'Information Technology Department',
  contact_email text not null default '',
  contact_extension text not null default '',
  signatory_name text not null default ''
);

create table if not exists public.request_ticket_counters (
  year int primary key,
  last_number int not null default 0
);

create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catalog tables from the first Lovable migration
-- ---------------------------------------------------------------------------

alter table public.departments add column if not exists sort_order int not null default 0;
alter table public.modules add column if not exists sort_order int not null default 0;

insert into public.departments (name, sort_order) values
  ('HR', 0),
  ('Supply Chain & Logistics', 1),
  ('Finance', 2),
  ('IT', 3)
on conflict (name) do nothing;

insert into public.modules (name, sort_order) values
  ('Odoo Development', 0),
  ('Solarista Compass', 1),
  ('Hardware/Network', 2),
  ('IT Consulting', 3),
  ('Maintenance/Operations', 4),
  ('Other', 5)
on conflict (name) do nothing;

insert into public.it_settings (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- requests: add current columns, copy from old names, then drop blockers
-- ---------------------------------------------------------------------------

alter table public.requests add column if not exists ticket text;
alter table public.requests add column if not exists note text not null default '';
alter table public.requests add column if not exists module text;
alter table public.requests add column if not exists urgency text;
alter table public.requests add column if not exists assigned_to uuid references public.it_profiles (id) on delete set null;
alter table public.requests add column if not exists accepted_at timestamptz;
alter table public.requests add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'ticket_number'
  ) then
    update public.requests set ticket = ticket_number where ticket is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'description'
  ) then
    update public.requests set note = description where note = '' and description is not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'affected_module'
  ) then
    update public.requests set module = affected_module where module is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'requester_urgency'
  ) then
    update public.requests
    set urgency = initcap(requester_urgency)
    where urgency is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'submitted_at'
  ) then
    update public.requests set created_at = submitted_at where created_at is null;
  end if;
end $$;

update public.requests set created_at = coalesce(created_at, updated_at, now()) where created_at is null;
update public.requests set module = coalesce(module, 'Other') where module is null;
update public.requests set urgency = coalesce(urgency, 'Medium') where urgency is null;
update public.requests set it_priority = coalesce(it_priority, 'Medium');
update public.requests
set ticket = 'R-' || lpad(coalesce((regexp_match(coalesce(ticket, ''), '([0-9]+)$'))[1], '0'), 4, '0')
where ticket is null or ticket = '';

alter table public.requests alter column ticket set not null;
alter table public.requests alter column module set not null;
alter table public.requests alter column urgency set not null;
alter table public.requests alter column created_at set not null;
alter table public.requests alter column created_at set default now();

create unique index if not exists requests_ticket_uidx on public.requests (ticket);

alter table public.requests drop column if exists ticket_number;
alter table public.requests drop column if exists description;
alter table public.requests drop column if exists affected_module;
alter table public.requests drop column if exists requester_urgency;
alter table public.requests drop column if exists attachments;
alter table public.requests drop column if exists submitted_at;
alter table public.requests drop column if exists reviewed_at;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

alter table public.request_comments add column if not exists body text;
alter table public.request_comments add column if not exists author_email text not null default '';
alter table public.request_comments add column if not exists author_profile_id uuid references public.it_profiles (id) on delete set null;
alter table public.request_comments add column if not exists is_internal boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_comments' and column_name = 'comment'
  ) then
    update public.request_comments set body = comment where body is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_comments' and column_name = 'is_it'
  ) then
    update public.request_comments set is_internal = is_it;
  end if;
end $$;

update public.request_comments set body = coalesce(body, '') where body is null;
alter table public.request_comments alter column body set not null;

alter table public.request_comments drop column if exists comment;
alter table public.request_comments drop column if exists is_it;

-- ---------------------------------------------------------------------------
-- status history
-- ---------------------------------------------------------------------------

alter table public.request_status_history add column if not exists from_status text;
alter table public.request_status_history add column if not exists to_status text;
alter table public.request_status_history add column if not exists actor_name text;
alter table public.request_status_history add column if not exists actor_email text not null default '';
alter table public.request_status_history add column if not exists reason text;
alter table public.request_status_history add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_status_history' and column_name = 'old_status'
  ) then
    update public.request_status_history set from_status = old_status where from_status is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_status_history' and column_name = 'new_status'
  ) then
    update public.request_status_history set to_status = new_status where to_status is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_status_history' and column_name = 'changed_by'
  ) then
    update public.request_status_history set actor_name = changed_by where actor_name is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_status_history' and column_name = 'note'
  ) then
    update public.request_status_history set reason = note where reason is null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_status_history' and column_name = 'changed_at'
  ) then
    update public.request_status_history set created_at = changed_at where created_at is null;
  end if;
end $$;

update public.request_status_history set to_status = coalesce(to_status, 'Submitted') where to_status is null;
update public.request_status_history set actor_name = coalesce(actor_name, 'IT Team') where actor_name is null;
update public.request_status_history set created_at = coalesce(created_at, now()) where created_at is null;

alter table public.request_status_history alter column to_status set not null;
alter table public.request_status_history alter column actor_name set not null;
alter table public.request_status_history alter column created_at set not null;
alter table public.request_status_history alter column created_at set default now();

alter table public.request_status_history drop column if exists old_status;
alter table public.request_status_history drop column if exists new_status;
alter table public.request_status_history drop column if exists changed_by;
alter table public.request_status_history drop column if exists note;
alter table public.request_status_history drop column if exists changed_at;

-- ---------------------------------------------------------------------------
-- Ticket helper used by the current app: R-0001
-- ---------------------------------------------------------------------------

create or replace function public.next_request_ticket()
returns text
language plpgsql
security definer
as $$
declare
  n int;
begin
  insert into public.request_ticket_counters (year, last_number)
  values (0, 1)
  on conflict (year) do update
    set last_number = public.request_ticket_counters.last_number + 1
  returning last_number into n;
  return 'R-' || lpad(n::text, 4, '0');
end;
$$;

insert into public.request_ticket_counters (year, last_number)
select 0, coalesce(max(v), 0)
from (
  select last_number as v from public.request_ticket_counters
  union all
  select coalesce((regexp_match(ticket, '([0-9]+)$'))[1]::int, 0)
  from public.requests
) s
on conflict (year) do update
set last_number = greatest(public.request_ticket_counters.last_number, excluded.last_number);

-- ---------------------------------------------------------------------------
-- Privileges (RLS on, no anon access; server uses service_role)
-- ---------------------------------------------------------------------------

alter table public.departments enable row level security;
alter table public.modules enable row level security;
alter table public.it_profiles enable row level security;
alter table public.it_settings enable row level security;
alter table public.request_ticket_counters enable row level security;
alter table public.requests enable row level security;
alter table public.request_comments enable row level security;
alter table public.request_status_history enable row level security;
alter table public.request_attachments enable row level security;

revoke all on table public.departments from anon, authenticated;
revoke all on table public.modules from anon, authenticated;
revoke all on table public.it_profiles from anon, authenticated;
revoke all on table public.it_settings from anon, authenticated;
revoke all on table public.request_ticket_counters from anon, authenticated;
revoke all on table public.requests from anon, authenticated;
revoke all on table public.request_comments from anon, authenticated;
revoke all on table public.request_status_history from anon, authenticated;
revoke all on table public.request_attachments from anon, authenticated;

grant all on table public.departments to service_role;
grant all on table public.modules to service_role;
grant all on table public.it_profiles to service_role;
grant all on table public.it_settings to service_role;
grant all on table public.request_ticket_counters to service_role;
grant all on table public.requests to service_role;
grant all on table public.request_comments to service_role;
grant all on table public.request_status_history to service_role;
grant all on table public.request_attachments to service_role;

revoke all on function public.next_request_ticket() from public, anon, authenticated;
grant execute on function public.next_request_ticket() to service_role;

insert into storage.buckets (id, name, public)
values ('request-attachments', 'request-attachments', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
