-- Fehlende Stammdaten-Spalten in user_personal_profiles (falls ältere Tabelle)

alter table public.user_personal_profiles
  add column if not exists bank_account text,
  add column if not exists direct_manager text,
  add column if not exists work_area text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_personal_profiles_work_area_check'
  ) then
    alter table public.user_personal_profiles
      add constraint user_personal_profiles_work_area_check
      check (work_area is null or work_area in ('lager', 'werkstatt'));
  end if;
end $$;
