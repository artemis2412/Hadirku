-- HADIRKU initial multi-tenant attendance schema (PostgreSQL 17)
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, phone text, avatar_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 160),
 organization_type text not null default 'other' check(organization_type in ('school','foundation','pesantren','company','course','community','other')),
 email text, phone text, address text, timezone text not null default 'Asia/Makassar',
 created_by uuid not null references auth.users(id),
 is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_memberships (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','manager','staff','member','guardian')),
 membership_status text not null default 'active' check(membership_status in ('invited','active','suspended')),
 joined_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,user_id), unique(id,organization_id)
);
create table public.organization_units (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 parent_unit_id uuid, name text not null check(length(trim(name)) between 1 and 120),
 unit_type text not null default 'general' check(unit_type in ('class','department','division','team','group','branch','general')),
 description text, is_active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,organization_id),
 foreign key(parent_unit_id,organization_id) references public.organization_units(id,organization_id) on delete set null
);
create table public.people (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 unit_id uuid, user_id uuid references auth.users(id) on delete set null,
 external_code text, full_name text not null check(length(trim(full_name)) between 1 and 180),
 person_type text not null default 'member' check(person_type in ('student','employee','teacher','member','volunteer','other')),
 email text, phone text, guardian_name text, guardian_phone text, joined_on date,
 is_active boolean not null default true, notes text, created_by uuid references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,organization_id),
 foreign key(unit_id,organization_id) references public.organization_units(id,organization_id) on delete set null,
 unique(organization_id,external_code)
);
create unique index people_org_user_unique on public.people(organization_id,user_id) where user_id is not null;
create table public.attendance_statuses (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null check(code ~ '^[a-z][a-z0-9_]{1,39}$'),
 label text not null check(length(trim(label)) between 1 and 60),
 is_present boolean not null default false, is_excused boolean not null default false,
 sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,code), unique(id,organization_id)
);
create table public.attendance_sessions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 unit_id uuid, title text not null check(length(trim(title)) between 1 and 180),
 attendance_date date not null default current_date, starts_at timestamptz, ends_at timestamptz,
 session_status text not null default 'open' check(session_status in ('draft','open','closed','cancelled')),
 notes text, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,organization_id),
 foreign key(unit_id,organization_id) references public.organization_units(id,organization_id) on delete set null,
 check(ends_at is null or starts_at is null or ends_at >= starts_at)
);
create table public.attendance_records (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 session_id uuid not null, person_id uuid not null, status_id uuid not null,
 marked_by uuid not null references auth.users(id), marked_at timestamptz not null default now(),
 note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(session_id,person_id),
 foreign key(session_id,organization_id) references public.attendance_sessions(id,organization_id) on delete cascade,
 foreign key(person_id,organization_id) references public.people(id,organization_id) on delete cascade,
 foreign key(status_id,organization_id) references public.attendance_statuses(id,organization_id)
);

create index memberships_user_status_idx on public.organization_memberships(user_id,membership_status);
create index units_org_parent_idx on public.organization_units(organization_id,parent_unit_id);
create index people_org_unit_active_idx on public.people(organization_id,unit_id,is_active);
create index people_org_name_idx on public.people(organization_id,full_name);
create index sessions_org_date_idx on public.attendance_sessions(organization_id,attendance_date desc);
create index records_org_session_idx on public.attendance_records(organization_id,session_id);
create index records_org_person_idx on public.attendance_records(organization_id,person_id);

create or replace function private.set_updated_at() returns trigger language plpgsql set search_path=pg_catalog as $$
begin new.updated_at := now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger memberships_set_updated_at before update on public.organization_memberships for each row execute function private.set_updated_at();
create trigger units_set_updated_at before update on public.organization_units for each row execute function private.set_updated_at();
create trigger people_set_updated_at before update on public.people for each row execute function private.set_updated_at();
create trigger statuses_set_updated_at before update on public.attendance_statuses for each row execute function private.set_updated_at();
create trigger sessions_set_updated_at before update on public.attendance_sessions for each row execute function private.set_updated_at();
create trigger records_set_updated_at before update on public.attendance_records for each row execute function private.set_updated_at();

create or replace function private.is_org_member(p_org_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from public.organization_memberships m where m.organization_id=p_org_id and m.user_id=(select auth.uid()) and m.membership_status='active'); $$;
create or replace function private.has_org_role(p_org_id uuid,p_roles text[]) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from public.organization_memberships m where m.organization_id=p_org_id and m.user_id=(select auth.uid()) and m.membership_status='active' and m.role=any(p_roles)); $$;
create or replace function private.is_org_creator(p_org_id uuid) returns boolean language sql stable security definer set search_path=pg_catalog as $$
 select exists(select 1 from public.organizations o where o.id=p_org_id and o.created_by=(select auth.uid())); $$;
revoke all on function private.is_org_member(uuid) from public,anon;
revoke all on function private.has_org_role(uuid,text[]) from public,anon;
revoke all on function private.is_org_creator(uuid) from public,anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid,text[]) to authenticated;
grant execute on function private.is_org_creator(uuid) to authenticated;

create or replace function private.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into public.profiles(id,display_name)
 values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),new.email))
 on conflict(id) do nothing;
 return new;
end; $$;
revoke all on function private.handle_new_auth_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

create or replace function private.seed_attendance_statuses() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into public.attendance_statuses(organization_id,code,label,is_present,is_excused,sort_order) values
 (new.id,'hadir','Hadir',true,false,1),(new.id,'terlambat','Terlambat',true,false,2),
 (new.id,'izin','Izin',false,true,3),(new.id,'sakit','Sakit',false,true,4),
 (new.id,'alpa','Alpa',false,false,5),(new.id,'cuti','Cuti',false,true,6),
 (new.id,'dinas_luar','Dinas Luar',true,false,7);
 return new;
end; $$;
revoke all on function private.seed_attendance_statuses() from public,anon,authenticated;
create trigger organizations_seed_attendance_statuses after insert on public.organizations for each row execute function private.seed_attendance_statuses();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_units enable row level security;
alter table public.people enable row level security;
alter table public.attendance_statuses enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy "Profiles: user reads own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy "Profiles: user inserts own profile" on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy "Profiles: user updates own profile" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

create policy "Organizations: creator inserts organization" on public.organizations for insert to authenticated with check(created_by=(select auth.uid()));
create policy "Organizations: members read organization" on public.organizations for select to authenticated using(private.is_org_member(id));
create policy "Organizations: owner and admin update organization" on public.organizations for update to authenticated using(private.has_org_role(id,array['owner','admin'])) with check(private.has_org_role(id,array['owner','admin']));

create policy "Memberships: self and managers read memberships" on public.organization_memberships for select to authenticated using(user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','admin']));
create policy "Memberships: creator bootstraps owner or admin manages" on public.organization_memberships for insert to authenticated with check((user_id=(select auth.uid()) and role='owner' and private.is_org_creator(organization_id)) or private.has_org_role(organization_id,array['owner','admin']));
create policy "Memberships: owner and admin update memberships" on public.organization_memberships for update to authenticated using(private.has_org_role(organization_id,array['owner','admin'])) with check(private.has_org_role(organization_id,array['owner','admin']));
create policy "Memberships: owner and admin remove memberships" on public.organization_memberships for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin']));

create policy "Units: organization members read units" on public.organization_units for select to authenticated using(private.is_org_member(organization_id));
create policy "Units: managers and staff create units" on public.organization_units for insert to authenticated with check(created_by=(select auth.uid()) and private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Units: managers and staff update units" on public.organization_units for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager','staff'])) with check(private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Units: admins and managers delete units" on public.organization_units for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));

create policy "People: staff and person read people" on public.people for select to authenticated using(user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "People: staff create people" on public.people for insert to authenticated with check(created_by=(select auth.uid()) and private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "People: staff update people" on public.people for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager','staff'])) with check(private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "People: admins and managers delete people" on public.people for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));

create policy "Statuses: organization members read statuses" on public.attendance_statuses for select to authenticated using(private.is_org_member(organization_id));
create policy "Statuses: admins and managers create statuses" on public.attendance_statuses for insert to authenticated with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy "Statuses: admins and managers update statuses" on public.attendance_statuses for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager'])) with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy "Statuses: admins and managers delete statuses" on public.attendance_statuses for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));

create policy "Sessions: organization members read sessions" on public.attendance_sessions for select to authenticated using(private.is_org_member(organization_id));
create policy "Sessions: staff create sessions" on public.attendance_sessions for insert to authenticated with check(created_by=(select auth.uid()) and private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Sessions: staff update sessions" on public.attendance_sessions for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager','staff'])) with check(private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Sessions: managers delete sessions" on public.attendance_sessions for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));

create policy "Records: staff and subject read attendance records" on public.attendance_records for select to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager','staff']) or exists(select 1 from public.people p where p.id=person_id and p.organization_id=attendance_records.organization_id and p.user_id=(select auth.uid())));
create policy "Records: staff mark attendance" on public.attendance_records for insert to authenticated with check(marked_by=(select auth.uid()) and private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Records: staff correct attendance" on public.attendance_records for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager','staff'])) with check(private.has_org_role(organization_id,array['owner','admin','manager','staff']));
create policy "Records: managers delete attendance records" on public.attendance_records for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));

grant select,insert,update,delete on public.profiles,public.organizations,public.organization_memberships,public.organization_units,public.people,public.attendance_statuses,public.attendance_sessions,public.attendance_records to authenticated;
revoke all on public.profiles,public.organizations,public.organization_memberships,public.organization_units,public.people,public.attendance_statuses,public.attendance_sessions,public.attendance_records from anon;
