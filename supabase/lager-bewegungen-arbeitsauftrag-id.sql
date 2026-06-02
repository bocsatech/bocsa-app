-- Arbeitsauftrag-UUID in Lagerbewegungen (direkter Link)
-- Supabase SQL Editor → Run

alter table public.lager_bewegungen
  add column if not exists arbeitsauftrag_id text;

create index if not exists lager_bewegungen_arbeitsauftrag_idx
  on public.lager_bewegungen (arbeitsauftrag_id)
  where arbeitsauftrag_id is not null;
