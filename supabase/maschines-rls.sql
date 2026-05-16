-- Futtasd a Supabase SQL Editorban (https://supabase.com/dashboard -> SQL -> New query)
-- Ez engedelyezi az app szamara a maschines tabla olvasasat/irasat.

alter table public.maschines enable row level security;

drop policy if exists "maschines_select_public" on public.maschines;
drop policy if exists "maschines_insert_public" on public.maschines;
drop policy if exists "maschines_update_public" on public.maschines;
drop policy if exists "maschines_delete_public" on public.maschines;

create policy "maschines_select_public"
  on public.maschines
  for select
  to public
  using (true);

create policy "maschines_insert_public"
  on public.maschines
  for insert
  to public
  with check (true);

create policy "maschines_update_public"
  on public.maschines
  for update
  to public
  using (true)
  with check (true);

create policy "maschines_delete_public"
  on public.maschines
  for delete
  to public
  using (true);
