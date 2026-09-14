CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  department text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  affected_module text NOT NULL,
  steps_to_reproduce text,
  expected_behavior text,
  actual_behavior text,
  requester_urgency text NOT NULL DEFAULT 'medium',
  it_priority text,
  status text NOT NULL DEFAULT 'Submitted',
  decline_reason text,
  resolution_notes text,
  linked_task_id text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX requests_status_idx ON public.requests (status);
CREATE INDEX requests_email_idx ON public.requests (lower(requester_email));

CREATE TABLE public.request_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  is_it boolean NOT NULL DEFAULT false,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_comments TO service_role;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_comments_request_idx ON public.request_comments (request_id);

CREATE TABLE public.request_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by text NOT NULL DEFAULT 'IT Team',
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_status_history TO service_role;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_status_history_request_idx ON public.request_status_history (request_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER requests_set_updated_at
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE public.request_ticket_seq START 1;
GRANT ALL ON SEQUENCE public.request_ticket_seq TO service_role;