alter table public.whatsapp_messages add constraint whatsapp_messages_id_organization_id_key unique (id, organization_id);
create table public.whatsapp_message_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 message_id uuid not null,
 event_key text not null check (length(trim(event_key)) between 8 and 200),
 event_type text not null check (event_type in ('queued','sending','sent','delivered','read','failed','cancelled')),
 provider_message_id text,
 provider_status text,
 provider_timestamp timestamptz,
 sanitized_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(sanitized_payload) = 'object'),
 received_at timestamptz not null default now(),
 foreign key (message_id, organization_id) references public.whatsapp_messages(id, organization_id) on delete cascade,
 unique (organization_id, event_key)
);
create index whatsapp_message_events_message_idx on public.whatsapp_message_events(message_id, organization_id, received_at desc);
create index whatsapp_message_events_org_received_idx on public.whatsapp_message_events(organization_id, received_at desc);
alter table public.whatsapp_message_events enable row level security;
create policy "WhatsApp events: managers read delivery history" on public.whatsapp_message_events
 for select to authenticated using (private.has_org_role(organization_id, array['owner','admin','manager','staff']));
grant select on public.whatsapp_message_events to authenticated;
grant select, insert on public.whatsapp_message_events to service_role;
