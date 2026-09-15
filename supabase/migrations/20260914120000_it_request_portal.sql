-- IT Request Portal schema.
-- RLS is on with no anon/authenticated policies. Server functions use the service role.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists public.it_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin', 'staff', 'management')),
  active boolean not null default true,
  password_hash text not null,
  created_at timestamptz not null default now()
);

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

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  ticket text not null unique,
  type text not null,
  title text not null,
  description text not null default '',
  module text not null,
  requester_name text not null,
  requester_email text not null,
  department text not null,
  urgency text not null,
  it_priority text not null default 'Medium',
  status text not null default 'Submitted',
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  resolution_notes text not null default '',
  decline_reason text,
  linked_task_id text,
  assigned_to uuid references public.it_profiles (id) on delete set null,
  accepted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_email_idx on public.requests (requester_email);
create index if not exists requests_ticket_email_idx on public.requests (ticket, requester_email);

create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  body text not null,
  author_name text not null,
  author_email text not null,
  author_profile_id uuid references public.it_profiles (id) on delete set null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_name text not null,
  actor_email text not null,
  reason text,
  created_at timestamptz not null default now()
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

insert into storage.buckets (id, name, public)
values ('request-attachments', 'request-attachments', false)
on conflict (id) do nothing;

create or replace function public.next_request_ticket()
returns text
language plpgsql
security definer
as $$
declare
  y int := extract(year from now());
  n int;
begin
  insert into public.request_ticket_counters (year, last_number)
  values (y, 1)
  on conflict (year) do update
    set last_number = public.request_ticket_counters.last_number + 1
  returning last_number into n;
  return 'REQ-' || right(y::text, 2) || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function public.next_request_ticket() from public, anon, authenticated;
grant execute on function public.next_request_ticket() to service_role;
