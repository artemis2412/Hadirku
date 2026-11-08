-- Atomic organization onboarding and last-active-owner protection.
drop index if exists public.memberships_user_status_idx2;

create or replace function public.create_organization(
  p_name text,
  p_organization_type text default 'other',
  p_timezone text default 'Asia/Makassar'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  insert into public.organizations(name, organization_type, timezone, created_by)
  values (trim(p_name), p_organization_type, coalesce(nullif(trim(p_timezone), ''), 'Asia/Makassar'), v_user_id)
  returning id into v_org_id;
  insert into public.organization_memberships(organization_id, user_id, role, membership_status, joined_at)
  values (v_org_id, v_user_id, 'owner', 'active', now());
  return v_org_id;
end;
$$;
revoke all on function public.create_organization(text,text,text) from public, anon;
grant execute on function public.create_organization(text,text,text) to authenticated;

create or replace function private.guard_last_active_owner()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_remaining integer;
  v_new_owner_active boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_new_owner_active := new.role = 'owner' and new.membership_status = 'active';
  end if;
  if old.role = 'owner' and old.membership_status = 'active' and not v_new_owner_active then
    select count(*) into v_remaining
    from public.organization_memberships m
    where m.organization_id = old.organization_id
      and m.role = 'owner' and m.membership_status = 'active' and m.id <> old.id;
    if v_remaining = 0 then
      raise exception 'An organization must retain at least one active owner' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_last_active_owner() from public, anon, authenticated;
create trigger memberships_guard_last_owner
before update of role, membership_status or delete on public.organization_memberships
for each row execute function private.guard_last_active_owner();
