CREATE OR REPLACE FUNCTION public.next_request_ticket()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'REQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.request_ticket_seq')::text, 4, '0');
$$;
REVOKE ALL ON FUNCTION public.next_request_ticket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_request_ticket() TO service_role;