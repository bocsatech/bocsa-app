-- Benutzer-Filiale (Depot-Buchstabe: S = Schwechat, H = Horn, W = Wien)
alter table public.users add column if not exists filiale_code text;

alter table public.users drop constraint if exists users_filiale_code_check;
alter table public.users add constraint users_filiale_code_check
  check (filiale_code is null or filiale_code in ('S', 'H', 'W'));

notify pgrst, 'reload schema';
