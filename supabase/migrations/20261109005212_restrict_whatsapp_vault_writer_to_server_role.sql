create or replace function public.whatsapp_set_access_token(p_organization_id uuid,p_access_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_secret_id uuid; v_secret_name text;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Service role required'; end if;
 if p_access_token is null or length(trim(p_access_token))<30 or length(p_access_token)>4096 then raise exception 'Invalid WhatsApp access token'; end if;
 v_secret_name:='hadirku_whatsapp_access_'||p_organization_id::text;
 select access_token_secret_id into v_secret_id from private.whatsapp_credentials where organization_id=p_organization_id;
 if v_secret_id is null then
  v_secret_id:=vault.create_secret(p_access_token,v_secret_name,'HADIRKU WhatsApp Cloud API access token for organization '||p_organization_id::text);
  insert into private.whatsapp_credentials(organization_id,access_token_secret_id) values(p_organization_id,v_secret_id)
  on conflict(organization_id) do update set access_token_secret_id=excluded.access_token_secret_id,updated_at=now();
 else
  perform vault.update_secret(v_secret_id,p_access_token,v_secret_name,'HADIRKU WhatsApp Cloud API access token for organization '||p_organization_id::text);
  update private.whatsapp_credentials set updated_at=now() where organization_id=p_organization_id;
 end if;
end; $$;
revoke all on function public.whatsapp_set_access_token(uuid,text) from public,anon,authenticated;
grant execute on function public.whatsapp_set_access_token(uuid,text) to service_role;
