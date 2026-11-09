-- Official WhatsApp Business Platform foundation for HADIRKU.
-- Never store Meta access tokens or app secrets in these tables.
create table public.whatsapp_settings (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null unique references public.organizations(id) on delete cascade,
 is_enabled boolean not null default false,
 phone_number_id text,
 business_account_id text,
 display_phone_number text,
 default_language text not null default 'id',
 created_by uuid references auth.users(id),
 updated_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (phone_number_id is null or length(trim(phone_number_id)) between 3 and 80),
 check (business_account_id is null or length(trim(business_account_id)) between 3 and 80)
);
create table public.whatsapp_consents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 person_id uuid not null,
 recipient_type text not null default 'self' check (recipient_type in ('self','guardian')),
 phone_number text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
 consent_status text not null default 'pending' check (consent_status in ('pending','opted_in','opted_out')),
 consent_method text not null default 'manual' check (consent_method in ('manual','web_form','paper_form','whatsapp','imported')),
 consent_text text,
 evidence_reference text,
 consented_at timestamptz,
 revoked_at timestamptz,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (person_id, organization_id) references public.people(id, organization_id) on delete cascade,
 unique (organization_id, person_id, recipient_type, phone_number),
 check ((consent_status = 'opted_in' and consented_at is not null and revoked_at is null) or consent_status <> 'opted_in')
);
create table public.whatsapp_templates (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 template_key text not null check (template_key ~ '^[a-z][a-z0-9_]{1,59}$'),
 display_name text not null check (length(trim(display_name)) between 2 and 120),
 provider_template_name text,
 language_code text not null default 'id',
 category text not null default 'utility' check (category in ('utility','authentication','marketing')),
 body_preview text not null check (length(trim(body_preview)) between 1 and 1024),
 variables jsonb not null default '[]'::jsonb check (jsonb_typeof(variables) = 'array'),
 approval_status text not null default 'draft' check (approval_status in ('draft','pending','approved','rejected','paused')),
 rejection_reason text,
 is_active boolean not null default true,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id, template_key),
 unique (id, organization_id),
 check (approval_status <> 'approved' or (provider_template_name is not null and length(trim(provider_template_name)) > 0))
);
create table public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 person_id uuid,
 template_id uuid not null,
 recipient_type text not null check (recipient_type in ('self','guardian')),
 recipient_phone text not null check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$'),
 template_name_snapshot text not null,
 language_code text not null default 'id',
 template_variables jsonb not null default '{}'::jsonb check (jsonb_typeof(template_variables) = 'object'),
 delivery_status text not null default 'queued' check (delivery_status in ('queued','sending','sent','delivered','read','failed','cancelled')),
 provider_message_id text,
 idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 160),
 attempts integer not null default 0 check (attempts >= 0 and attempts <= 10),
 scheduled_at timestamptz not null default now(),
 sent_at timestamptz,
 delivered_at timestamptz,
 read_at timestamptz,
 failed_at timestamptz,
 error_code text,
 error_message text,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (person_id, organization_id) references public.people(id, organization_id) on delete set null (person_id),
 foreign key (template_id, organization_id) references public.whatsapp_templates(id, organization_id),
 unique (organization_id, idempotency_key)
);
create index whatsapp_consents_lookup_idx on public.whatsapp_consents(organization_id, person_id, recipient_type, consent_status);
create index whatsapp_templates_org_status_idx on public.whatsapp_templates(organization_id, approval_status, is_active);
create index whatsapp_messages_queue_idx on public.whatsapp_messages(delivery_status, scheduled_at) where delivery_status = 'queued';
create index whatsapp_messages_org_created_idx on public.whatsapp_messages(organization_id, created_at desc);
create unique index whatsapp_messages_provider_id_idx on public.whatsapp_messages(provider_message_id) where provider_message_id is not null;
create trigger whatsapp_settings_set_updated_at before update on public.whatsapp_settings for each row execute function private.set_updated_at();
create trigger whatsapp_consents_set_updated_at before update on public.whatsapp_consents for each row execute function private.set_updated_at();
create trigger whatsapp_templates_set_updated_at before update on public.whatsapp_templates for each row execute function private.set_updated_at();
create trigger whatsapp_messages_set_updated_at before update on public.whatsapp_messages for each row execute function private.set_updated_at();
create or replace function private.guard_whatsapp_message_queue() returns trigger
language plpgsql security invoker set search_path = pg_catalog as $$
begin
 if new.delivery_status <> 'queued' then raise exception 'New WhatsApp messages must start in queued status'; end if;
 if not exists (
  select 1 from public.whatsapp_consents c
  where c.organization_id = new.organization_id and c.person_id = new.person_id
   and c.recipient_type = new.recipient_type and c.phone_number = new.recipient_phone
   and c.consent_status = 'opted_in' and c.consented_at is not null and c.revoked_at is null
 ) then raise exception 'Recipient has not granted active WhatsApp consent'; end if;
 if not exists (
  select 1 from public.whatsapp_templates t
  where t.id = new.template_id and t.organization_id = new.organization_id
   and t.approval_status = 'approved' and t.is_active
 ) then raise exception 'WhatsApp template is not approved and active'; end if;
 return new;
end; $$;
revoke all on function private.guard_whatsapp_message_queue() from public, anon, authenticated;
create trigger whatsapp_messages_guard_queue before insert on public.whatsapp_messages for each row execute function private.guard_whatsapp_message_queue();
alter table public.whatsapp_settings enable row level security;
alter table public.whatsapp_consents enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_messages enable row level security;
create policy "WhatsApp settings: managers read settings" on public.whatsapp_settings
 for select to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager']));
create policy "WhatsApp settings: admins create settings" on public.whatsapp_settings
 for insert to authenticated with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp settings: admins update settings" on public.whatsapp_settings
 for update to authenticated using (private.has_org_role(organization_id, array['owner','admin']))
 with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp settings: admins delete settings" on public.whatsapp_settings
 for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp consent: managers read consent" on public.whatsapp_consents
 for select to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager']));
create policy "WhatsApp consent: staff manage consent" on public.whatsapp_consents
 for insert to authenticated with check (created_by = (select auth.uid()) and private.has_org_role(organization_id, array['owner','admin','manager','staff']));
create policy "WhatsApp consent: managers update consent" on public.whatsapp_consents
 for update to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager']))
 with check (private.has_org_role(organization_id, array['owner','admin','manager']));
create policy "WhatsApp consent: admins delete consent" on public.whatsapp_consents
 for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp templates: managers read templates" on public.whatsapp_templates
 for select to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager','staff']));
create policy "WhatsApp templates: admins create templates" on public.whatsapp_templates
 for insert to authenticated with check (created_by = (select auth.uid()) and private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp templates: admins update templates" on public.whatsapp_templates
 for update to authenticated using (private.has_org_role(organization_id, array['owner','admin']))
 with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp templates: admins delete templates" on public.whatsapp_templates
 for delete to authenticated using (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp messages: staff read message history" on public.whatsapp_messages
 for select to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager','staff']));
create policy "WhatsApp messages: staff queue messages" on public.whatsapp_messages
 for insert to authenticated with check (created_by = (select auth.uid()) and delivery_status = 'queued'
  and private.has_org_role(organization_id, array['owner','admin','manager','staff']));
grant select, insert, update, delete on public.whatsapp_settings to authenticated;
grant select, insert, update, delete on public.whatsapp_consents to authenticated;
grant select, insert, update, delete on public.whatsapp_templates to authenticated;
grant select, insert on public.whatsapp_messages to authenticated;
