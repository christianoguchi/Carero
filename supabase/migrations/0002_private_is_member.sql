-- Keep the RLS helper out of the public REST API (policies follow the function).
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_member(uuid) set schema private;
