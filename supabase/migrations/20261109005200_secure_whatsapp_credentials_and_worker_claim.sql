-- Secure multi-tenant WhatsApp credential storage and queue worker RPCs.
create table private.whatsapp_credentials (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 access_token_secret_id uuid not null,
 updated_at timestamptz not null default now()
);
revoke all on private.whatsapp_credentials from public, anon, authenticated, service_role;

alter table public.whatsapp_settings add column sending_enabled boolean not null default false;

create or replace function public.whatsapp_set_access_token(p_organization_id uuid, p_access_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret_id uuid; v_secret_name text;
begin
 if auth.uid() is null or not private.has_org_role(p_organization_id, array['owner','admin']) then
  raise exception 'Only organization owners and admins may configure WhatsApp credentials';
 end if;
 if p_access_token is null or length(trim(p_access_token)) < 30 or length(p_access_token) > 4096 then
  raise exception 'Invalid WhatsApp access token';
 end if;
 v_secret_name := 'hadirku_whatsapp_access_' || p_organization_id::text;
 select access_token_secret_id into v_secret_id from private.whatsapp_credentials where organization_id = p_organization_id;
 if v_secret_id is null then
  v_secret_id := vault.create_secret(p_access_token, v_secret_name, 'HADIRKU WhatsApp Cloud API access token for organization ' || p_organization_id::text);
  insert into private.whatsapp_credentials(organization_id,access_token_secret_id) values (p_organization_id,v_secret_id)
  on conflict (organization_id) do update set access_token_secret_id=excluded.access_token_secret_id,updated_at=now();
 else
  perform vault.update_secret(v_secret_id,p_access_token,v_secret_name,'HADIRKU WhatsApp Cloud API access token for organization ' || p_organization_id::text);
  update private.whatsapp_credentials set updated_at=now() where organization_id=p_organization_id;
 end if;
end; $$;
revoke all on function public.whatsapp_set_access_token(uuid,text) from public, anon;
grant execute on function public.whatsapp_set_access_token(uuid,text) to authenticated;

create or replace function public.whatsapp_claim_batch(p_limit integer default 10)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_result jsonb;
begin
 v_role := current_setting('request.jwt.claim.role',true);
 if v_role is distinct from 'service_role' then raise exception 'Service role required'; end if;
 with candidates as (
  select m.id from public.whatsapp_messages m
  join public.whatsapp_settings s on s.organization_id=m.organization_id
  join private.whatsapp_credentials c on c.organization_id=m.organization_id
  join vault.decrypted_secrets ds on ds.id=c.access_token_secret_id
  join public.whatsapp_templates t on t.id=m.template_id and t.organization_id=m.organization_id
  join public.whatsapp_consents co on co.organization_id=m.organization_id and co.person_id=m.person_id
   and co.recipient_type=m.recipient_type and co.phone_number=m.recipient_phone
   and co.consent_status='opted_in' and co.consented_at is not null and co.revoked_at is null
  where m.delivery_status='queued' and m.scheduled_at<=now() and m.attempts<5
   and s.is_enabled and s.sending_enabled and t.is_active and t.approval_status='approved'
   and t.provider_template_name is not null and ds.decrypted_secret is not null and s.phone_number_id is not null
  order by m.scheduled_at,m.created_at for update of m skip locked
  limit greatest(1,least(coalesce(p_limit,10),50))
 ), claimed as (
  update public.whatsapp_messages m set delivery_status='sending',attempts=m.attempts+1,updated_at=now()
  from candidates c where m.id=c.id returning m.*
 )
 select coalesce(jsonb_agg(jsonb_build_object('message',to_jsonb(claimed),'phone_number_id',s.phone_number_id,
  'access_token',ds.decrypted_secret,'provider_template_name',t.provider_template_name)),'[]'::jsonb)
 into v_result from claimed
 join public.whatsapp_settings s on s.organization_id=claimed.organization_id
 join private.whatsapp_credentials c on c.organization_id=claimed.organization_id
 join vault.decrypted_secrets ds on ds.id=c.access_token_secret_id
 join public.whatsapp_templates t on t.id=claimed.template_id and t.organization_id=claimed.organization_id;
 return v_result;
end; $$;
revoke all on function public.whatsapp_claim_batch(integer) from public,anon,authenticated;
grant execute on function public.whatsapp_claim_batch(integer) to service_role;

create or replace function public.whatsapp_set_sending_enabled(p_organization_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Service role required'; end if;
 update public.whatsapp_settings set sending_enabled=coalesce(p_enabled,false),updated_at=now()
 where organization_id=p_organization_id;
end; $$;
revoke all on function public.whatsapp_set_sending_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.whatsapp_set_sending_enabled(uuid,boolean) to service_role;

create or replace function private.cancel_whatsapp_on_optout()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_message record;
begin
 if new.consent_status='opted_out' or new.revoked_at is not null then
  for v_message in
   update public.whatsapp_messages m set delivery_status='cancelled',updated_at=now(),
    error_code='CONSENT_REVOKED',error_message='Recipient consent was withdrawn before delivery'
   where m.organization_id=new.organization_id and m.person_id=new.person_id
    and m.recipient_type=new.recipient_type and m.recipient_phone=new.phone_number
    and m.delivery_status='queued'
   returning m.id,m.organization_id,m.provider_message_id
  loop
   insert into public.whatsapp_message_events(organization_id,message_id,event_key,event_type,provider_message_id,provider_status,sanitized_payload)
   values(v_message.organization_id,v_message.id,'consent-revoked-'||v_message.id::text,'cancelled',
    v_message.provider_message_id,'consent_revoked','{}'::jsonb)
   on conflict(organization_id,event_key) do nothing;
  end loop;
 end if;
 return new;
end; $$;
revoke all on function private.cancel_whatsapp_on_optout() from public,anon,authenticated;
create trigger whatsapp_cancel_queued_on_optout after insert or update of consent_status,revoked_at
on public.whatsapp_consents for each row execute function private.cancel_whatsapp_on_optout();

grant select,update on public.whatsapp_messages to service_role;
grant select,insert,update on public.whatsapp_message_events to service_role;
