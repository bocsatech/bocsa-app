-- Firmendaten in app_settings (Schlüssel: firma)
-- Voraussetzung: app_settings existiert (maschines-setup.sql)

insert into public.app_settings (key, value)
values (
  'firma',
  jsonb_build_object(
    'name', '',
    'contactName', '',
    'contactPhone', '',
    'email', '',
    'website', '',
    'street', '',
    'postalCode', '',
    'city', '',
    'country', 'Österreich',
    'taxNumber', '',
    'companyRegisterNumber', '',
    'bankName', '',
    'iban', '',
    'bic', '',
    'notes', ''
  )
)
on conflict (key) do nothing;
