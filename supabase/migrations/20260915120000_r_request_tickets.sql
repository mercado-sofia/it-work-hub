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

revoke all on function public.next_request_ticket() from public, anon, authenticated;
grant execute on function public.next_request_ticket() to service_role;

update public.requests
set ticket = 'R-' || lpad((regexp_match(ticket, '([0-9]+)$'))[1], 4, '0')
where ticket ~ '^REQ-';

insert into public.request_ticket_counters (year, last_number)
select 0, coalesce(max(v), 0)
from (
  select last_number as v from public.request_ticket_counters
  union all
  select (regexp_match(ticket, '([0-9]+)$'))[1]::int
  from public.requests
  where ticket ~ '^R-[0-9]+$'
) s
on conflict (year) do update
set last_number = greatest(public.request_ticket_counters.last_number, excluded.last_number);
