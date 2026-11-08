-- Index foreign keys and prevent composite SET NULL from nulling organization_id.
alter table public.organization_units drop constraint organization_units_parent_unit_id_organization_id_fkey,
 add constraint organization_units_parent_unit_id_organization_id_fkey foreign key(parent_unit_id,organization_id) references public.organization_units(id,organization_id) on delete restrict;
alter table public.people drop constraint people_unit_id_organization_id_fkey,
 add constraint people_unit_id_organization_id_fkey foreign key(unit_id,organization_id) references public.organization_units(id,organization_id) on delete restrict;
alter table public.attendance_sessions drop constraint attendance_sessions_unit_id_organization_id_fkey,
 add constraint attendance_sessions_unit_id_organization_id_fkey foreign key(unit_id,organization_id) references public.organization_units(id,organization_id) on delete restrict;

create index memberships_user_status_idx2 on public.organization_memberships(user_id);
create index organizations_created_by_idx on public.organizations(created_by);
create index units_parent_org_fk_idx on public.organization_units(parent_unit_id,organization_id);
create index units_created_by_idx on public.organization_units(created_by);
create index people_unit_org_fk_idx on public.people(unit_id,organization_id);
create index people_user_id_fk_idx on public.people(user_id);
create index people_created_by_idx on public.people(created_by);
create index sessions_unit_org_fk_idx on public.attendance_sessions(unit_id,organization_id);
create index sessions_created_by_idx on public.attendance_sessions(created_by);
create index records_session_org_fk_idx on public.attendance_records(session_id,organization_id);
create index records_person_org_fk_idx on public.attendance_records(person_id,organization_id);
create index records_status_org_fk_idx on public.attendance_records(status_id,organization_id);
create index records_marked_by_idx on public.attendance_records(marked_by);
