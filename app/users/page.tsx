"use client";

import { useCallback, useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import {
  DEFAULT_USER_FILIALEN,
  userFilialeLabel,
  type UserFilialeCode,
} from "../../lib/user-filiale";

type UserRow = {
  id: string;
  username: string | null;
  created_at: string | null;
  secret_pin?: number | null;
  full_name?: string | null;
  position?: string | null;
  site?: string | null;
  filiale_code?: UserFilialeCode | null;
  photo_url?: string | null;
  signature_url?: string | null;
  is_active?: boolean | null;
};

function isUserActive(user: UserRow) {
  return user.is_active !== false;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-AT");
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSecretPin, setNewSecretPin] = useState("");
  const [newFilialeCode, setNewFilialeCode] = useState<UserFilialeCode | "">("");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editSite, setEditSite] = useState("");
  const [editFilialeCode, setEditFilialeCode] = useState<UserFilialeCode | "">("");
  const [editSecretPin, setEditSecretPin] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editSignatureUrl, setEditSignatureUrl] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/users", {
      credentials: "include",
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Benutzer konnten nicht geladen werden.");
      setUsers([]);
    } else {
      setUsers((result.users ?? []) as UserRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedUserId && users.length) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  useEffect(() => {
    if (!selectedUser) return;
    setEditUsername(selectedUser.username ?? "");
    setEditFullName(selectedUser.full_name ?? "");
    setEditPosition(selectedUser.position ?? "");
    setEditSite(selectedUser.site ?? "");
    setEditFilialeCode(selectedUser.filiale_code ?? "");
    setEditSecretPin(
      selectedUser.secret_pin === null || selectedUser.secret_pin === undefined
        ? ""
        : String(selectedUser.secret_pin)
    );
    setEditPassword("");
    setEditPhotoUrl(selectedUser.photo_url ?? "");
    setEditSignatureUrl(selectedUser.signature_url ?? "");
  }, [selectedUserId, selectedUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    async function loadSession() {
      const response = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        setCanWrite(false);
        return;
      }
      const data = await response.json();
      const permissions: string[] = Array.isArray(data.permissions) ? data.permissions : [];
      const groups: string[] = Array.isArray(data.groups) ? data.groups : [];
      const username =
        typeof data.user?.username === "string" ? data.user.username.trim().toLowerCase() : "";
      const userId = typeof data.user?.id === "string" ? data.user.id : null;

      setCurrentUserId(userId);
      setCanWrite(
        data.canManageUsers === true ||
          permissions.includes("users.write") ||
          groups.includes("Admin") ||
          username === "admin"
      );
    }

    loadSession();
  }, []);

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setCreateMessage(null);

    const username = newUsername.trim();
    const password = newPassword;
    const secretPin = Number(newSecretPin);

    if (!username || !password) {
      setCreateMessage("Benutzername und Passwort sind erforderlich.");
      return;
    }

    if (!Number.isInteger(secretPin) || secretPin < 0 || secretPin > 99) {
      setCreateMessage("Geheimzahl muss eine ganze Zahl zwischen 0 und 99 sein.");
      return;
    }

    setCreating(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        password,
        secretPin,
        filialeCode: newFilialeCode || null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      setCreateMessage(data.error ?? "Benutzer konnte nicht angelegt werden.");
      return;
    }

    setNewUsername("");
    setNewPassword("");
    setNewSecretPin("");
    setNewFilialeCode("");
    setShowCreateForm(false);
    setCreateMessage(`Benutzer „${data.user?.username ?? username}" wurde angelegt.`);
    await loadUsers();
  }

  async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
      reader.readAsDataURL(file);
    });
  }

  async function handleSaveUserProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setSaveMessage(null);

    const pin = editSecretPin.trim();
    if (pin && (!/^\d{1,2}$/.test(pin) || Number(pin) < 0 || Number(pin) > 99)) {
      setSaveMessage("Geheimzahl muss eine ganze Zahl zwischen 0 und 99 sein.");
      return;
    }
    if (editPassword && editPassword.length < 6) {
      setSaveMessage("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    const username = editUsername.trim();
    if (!username) {
      setSaveMessage("Benutzername darf nicht leer sein.");
      return;
    }

    setSavingProfile(true);
    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        fullName: editFullName,
        position: editPosition,
        site: editSite,
        filialeCode: editFilialeCode || null,
        secretPin: pin === "" ? undefined : Number(pin),
        password: editPassword || undefined,
        photoUrl: editPhotoUrl,
        signatureUrl: editSignatureUrl,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingProfile(false);
    if (!response.ok) {
      setSaveMessage(data.error ?? "Benutzerdaten konnten nicht gespeichert werden.");
      return;
    }
    setSaveMessage("Benutzerdaten gespeichert.");
    setEditPassword("");
    await loadUsers();
  }

  async function handleToggleActive() {
    if (!selectedUser) return;
    setSaveMessage(null);
    setTogglingActive(true);

    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: !isUserActive(selectedUser) }),
    });
    const data = await response.json().catch(() => ({}));
    setTogglingActive(false);

    if (!response.ok) {
      setSaveMessage(data.error ?? "Status konnte nicht geändert werden.");
      return;
    }

    setSaveMessage(
      isUserActive(selectedUser)
        ? "Benutzer wurde deaktiviert."
        : "Benutzer wurde aktiviert."
    );
    await loadUsers();
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    const label = selectedUser.username ?? selectedUser.id;
    if (
      !window.confirm(
        `Benutzer „${label}" wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      )
    ) {
      return;
    }

    setSaveMessage(null);
    setDeletingUser(true);
    const response = await fetch(`/api/users/${selectedUser.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    setDeletingUser(false);

    if (!response.ok) {
      setSaveMessage(data.error ?? "Benutzer konnte nicht gelöscht werden.");
      return;
    }

    setSelectedUserId(null);
    setSaveMessage(`Benutzer „${label}" wurde gelöscht.`);
    await loadUsers();
  }

  return (
    <AppPageShell
      activeHref="/users"
      top={
        <header className="pageHeader">
          <div>
            <span className="badge">Benutzer</span>
            <h1>Benutzer</h1>
            <p className="subtitle">Benutzer anlegen und verwalten.</p>
          </div>
          <div className="pageHeaderActions">
            {canWrite ? (
              <button
                type="button"
                className="pillButton primary"
                onClick={() => {
                  setShowCreateForm((value) => !value);
                  setCreateMessage(null);
                }}
              >
                {showCreateForm ? "Abbrechen" : "+ Benutzer anlegen"}
              </button>
            ) : null}
            <button type="button" className="pillButton outline" onClick={loadUsers} disabled={loading}>
              Aktualisieren
            </button>
          </div>
        </header>
      }
    >
      <section className="usersPageContent">
        {createMessage ? (
          <p className={createMessage.includes("angelegt") ? "protocolNotice success" : "protocolNotice"}>
            {createMessage}
          </p>
        ) : null}

        {showCreateForm && canWrite ? (
          <article className="card userCreateCard usersPanel">
            <div className="cardHeader">
              <p className="cardTitle">Neuer Benutzer</p>
            </div>
            <form className="groupCreateForm userCreateForm" onSubmit={handleCreateUser}>
              <input
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="Benutzername"
                autoComplete="username"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Passwort (min. 6 Zeichen)"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <input
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={newSecretPin}
                onChange={(event) => setNewSecretPin(event.target.value.replace(/\D/g, ""))}
                placeholder="Geheimzahl (0–99)"
                required
              />
              <label className="userFilialeField">
                <span>Filiale</span>
                <select
                  value={newFilialeCode}
                  onChange={(event) =>
                    setNewFilialeCode(event.target.value as UserFilialeCode | "")
                  }
                >
                  <option value="">— keine Filiale —</option>
                  {DEFAULT_USER_FILIALEN.map((filiale) => (
                    <option key={filiale.code} value={filiale.code}>
                      {filiale.label} ({filiale.code})
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="pillButton primary" disabled={creating}>
                {creating ? "Wird angelegt..." : "Benutzer speichern"}
              </button>
            </form>
          </article>
        ) : null}

        {selectedUser && canWrite ? (
          <article className="card userCreateCard usersPanel usersEditPanel">
            <div className="cardHeader usersEditHeader">
              <p className="cardTitle">Benutzer bearbeiten</p>
              <span
                className={`usersStatusBadge ${
                  isUserActive(selectedUser) ? "isActive" : "isInactive"
                }`}
              >
                {isUserActive(selectedUser) ? "Aktiv" : "Deaktiviert"}
              </span>
            </div>
            {saveMessage ? (
              <p
                className={
                  saveMessage.includes("gespeichert") ||
                  saveMessage.includes("aktiviert") ||
                  saveMessage.includes("deaktiviert") ||
                  saveMessage.includes("gelöscht")
                    ? "protocolNotice success"
                    : "protocolNotice"
                }
              >
                {saveMessage}
              </p>
            ) : null}
            <form className="groupCreateForm userCreateForm" onSubmit={handleSaveUserProfile}>
              <input
                value={editUsername}
                onChange={(event) => setEditUsername(event.target.value)}
                placeholder="Benutzername"
                autoComplete="username"
                required
              />
              <input
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                placeholder="Vollständiger Name"
              />
              <input
                value={editPosition}
                onChange={(event) => setEditPosition(event.target.value)}
                placeholder="Position / Funktion"
              />
              <label className="userFilialeField">
                <span>Filiale</span>
                <select
                  value={editFilialeCode}
                  onChange={(event) =>
                    setEditFilialeCode(event.target.value as UserFilialeCode | "")
                  }
                >
                  <option value="">— keine Filiale —</option>
                  {DEFAULT_USER_FILIALEN.map((filiale) => (
                    <option key={filiale.code} value={filiale.code}>
                      {filiale.label} ({filiale.code})
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={editSite}
                onChange={(event) => setEditSite(event.target.value)}
                placeholder="Standort / Werkstatt (optional)"
              />
              <input
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={editSecretPin}
                onChange={(event) => setEditSecretPin(event.target.value.replace(/\D/g, ""))}
                placeholder="Geheimzahl (0–99)"
              />
              <input
                type="password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
                placeholder="Neues Passwort (leer = unverändert)"
                autoComplete="new-password"
              />
              <div className="fieldRow documentationFieldRow" style={{ gridColumn: "1 / -1" }}>
                <span>Benutzerfoto</span>
                <div className="documentUploadControls documentUploadControlsCompact">
                  <div className="documentUploadActions">
                    {editPhotoUrl ? (
                      <img
                        src={editPhotoUrl}
                        alt="Benutzerfoto"
                        className="publicMachineThumb"
                        style={{ width: 72, height: 72 }}
                      />
                    ) : (
                      <span className="documentEmptyHint">Kein Foto hinterlegt.</span>
                    )}
                    <label className="pillButton outline documentUploadButton">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          try {
                            const dataUrl = await fileToDataUrl(file);
                            setEditPhotoUrl(dataUrl);
                          } catch {
                            setSaveMessage("Foto konnte nicht gelesen werden.");
                          }
                        }}
                      />
                      Foto auswählen
                    </label>
                  </div>
                </div>
              </div>
              <div className="fieldRow documentationFieldRow" style={{ gridColumn: "1 / -1" }}>
                <span>Unterschrift (Prüfprotokoll)</span>
                <div className="documentUploadControls documentUploadControlsCompact">
                  <div className="documentUploadActions">
                    {editSignatureUrl ? (
                      <img
                        src={editSignatureUrl}
                        alt="Unterschrift"
                        style={{ maxWidth: 220, maxHeight: 72, objectFit: "contain" }}
                      />
                    ) : (
                      <span className="documentEmptyHint">Keine Unterschrift hinterlegt.</span>
                    )}
                    <label className="pillButton outline documentUploadButton">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (!file) return;
                          try {
                            const dataUrl = await fileToDataUrl(file);
                            setEditSignatureUrl(dataUrl);
                          } catch {
                            setSaveMessage("Unterschrift konnte nicht gelesen werden.");
                          }
                        }}
                      />
                      Unterschrift auswählen
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="pillButton primary" disabled={savingProfile}>
                {savingProfile ? "Speichern..." : "Benutzer aktualisieren"}
              </button>
            </form>
            <div className="usersDangerActions">
              <button
                type="button"
                className="pillButton outline"
                disabled={togglingActive || deletingUser}
                onClick={() => void handleToggleActive()}
              >
                {togglingActive
                  ? "Wird geändert..."
                  : isUserActive(selectedUser)
                    ? "Deaktivieren"
                    : "Aktivieren"}
              </button>
              <button
                type="button"
                className="pillButton danger"
                disabled={
                  deletingUser ||
                  togglingActive ||
                  selectedUser.id === currentUserId
                }
                title={
                  selectedUser.id === currentUserId
                    ? "Eigener Benutzer kann nicht gelöscht werden."
                    : undefined
                }
                onClick={() => void handleDeleteUser()}
              >
                {deletingUser ? "Wird gelöscht..." : "Benutzer löschen"}
              </button>
            </div>
          </article>
        ) : null}

        {loading ? (
          <div className="welcomeCard">
            <h1>Laden...</h1>
          </div>
        ) : error ? (
          <div className="welcomeCard">
            <h1>Fehler</h1>
            <p>{error}</p>
            {error.includes("users") && error.includes("fehlt") ? (
              <p>
                Führen Sie zuerst <code>supabase/users-setup.sql</code> im Supabase SQL Editor aus.
              </p>
            ) : error.includes("filiale_code") ? (
              <p>
                Für Filiale (S/H/W): <code>supabase/users-filiale-patch.sql</code> im Supabase SQL
                Editor ausführen.
              </p>
            ) : null}
          </div>
        ) : (
          <article className="card usersPanel usersListPanel">
            <div className="cardHeader">
              <p className="cardTitle">Benutzer ({users.length})</p>
            </div>
            <div className="serviceTable usersTable">
              <div className="serviceRow headerRow">
                <span>Benutzername</span>
                <span>Status</span>
                <span>Filiale</span>
                <span>Erstellt am</span>
                <span>ID</span>
              </div>
              {users.length === 0 ? (
                <p className="scanHint userTableEmpty">Noch keine Benutzer vorhanden.</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className={`serviceRow usersTableRow ${
                      selectedUserId === user.id ? "isSelected" : ""
                    } ${!isUserActive(user) ? "isInactiveUser" : ""}`}
                    style={{ cursor: canWrite ? "pointer" : "default" }}
                    onClick={() => {
                      if (canWrite) {
                        setSelectedUserId(user.id);
                        setSaveMessage(null);
                      }
                    }}
                  >
                    <span>{user.username ?? "-"}</span>
                    <span>
                      <span
                        className={`usersStatusBadge compact ${
                          isUserActive(user) ? "isActive" : "isInactive"
                        }`}
                      >
                        {isUserActive(user) ? "Aktiv" : "Inaktiv"}
                      </span>
                    </span>
                    <span>{userFilialeLabel(user.filiale_code)}</span>
                    <span>{formatDate(user.created_at)}</span>
                    <span className="code">{user.id}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        )}
      </section>
    </AppPageShell>
  );
}
