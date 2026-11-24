-- Cover requests: a manager asks several qualified staff to cover one shift;
-- each gets a private link; the first to accept gets the shift.

alter table staff add column if not exists phone text;

create table cover_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  service_user_id uuid not null references service_users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  filled_by uuid references staff(id) on delete set null,
  filled_at timestamptz,
  created_at timestamptz not null default now()
);

create table cover_offers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  request_id uuid not null references cover_requests(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  -- 256-bit random token: the only thing in the link, unguessable.
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  response text check (response in ('accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, staff_id)
);

create index on cover_requests (organisation_id, date);
create index on cover_offers (request_id);

alter table cover_requests enable row level security;
alter table cover_offers   enable row level security;

create policy "members all cover_requests" on cover_requests for all to authenticated
  using (private.is_member(organisation_id)) with check (private.is_member(organisation_id));
create policy "members all cover_offers" on cover_offers for all to authenticated
  using (private.is_member(organisation_id)) with check (private.is_member(organisation_id));

revoke all on table cover_requests, cover_offers from anon;

-- Public (link-holder) view of one offer. Returns only what the staff member needs:
-- no surname, no health or behaviour notes.
create or replace function public.get_cover_offer(offer_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'centre', o.name,
    'staff_first_name', split_part(s.name, ' ', 1),
    'service_user_first_name', split_part(u.name, ' ', 1),
    'date', r.date,
    'start_time', to_char(r.start_time, 'HH24:MI'),
    'end_time', to_char(r.end_time, 'HH24:MI'),
    'request_status', r.status,
    'filled_by_me', r.filled_by = f.staff_id,
    'my_response', f.response
  )
  from cover_offers f
  join cover_requests r on r.id = f.request_id
  join organisations o on o.id = r.organisation_id
  join staff s on s.id = f.staff_id
  join service_users u on u.id = r.service_user_id
  where f.token = offer_token and length(offer_token) = 64
$$;

-- Accept or decline. First acceptance wins (row lock on the request).
-- Returns: 'accepted' | 'declined' | 'already_filled' | 'cancelled' | 'already_booked' | 'not_found'
create or replace function public.respond_cover_offer(offer_token text, accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  f cover_offers%rowtype;
  r cover_requests%rowtype;
begin
  if length(offer_token) <> 64 then return 'not_found'; end if;
  select * into f from cover_offers where token = offer_token;
  if not found then return 'not_found'; end if;

  select * into r from cover_requests where id = f.request_id for update;
  if r.status = 'cancelled' then return 'cancelled'; end if;
  if r.status = 'filled' then
    return case when r.filled_by = f.staff_id then 'accepted' else 'already_filled' end;
  end if;

  if not accept then
    update cover_offers set response = 'declined', responded_at = now() where id = f.id;
    return 'declined';
  end if;

  -- Don't double-book: already on another shift that day?
  if exists (select 1 from assignments a
             where a.date = r.date and a.staff_id = f.staff_id and a.service_user_id <> r.service_user_id) then
    return 'already_booked';
  end if;

  delete from assignments where date = r.date and service_user_id = r.service_user_id;
  insert into assignments (organisation_id, staff_id, service_user_id, date, start_time, end_time, notes)
  values (r.organisation_id, f.staff_id, r.service_user_id, r.date, r.start_time, r.end_time, 'Covered via cover request');

  update cover_offers set response = 'accepted', responded_at = now() where id = f.id;
  update cover_requests set status = 'filled', filled_by = f.staff_id, filled_at = now() where id = r.id;
  return 'accepted';
end $$;

revoke execute on function public.get_cover_offer(text) from public;
revoke execute on function public.respond_cover_offer(text, boolean) from public;
grant execute on function public.get_cover_offer(text) to anon, authenticated;
grant execute on function public.respond_cover_offer(text, boolean) to anon, authenticated;
