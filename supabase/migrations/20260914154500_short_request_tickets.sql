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

update public.requests
set ticket = 'REQ-' || right(split_part(ticket, '-', 2), 2) || '-' || lpad(split_part(ticket, '-', 3), 4, '0')
where ticket ~ '^REQ-[0-9]{4}-[0-9]+$';
