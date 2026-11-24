-- Carero initial schema.
-- Not applied yet: the app currently stores data in the browser.
-- Apply this once staff log-in (Supabase Auth) is added. Every table is scoped to an
-- organisation and protected by row-level security, because service user records are
-- sensitive health data (UK GDPR special category).

create table organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_shift_start time not null default '07:00',
  default_shift_end time not null default '15:00',
  created_at timestamptz not null default now()
);

create table memberships (
  organisation_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'manager' check (role in ('manager', 'staff')),
  primary key (organisation_id, user_id)
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Manager', 'Support Worker', 'Senior Support Worker', 'Volunteer')),
  skills text[] not null default '{}',
  availability text[] not null default '{}',
  preferred_users uuid[] not null default '{}',
  notes text not null default '',
  support_level_max int not null default 1 check (support_level_max between 1 and 3),
  shift_limits int,
  emergency_contact text,
  created_at timestamptz not null default now()
);

create table service_users (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  support_level int not null check (support_level between 1 and 3),
  required_ratio text not null default '1:1',
  required_skills text[] not null default '{}',
  preferred_staff uuid[] not null default '{}',
  alerts text[] not null default '{}',
  notes text not null default '',
  sensory_notes text not null default '',
  behaviour_notes text not null default '',
  transport_notes text,
  medication_reminders text[],
  created_at timestamptz not null default now()
);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  service_user_id uuid not null references service_users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (date, service_user_id),
  unique (date, staff_id)
);

create table absences (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default 'sick' check (reason in ('sick', 'leave', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index on assignments (organisation_id, date);
create index on absences (organisation_id, start_date, end_date);

-- Row-level security: members can only see their own organisation's rows.
create or replace function is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.organisation_id = org and m.user_id = auth.uid())
$$;

alter table organisations enable row level security;
alter table memberships   enable row level security;
alter table staff         enable row level security;
alter table service_users enable row level security;
alter table assignments   enable row level security;
alter table absences      enable row level security;

create policy "members read org"   on organisations for select to authenticated using (is_member(id));
create policy "members update org" on organisations for update to authenticated using (is_member(id));
create policy "own memberships"    on memberships   for select to authenticated using (user_id = auth.uid());

create policy "members all staff"         on staff         for all to authenticated using (is_member(organisation_id)) with check (is_member(organisation_id));
create policy "members all service_users" on service_users for all to authenticated using (is_member(organisation_id)) with check (is_member(organisation_id));
create policy "members all assignments"   on assignments   for all to authenticated using (is_member(organisation_id)) with check (is_member(organisation_id));
create policy "members all absences"      on absences      for all to authenticated using (is_member(organisation_id)) with check (is_member(organisation_id));
