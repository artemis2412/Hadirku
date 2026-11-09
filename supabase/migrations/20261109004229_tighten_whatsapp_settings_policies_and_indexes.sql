drop policy "WhatsApp settings: admins manage settings" on public.whatsapp_settings;
create policy "WhatsApp settings: admins create settings" on public.whatsapp_settings for insert to authenticated
 with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp settings: admins update settings" on public.whatsapp_settings for update to authenticated
 using (private.has_org_role(organization_id, array['owner','admin'])) with check (private.has_org_role(organization_id, array['owner','admin']));
create policy "WhatsApp settings: admins delete settings" on public.whatsapp_settings for delete to authenticated
 using (private.has_org_role(organization_id, array['owner','admin']));
create index whatsapp_settings_created_by_idx on public.whatsapp_settings(created_by);
create index whatsapp_settings_updated_by_idx on public.whatsapp_settings(updated_by);
create index whatsapp_consents_person_org_fk_idx on public.whatsapp_consents(person_id, organization_id);
create index whatsapp_consents_created_by_idx on public.whatsapp_consents(created_by);
create index whatsapp_templates_created_by_idx on public.whatsapp_templates(created_by);
create index whatsapp_messages_person_org_fk_idx on public.whatsapp_messages(person_id, organization_id);
create index whatsapp_messages_template_org_fk_idx on public.whatsapp_messages(template_id, organization_id);
create index whatsapp_messages_created_by_idx on public.whatsapp_messages(created_by);
