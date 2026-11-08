-- The onboarding RPC runs as the caller; RLS authorizes both inserts.
alter function public.create_organization(text,text,text) security invoker;