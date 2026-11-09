alter table public.whatsapp_consents drop constraint whatsapp_consents_phone_number_check;
alter table public.whatsapp_consents add constraint whatsapp_consents_phone_number_check
 check (phone_number ~ '^\+[1-9][0-9]{7,14}$');
alter table public.whatsapp_messages drop constraint whatsapp_messages_recipient_phone_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_recipient_phone_check
 check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$');
