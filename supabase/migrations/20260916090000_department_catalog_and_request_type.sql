-- Rename Finance, add Chief Admin Director, and retire the "Bug" request type label.

update public.departments
set name = 'Finance and Accounting'
where name = 'Finance'
  and not exists (select 1 from public.departments where name = 'Finance and Accounting');

delete from public.departments
where name = 'Finance'
  and exists (select 1 from public.departments where name = 'Finance and Accounting');

update public.requests
set department = 'Finance and Accounting'
where department = 'Finance';

insert into public.departments (name, sort_order)
select 'Finance and Accounting', 2
where not exists (
  select 1 from public.departments where name = 'Finance and Accounting'
);

insert into public.departments (name, sort_order)
select 'Chief Admin Director', coalesce((select max(sort_order) from public.departments), 0) + 1
where not exists (
  select 1 from public.departments where name = 'Chief Admin Director'
);

update public.requests
set type = 'Problem'
where type = 'Bug';
