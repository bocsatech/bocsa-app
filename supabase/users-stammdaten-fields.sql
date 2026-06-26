-- Stammdaten: Bank, Vorgesetzter, Arbeitsbereich, Überstunden-Saldo

alter table public.users add column if not exists bank_account text;
alter table public.users add column if not exists direct_manager text;
alter table public.users add column if not exists work_area text
  check (work_area is null or work_area in ('lager', 'werkstatt'));
alter table public.users add column if not exists overtime_hours_balance numeric(10, 2) not null default 0;
