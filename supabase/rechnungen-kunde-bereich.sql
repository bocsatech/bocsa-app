-- Rechnungen: PKW vs. Baugerät Kunde/Objekt (localhost)
alter table public.rechnungen
  add column if not exists kunde_bereich text not null default 'pkw'
    check (kunde_bereich in ('pkw', 'bau'));

alter table public.rechnungen
  add column if not exists machine_id uuid references public.maschines (id) on delete set null;

alter table public.rechnungen
  add column if not exists machine_snapshot jsonb;

create index if not exists rechnungen_machine_id_idx on public.rechnungen (machine_id);
