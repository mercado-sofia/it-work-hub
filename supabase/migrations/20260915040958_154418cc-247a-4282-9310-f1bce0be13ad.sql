DROP TABLE IF EXISTS public.request_status_history CASCADE;
DROP TABLE IF EXISTS public.request_comments CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.modules CASCADE;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

INSERT INTO public.departments (name, sort_order) VALUES
  ('HR', 1), ('Supply Chain & Logistics', 2), ('Finance', 3), ('IT', 4);

INSERT INTO public.modules (name, sort_order) VALUES
  ('Odoo Development', 1), ('Solarista Compass', 2), ('Hardware/Network', 3),
  ('IT Consulting', 4), ('Maintenance/Operations', 5), ('Other', 6);

CREATE TABLE public.it_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  password_hash text NOT NULL,
  session_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.it_profiles TO service_role;
ALTER TABLE public.it_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.it_settings (
  id integer PRIMARY KEY,
  department_name text NOT NULL DEFAULT 'Information Technology Department',
  contact_email text NOT NULL DEFAULT '',
  contact_extension text NOT NULL DEFAULT '',
  signatory_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.it_settings TO service_role;
ALTER TABLE public.it_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text NOT NULL UNIQUE,
  type text NOT NULL,
  title text NOT NULL,
  note text NOT NULL DEFAULT '',
  module text NOT NULL,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  department text NOT NULL,
  urgency text NOT NULL DEFAULT 'Medium',
  it_priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Submitted',
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  resolution_notes text NOT NULL DEFAULT '',
  decline_reason text,
  linked_task_id text,
  assigned_to uuid REFERENCES public.it_profiles(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX requests_status_idx ON public.requests (status);
CREATE INDEX requests_email_idx ON public.requests (requester_email);

CREATE TABLE public.request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_name text NOT NULL,
  author_email text NOT NULL,
  author_profile_id uuid REFERENCES public.it_profiles(id) ON DELETE SET NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_comments TO service_role;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_comments_request_idx ON public.request_comments (request_id);

CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_name text NOT NULL DEFAULT 'IT Team',
  actor_email text NOT NULL DEFAULT '',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_status_history_request_idx ON public.request_status_history (request_id);

CREATE TABLE public.request_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_attachments TO service_role;
ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_attachments_request_idx ON public.request_attachments (request_id);

CREATE OR REPLACE FUNCTION public.next_request_ticket()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public'
AS $$
  SELECT 'R-' || lpad(nextval('public.request_ticket_seq')::text, 4, '0');
$$;
REVOKE ALL ON FUNCTION public.next_request_ticket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_request_ticket() TO service_role;