create or replace function private.guard_whatsapp_template_approval()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare v_role text;
begin
 v_role := current_setting('request.jwt.claim.role',true);
 if v_role is distinct from 'service_role' then
  if tg_op = 'INSERT' and new.approval_status <> 'draft' then
   raise exception 'New WhatsApp templates must start as draft';
  end if;
  if tg_op = 'UPDATE' and new.approval_status is distinct from old.approval_status then
   raise exception 'Template approval status is managed by the WhatsApp provider';
  end if;
  if tg_op = 'UPDATE' and old.approval_status = 'approved'
   and (new.provider_template_name,new.language_code,new.category,new.body_preview)
       is distinct from
       (old.provider_template_name,old.language_code,old.category,old.body_preview) then
   raise exception 'Approved WhatsApp templates cannot be edited; create a new draft';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.guard_whatsapp_template_approval() from public,anon,authenticated,service_role;
create trigger whatsapp_template_approval_guard
before insert or update on public.whatsapp_templates
for each row execute function private.guard_whatsapp_template_approval();