-- Entfernt gespeicherte Arbeitsprotokolle / Aufträge und zugehörige Rechte.
-- Im Supabase SQL Editor ausführen.

-- Gespeicherte Aufträge in machine_tab_data löschen
update public.maschines
set machine_tab_data = machine_tab_data - 'work_orders'
where machine_tab_data ? 'work_orders';

-- Lager-Bewegungen: Verknüpfung zu Aufträgen entfernen
alter table public.lager_bewegungen drop column if exists work_order_id;

-- Berechtigungen
delete from public.group_permissions
where permission_key in ('protocol.read', 'protocol.write', 'menu.protocol');

delete from public.permissions
where key in ('protocol.read', 'protocol.write', 'menu.protocol');

update public.permissions
set description = 'Teile aus dem Lager ausbuchen.'
where key = 'warehouse.issue';

notify pgrst, 'reload schema';
