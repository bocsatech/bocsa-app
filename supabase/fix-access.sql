-- LEGEGYSZERUBB megoldas: kapcsold ki az RLS-t a maschines tablan (fejleszteshez).
-- Másold be a Supabase SQL Editorba és kattints Run.

ALTER TABLE public.maschines DISABLE ROW LEVEL SECURITY;
