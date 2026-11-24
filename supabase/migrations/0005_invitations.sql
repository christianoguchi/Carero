-- Team invitations: a manager invites someone (e.g. their boss) to manage the same centre.

create or replace function private.is_manager(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m
                 where m.organisation_id = org and m.user_id = auth.uid() and m.role = 'manager')
$$;
grant execute on function private.is_manager(uuid) to authenticated;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  role text not null default 'manager' check (role in ('manager', 'staff')),
  note text,                                   -- e.g. "For Anne" (shown to the inviter only)
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked boolean not null default false
);

create index on invitations (organisation_id);

alter table invitations enable row level security;
create policy "managers manage invitations" on invitations for all to authenticated
  using (private.is_manager(organisation_id)) with check (private.is_manager(organisation_id));
revoke all on table invitations from anon;

-- What the invite link shows before signing in: just the centre name and whether it's still valid.
create or replace function public.get_invitation(invite_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'centre', o.name,
    'status', case
      when i.revoked then 'revoked'
      when i.accepted_by is not null then 'used'
      when i.expires_at < now() then 'expired'
      else 'valid' end
  )
  from invitations i join organisations o on o.id = i.organisation_id
  where i.token = invite_token and length(invite_token) = 64
$$;

-- Accept: signed-in user joins the centre. Single use.
-- Returns: 'joined' | 'already_member' | 'in_another_centre' | 'invalid' | 'used' | 'expired' | 'revoked'
create or replace function public.accept_invitation(invite_token text)
returns text language plpgsql security definer set search_path = public as $$
declare i invitations%rowtype;
begin
  if auth.uid() is null then return 'invalid'; end if;
  if length(invite_token) <> 64 then return 'invalid'; end if;
  select * into i from invitations where token = invite_token for update;
  if not found then return 'invalid'; end if;
  if exists (select 1 from memberships where organisation_id = i.organisation_id and user_id = auth.uid()) then
    return 'already_member';
  end if;
  if i.revoked then return 'revoked'; end if;
  if i.accepted_by is not null then return 'used'; end if;
  if i.expires_at < now() then return 'expired'; end if;
  -- One centre per account for now (the app opens your first centre).
  if exists (select 1 from memberships where user_id = auth.uid()) then return 'in_another_centre'; end if;

  insert into memberships (organisation_id, user_id, role) values (i.organisation_id, auth.uid(), i.role);
  update invitations set accepted_by = auth.uid(), accepted_at = now() where id = i.id;
  return 'joined';
end $$;

-- Team list for the Settings page (emails live in auth.users, which the app can't read directly).
create or replace function public.list_members(org uuid)
returns table (user_id uuid, email text, role text, is_me boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.user_id = auth.uid()
  from memberships m join auth.users u on u.id = m.user_id
  where m.organisation_id = org and private.is_member(org)
  order by u.email
$$;

-- Remove someone from the centre. Managers only; can't remove the last manager.
create or replace function public.remove_member(org uuid, member uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if not private.is_manager(org) then return 'not_allowed'; end if;
  if (select role from memberships where organisation_id = org and user_id = member) = 'manager'
     and (select count(*) from memberships where organisation_id = org and role = 'manager') <= 1 then
    return 'last_manager';
  end if;
  delete from memberships where organisation_id = org and user_id = member;
  return 'removed';
end $$;

revoke execute on function public.get_invitation(text) from public;
revoke execute on function public.accept_invitation(text) from public;
revoke execute on function public.list_members(uuid) from public;
revoke execute on function public.remove_member(uuid, uuid) from public;
grant execute on function public.get_invitation(text) to anon, authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.list_members(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;

-- Supabase grants new functions to anon by default; these need a signed-in user.
revoke execute on function public.accept_invitation(text) from anon;
revoke execute on function public.list_members(uuid) from anon;
revoke execute on function public.remove_member(uuid, uuid) from anon;
revoke execute on function private.is_manager(uuid) from public, anon;
