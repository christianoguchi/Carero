-- Signed-out visitors get no table access at all (RLS would return nothing anyway; this is belt and braces).
revoke all on table organisations, memberships, staff, service_users, assignments, absences from anon;
alter default privileges in schema public revoke all on tables from anon;
