-- Geheimzahl für Login (0–99) — im Supabase SQL Editor ausführen

alter table public.users add column if not exists secret_pin smallint;

alter table public.users drop constraint if exists users_secret_pin_check;
alter table public.users add constraint users_secret_pin_check
  check (secret_pin is null or (secret_pin >= 0 and secret_pin <= 99));

-- Admin: Geheimzahl 42 (Passwort unverändert)
update public.users
set secret_pin = 42
where username = 'admin' and secret_pin is null;

notify pgrst, 'reload schema';
