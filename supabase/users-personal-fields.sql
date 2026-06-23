-- Persönliche Sache: zusätzliche Benutzerfelder

alter table public.users add column if not exists company_mobile text;
alter table public.users add column if not exists private_mobile text;
alter table public.users add column if not exists company_email text;
alter table public.users add column if not exists private_email text;
alter table public.users add column if not exists birth_date text;
alter table public.users add column if not exists address text;
alter table public.users add column if not exists ecard_number text;
alter table public.users add column if not exists emergency_contact_name text;
alter table public.users add column if not exists emergency_contact_phone text;
