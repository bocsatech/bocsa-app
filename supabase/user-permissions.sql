-- Zusätzliche Rechte pro Benutzer (zusätzlich zu Gruppenrechten)
-- Im Supabase SQL Editor ausführen.

create table if not exists public.user_permissions (
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index if not exists user_permissions_user_id_idx on public.user_permissions (user_id);

alter table public.user_permissions disable row level security;

grant select, insert, update, delete on table public.user_permissions to anon, authenticated;

notify pgrst, 'reload schema';
