-- Session invalidation and first-login password change for IT accounts.

alter table public.it_profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.it_profiles
  add column if not exists session_version int not null default 1;
