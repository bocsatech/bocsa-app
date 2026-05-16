-- Admin-Benutzer der Admin-Gruppe zuweisen (falls der + Benutzer anlegen Button fehlt)
insert into public.user_groups (user_id, group_id)
select u.id, g.id
from public.users u
cross join public.permission_groups g
where lower(u.username) = 'admin' and g.name = 'Admin'
on conflict do nothing;

notify pgrst, 'reload schema';
