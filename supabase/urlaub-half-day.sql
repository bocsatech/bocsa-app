-- Halber Urlaubstag (0.5) + ganzer Tag (1)
alter table public.urlaub_tage
  add column if not exists portion numeric not null default 1
  check (portion in (0.5, 1));
