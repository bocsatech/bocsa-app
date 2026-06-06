"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import { MACHINE_ADMIN_PERMISSION_DEFS } from "../../lib/machine-permissions";
import { supabase } from "../../lib/supabase";

type AppUser = {
  id: string;
  username: string | null;
};

type PermissionGroup = {
  id: string;
  name: string;
  description: string | null;
};

type Permission = {
  key: string;
  label: string;
  description: string | null;
  category: string;
};

type GroupPermission = {
  group_id: string;
  permission_key: string;
};

type UserGroup = {
  user_id: string;
  group_id: string;
};

type UserPermission = {
  user_id: string;
  permission_key: string;
};

function isMachineAdminPermission(permissionKey: string) {
  return MACHINE_ADMIN_PERMISSION_DEFS.some((def) => def.key === permissionKey);
}

const EXPECTED_MENU_PERMISSIONS: Permission[] = [
  {
    key: "menu.dashboard",
    label: "Menü: Home",
    description: "Home im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.machines",
    label: "Menü: Baumaschinen",
    description: "Baumaschinen-Bereich im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.kunden",
    label: "Menü: PKW",
    description: "PKW/Kunden-Bereich im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.pkw_service",
    label: "Menü: PKW-Service",
    description: "PKW-Service im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.warehouse",
    label: "Menü: Lager",
    description: "Lager-Bereich im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.branches",
    label: "Menü: Filialen",
    description: "Filialen im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.qr",
    label: "Menü: QR-Code",
    description: "QR-Code im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.users",
    label: "Menü: Benutzer",
    description: "Benutzer im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
  {
    key: "menu.groups",
    label: "Menü: Gruppen",
    description: "Gruppen im Seitenmenü anzeigen.",
    category: "Seitenmenü",
  },
];

function isMenuPermission(permissionKey: string) {
  return permissionKey.startsWith("menu.");
}

function isMissingUserPermissionsTable(error: { message?: string } | null) {
  const msg = String(error?.message ?? "");
  return (
    msg.includes("user_permissions") &&
    (msg.includes("Could not find") || msg.includes("does not exist"))
  );
}

function formatGroupsError(message: string) {
  if (
    message.includes("permission_groups_name_key") ||
    message.includes("duplicate key value violates unique constraint")
  ) {
    return "Diese Gruppe existiert bereits — bitte einen anderen Namen wählen.";
  }
  if (isMissingUserPermissionsTable({ message })) {
    return "Tabelle user_permissions fehlt — Benutzerrechte (direkt) sind deaktiviert. Gruppen werden trotzdem geladen. SQL: supabase/user-permissions.sql";
  }
  if (message.includes("does not exist") || message.includes("Could not find")) {
    return `${message}. Bitte supabase/groups-permissions.sql im Supabase SQL Editor ausführen.`;
  }
  return message;
}

function groupNameTaken(groups: PermissionGroup[], name: string) {
  const normalized = name.trim().toLowerCase();
  return groups.some((group) => group.name.trim().toLowerCase() === normalized);
}

export default function GroupsPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<GroupPermission[]>([]);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserForRights, setSelectedUserForRights] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPermissionsHint, setUserPermissionsHint] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

  const usersInSelectedGroup = useMemo(() => {
    if (!selectedGroupId) return [];
    const userIds = new Set(
      userGroups
        .filter((membership) => membership.group_id === selectedGroupId)
        .map((membership) => membership.user_id)
    );
    return users.filter((user) => userIds.has(user.id));
  }, [selectedGroupId, userGroups, users]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      usersResult,
      groupsResult,
      permissionsResult,
      groupPermissionsResult,
      userGroupsResult,
      userPermissionsResult,
    ] = await Promise.all([
      supabase.from("users").select("id, username").order("username", { ascending: true }),
      supabase.from("permission_groups").select("id, name, description").order("name", { ascending: true }),
      supabase.from("permissions").select("key, label, description, category").order("category", { ascending: true }),
      supabase.from("group_permissions").select("group_id, permission_key"),
      supabase.from("user_groups").select("user_id, group_id"),
      supabase.from("user_permissions").select("user_id, permission_key"),
    ]);

    const userPermsMissing = isMissingUserPermissionsTable(userPermissionsResult.error);

    const firstError =
      usersResult.error ??
      groupsResult.error ??
      permissionsResult.error ??
      groupPermissionsResult.error ??
      userGroupsResult.error ??
      (userPermsMissing ? null : userPermissionsResult.error);

    if (firstError) {
      setError(formatGroupsError(firstError.message));
      setUserPermissionsHint(null);
      setUsers([]);
      setGroups([]);
      setPermissions([]);
      setGroupPermissions([]);
      setUserGroups([]);
      setUserPermissions([]);
      setLoading(false);
      return;
    }

    const loadedGroups = (groupsResult.data ?? []) as PermissionGroup[];
    const loadedUsers = (usersResult.data ?? []) as AppUser[];

    setUsers(loadedUsers);
    setGroups(loadedGroups);
    setPermissions((permissionsResult.data ?? []) as Permission[]);
    setGroupPermissions((groupPermissionsResult.data ?? []) as GroupPermission[]);
    setUserGroups((userGroupsResult.data ?? []) as UserGroup[]);
    setUserPermissions(
      userPermsMissing ? [] : ((userPermissionsResult.data ?? []) as UserPermission[])
    );
    setUserPermissionsHint(
      userPermsMissing
        ? "Benutzerrechte (direkt) sind noch nicht eingerichtet. Gruppen & Gruppenrechte funktionieren. Optional: supabase/user-permissions.sql ausführen."
        : null
    );
    setSelectedGroupId((current) => current || loadedGroups[0]?.id || "");
    setSelectedUserForRights((current) => current || loadedUsers[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        const username = String(data?.username ?? "").trim().toLowerCase();
        const groups = Array.isArray(data?.groups) ? data.groups : [];
        setIsAdmin(username === "admin" || groups.includes("Admin"));
      })
      .finally(() => setAdminLoading(false));
  }, []);

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;

    if (groupNameTaken(groups, name)) {
      setError("Diese Gruppe existiert bereits — bitte einen anderen Namen wählen.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("permission_groups")
      .insert({ name, description: newGroupDescription.trim() || null })
      .select("id")
      .single();

    if (error) {
      setError(formatGroupsError(error.message));
    } else {
      setNewGroupName("");
      setNewGroupDescription("");
      await loadData();
      setSelectedGroupId(data.id);
    }

    setSaving(false);
  }

  async function togglePermission(permissionKey: string, enabled: boolean) {
    if (!selectedGroupId) return;
    if ((isMenuPermission(permissionKey) || isMachineAdminPermission(permissionKey)) && !isAdmin) {
      setError("Menü- und Maschinen-Admin-Rechte können nur Admin-Benutzer ändern.");
      return;
    }

    setSaving(true);
    setError(null);

    const request = enabled
      ? supabase.from("group_permissions").insert({
          group_id: selectedGroupId,
          permission_key: permissionKey,
        })
      : supabase
          .from("group_permissions")
          .delete()
          .match({ group_id: selectedGroupId, permission_key: permissionKey });

    const { error } = await request;
    if (error) setError(error.message);
    await loadData();
    setSaving(false);
  }

  async function addUserToGroup() {
    if (!selectedGroupId || !selectedUserId) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from("user_groups").insert({
      group_id: selectedGroupId,
      user_id: selectedUserId,
    });

    if (error) setError(error.message);
    setSelectedUserId("");
    await loadData();
    setSaving(false);
  }

  async function removeUserFromGroup(userId: string) {
    if (!selectedGroupId) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from("user_groups")
      .delete()
      .match({ group_id: selectedGroupId, user_id: userId });

    if (error) setError(error.message);
    await loadData();
    setSaving(false);
  }

  function groupHasPermission(permissionKey: string) {
    return groupPermissions.some(
      (permission) =>
        permission.group_id === selectedGroupId &&
        permission.permission_key === permissionKey
    );
  }

  function userHasDirectPermission(permissionKey: string) {
    return userPermissions.some(
      (permission) =>
        permission.user_id === selectedUserForRights &&
        permission.permission_key === permissionKey
    );
  }

  async function toggleUserPermission(permissionKey: string, enabled: boolean) {
    if (!selectedUserForRights) return;
    if (userPermissionsHint) {
      setError(
        "Benutzerrechte (direkt) erfordern die Tabelle user_permissions — supabase/user-permissions.sql ausführen."
      );
      return;
    }
    if ((isMenuPermission(permissionKey) || isMachineAdminPermission(permissionKey)) && !isAdmin) {
      setError("Menü- und Maschinen-Admin-Rechte können nur Admin-Benutzer ändern.");
      return;
    }

    setSaving(true);
    setError(null);

    const request = enabled
      ? supabase.from("user_permissions").insert({
          user_id: selectedUserForRights,
          permission_key: permissionKey,
        })
      : supabase
          .from("user_permissions")
          .delete()
          .match({ user_id: selectedUserForRights, permission_key: permissionKey });

    const { error: toggleError } = await request;
    if (toggleError) setError(toggleError.message);
    await loadData();
    setSaving(false);
  }

  const permissionsWithMenus = useMemo(() => {
    const map = new Map(permissions.map((permission) => [permission.key, permission]));
    for (const menuPermission of EXPECTED_MENU_PERMISSIONS) {
      if (!map.has(menuPermission.key)) {
        map.set(menuPermission.key, menuPermission);
      }
    }
    for (const machinePermission of MACHINE_ADMIN_PERMISSION_DEFS) {
      if (!map.has(machinePermission.key)) {
        map.set(machinePermission.key, {
          key: machinePermission.key,
          label: machinePermission.label,
          description: machinePermission.description,
          category: "Maschinen",
        });
      }
    }
    return Array.from(map.values());
  }, [permissions]);

  const permissionsByCategory = useMemo(() => {
    return permissionsWithMenus.reduce<Record<string, Permission[]>>((acc, permission) => {
      const category = permission.category || "general";
      acc[category] ??= [];
      acc[category].push(permission);
      return acc;
    }, {});
  }, [permissionsWithMenus]);

  const machinePermissionsForUi = useMemo(() => {
    const keys = new Set<string>(MACHINE_ADMIN_PERMISSION_DEFS.map((def) => def.key));
    return permissionsWithMenus.filter((permission) => keys.has(permission.key));
  }, [permissionsWithMenus]);

  return (
    <AppPageShell
      activeHref="/groups"
      top={
        <header className="pageHeader">
          <div>
            <span className="badge">Rechteverwaltung</span>
            <h1>Gruppen & Rechte</h1>
            <p className="subtitle">
              Rechte an Gruppen vergeben oder einzelnen Benutzern zuweisen. Gruppenrechte und
              Benutzerrechte werden zusammengeführt.
            </p>
          </div>
          <button type="button" className="pillButton outline" onClick={loadData} disabled={saving}>
            Aktualisieren
          </button>
        </header>
      }
    >
        {error ? <div className="protocolNotice">{error}</div> : null}
        {userPermissionsHint ? (
          <div className="protocolNotice" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
            {userPermissionsHint}
          </div>
        ) : null}

        {loading ? (
          <div className="welcomeCard">
            <h1>Laden...</h1>
          </div>
        ) : (
          <div className="permissionsLayout">
            <section className="card groupsPanel">
              <div className="cardHeader">
                <p className="cardTitle">Gruppen</p>
              </div>

              <div className="groupCreateForm">
                <input
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="Neue Gruppe"
                />
                <input
                  value={newGroupDescription}
                  onChange={(event) => setNewGroupDescription(event.target.value)}
                  placeholder="Beschreibung"
                />
                <button type="button" className="pillButton primary" onClick={createGroup} disabled={saving}>
                  Gruppe erstellen
                </button>
              </div>

              <div className="groupList">
                {groups.map((group) => (
                  <button
                    type="button"
                    key={group.id}
                    className={`groupCard ${group.id === selectedGroupId ? "active" : ""}`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <strong>{group.name}</strong>
                    <span>{group.description ?? "Keine Beschreibung"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="card permissionsPanel">
              <div className="cardHeader">
                <div>
                  <p className="cardTitle">{selectedGroup?.name ?? "Keine Gruppe"}</p>
                  <p className="subtitle">{selectedGroup?.description ?? "Gruppe auswaehlen."}</p>
                </div>
              </div>

              <div className="memberBox">
                <h2>Benutzer in dieser Gruppe</h2>
                <div className="memberAssign">
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={!selectedGroupId}
                  >
                    <option value="">Benutzer auswaehlen...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username ?? user.id}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="pillButton outline" onClick={addUserToGroup} disabled={saving}>
                    Hinzufuegen
                  </button>
                </div>

                <div className="memberList">
                  {usersInSelectedGroup.length === 0 ? (
                    <p className="subtitle">Noch keine Benutzer in dieser Gruppe.</p>
                  ) : (
                    usersInSelectedGroup.map((user) => (
                      <div key={user.id} className="memberRow">
                        <span>{user.username ?? user.id}</span>
                        <button type="button" onClick={() => removeUserFromGroup(user.id)} disabled={saving}>
                          Entfernen
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="permissionBox">
                <h2>Gruppenrechte</h2>
                {!adminLoading && !isAdmin ? (
                  <p className="subtitle">Hinweis: Menü-Rechte sind nur für Admin bearbeitbar.</p>
                ) : null}
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category} className="permissionCategory">
                    <h3>{category}</h3>
                    {categoryPermissions.map((permission) => (
                      <label key={permission.key} className="permissionToggle">
                        <input
                          type="checkbox"
                          checked={groupHasPermission(permission.key)}
                          onChange={(event) => togglePermission(permission.key, event.target.checked)}
                          disabled={
                            !selectedGroupId ||
                            saving ||
                            (isMenuPermission(permission.key) && !isAdmin) ||
                            (isMachineAdminPermission(permission.key) && !isAdmin)
                          }
                        />
                        <span>
                          <strong>{permission.label}</strong>
                          <small>{permission.description ?? permission.key}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              <div className="permissionBox userDirectPermissionsBox">
                <h2>Benutzerrechte (direkt)</h2>
                <p className="subtitle">
                  Zusätzlich zu den Gruppen — z. B. nur „Maschine hinzufügen“ für einen Techniker.
                </p>
                <div className="memberAssign">
                  <select
                    value={selectedUserForRights}
                    onChange={(event) => setSelectedUserForRights(event.target.value)}
                  >
                    <option value="">Benutzer auswählen…</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username ?? user.id}
                      </option>
                    ))}
                  </select>
                </div>
                {!adminLoading && !isAdmin ? (
                  <p className="subtitle">Maschinen-Admin-Rechte nur für Admin bearbeitbar.</p>
                ) : null}
                <div className="permissionCategory">
                  <h3>Maschinen (Admin)</h3>
                  {machinePermissionsForUi.map((permission) => (
                    <label key={`user-${permission.key}`} className="permissionToggle">
                      <input
                        type="checkbox"
                        checked={userHasDirectPermission(permission.key)}
                        onChange={(event) =>
                          toggleUserPermission(permission.key, event.target.checked)
                        }
                        disabled={
                          !selectedUserForRights ||
                          saving ||
                          !isAdmin
                        }
                      />
                      <span>
                        <strong>{permission.label}</strong>
                        <small>{permission.description ?? permission.key}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
    </AppPageShell>
  );
}
