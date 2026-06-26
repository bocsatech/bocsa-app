-- Persönliches Profil (Kopie der Admin-Stammdaten, getrennt bearbeitbar)

create table if not exists public.user_personal_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  full_name text,
  position text,
  site text,
  filiale_code text,
  photo_url text,
  signature_url text,
  company_mobile text,
  private_mobile text,
  company_email text,
  private_email text,
  birth_date text,
  address text,
  ecard_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_account text,
  direct_manager text,
  work_area text check (work_area is null or work_area in ('lager', 'werkstatt')),
  updated_at timestamptz not null default now()
);

alter table public.user_personal_profiles disable row level security;
grant all on table public.user_personal_profiles to anon, authenticated, service_role;

-- Einmalige Kopie aus users (bestehende Daten)
insert into public.user_personal_profiles (
  user_id,
  full_name,
  position,
  site,
  filiale_code,
  photo_url,
  signature_url,
  company_mobile,
  private_mobile,
  company_email,
  private_email,
  birth_date,
  address,
  ecard_number,
  emergency_contact_name,
  emergency_contact_phone,
  bank_account,
  direct_manager,
  work_area
)
select
  id,
  full_name,
  position,
  site,
  null::text as filiale_code,
  photo_url,
  signature_url,
  company_mobile,
  private_mobile,
  company_email,
  private_email,
  birth_date,
  address,
  ecard_number,
  emergency_contact_name,
  emergency_contact_phone,
  bank_account,
  direct_manager,
  work_area
from public.users
on conflict (user_id) do nothing;
