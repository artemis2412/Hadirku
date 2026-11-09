alter table public.whatsapp_messages drop constraint whatsapp_messages_person_id_organization_id_fkey;
alter table public.whatsapp_messages add constraint whatsapp_messages_person_id_organization_id_fkey
 foreign key (person_id, organization_id) references public.people(id, organization_id) on delete set null (person_id);
