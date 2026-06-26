"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import AppPageShell from "../components/AppPageShell";
import GermanDateField from "../components/GermanDateField";
import DirectManagerField, { type SupervisorOption } from "../components/DirectManagerField";
import UserFormField, {
  UserFormSelect,
  UserFormTextInput,
  UserFormTextarea,
  useFormPlaceholder,
} from "../components/UserFormField";
import UserPositionField from "../components/UserPositionField";
import UserProfileMediaFields from "../components/UserProfileMediaFields";
import {
  DEFAULT_USER_FILIALEN,
  userFilialeLabel,
  type UserFilialeCode,
} from "../../lib/user-filiale";
import {
  USER_WORK_AREAS,
  type UserWorkArea,
} from "../../lib/user-stammdaten";
import { isSupervisorPosition } from "../../lib/user-position";
import { useIsLocalhost } from "../../lib/use-is-localhost";

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
  company_mobile?: string | null;
  private_mobile?: string | null;
  company_email?: string | null;
  private_email?: string | null;
  birth_date?: string | null;
  address?: string | null;
  ecard_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  bank_account?: string | null;
  direct_manager?: string | null;
  work_area?: UserWorkArea | null;
  overtime_hours_balance?: number | null;
  is_active?: boolean | null;
};

type ProfileFormState = {
  fullName: string;
  position: string;
  filialeCode: UserFilialeCode | "";
  photoUrl: string;
  signatureUrl: string;
  companyMobile: string;
  privateMobile: string;
  companyEmail: string;
  privateEmail: string;
  birthDate: string;
  address: string;
  ecardNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankAccount: string;
  directManager: string;
  workArea: UserWorkArea | "";
  overtimeHoursBalance: string;
};

const emptyProfileForm = (): ProfileFormState => ({
  fullName: "",
  position: "",
  filialeCode: "",
  photoUrl: "",
  signatureUrl: "",
  companyMobile: "",
  privateMobile: "",
  companyEmail: "",
  privateEmail: "",
  birthDate: "",
  address: "",
  ecardNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankAccount: "",
  directManager: "",
  workArea: "",
  overtimeHoursBalance: "0",
});

function profileFormFromUser(user: UserRow): ProfileFormState {
  return {
    fullName: user.full_name ?? "",
    position: user.position ?? "",
    filialeCode: user.filiale_code ?? "",
    photoUrl: user.photo_url ?? "",
    signatureUrl: user.signature_url ?? "",
    companyMobile: user.company_mobile ?? "",
    privateMobile: user.private_mobile ?? "",
    companyEmail: user.company_email ?? "",
    privateEmail: user.private_email ?? "",
    birthDate: user.birth_date ?? "",
    address: user.address ?? "",
    ecardNumber: user.ecard_number ?? "",
    emergencyContactName: user.emergency_contact_name ?? "",
    emergencyContactPhone: user.emergency_contact_phone ?? "",
    bankAccount: user.bank_account ?? "",
    directManager: user.direct_manager ?? "",
    workArea: user.work_area ?? "",
    overtimeHoursBalance:
      user.overtime_hours_balance === null || user.overtime_hours_balance === undefined
        ? "0"
        : String(user.overtime_hours_balance),
  };
}

function profilePayloadFromForm(form: ProfileFormState) {
  return {
    fullName: form.fullName,
    position: form.position,
    filialeCode: form.filialeCode || null,
    photoUrl: form.photoUrl,
    signatureUrl: form.signatureUrl,
    companyMobile: form.companyMobile,
    privateMobile: form.privateMobile,
    companyEmail: form.companyEmail,
    privateEmail: form.privateEmail,
    birthDate: form.birthDate,
    address: form.address,
    ecardNumber: form.ecardNumber,
    emergencyContactName: form.emergencyContactName,
    emergencyContactPhone: form.emergencyContactPhone,
    bankAccount: form.bankAccount,
    directManager: form.directManager,
    workArea: form.workArea || null,
    overtimeHoursBalance: Number(form.overtimeHoursBalance) || 0,
  };
}

function isUserActive(user: UserRow) {
  return user.is_active !== false;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-AT");
}

type UserProfileFieldsBlockProps = {
  form: ProfileFormState;
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
  onFileError: (message: string) => void;
  showOvertime?: boolean;
  supervisors?: SupervisorOption[];
  excludeUserId?: string | null;
};

function UserProfileFieldsBlock({
  form,
  onChange,
  onFileError,
  showOvertime = false,
  supervisors = [],
  excludeUserId = null,
}: UserProfileFieldsBlockProps) {
  const isLocalhost = useIsLocalhost();
  const birthDatePlaceholder = useFormPlaceholder("Geburtstag (TT.MM.JJJJ)");

  return (
    <>
      <UserFormTextInput
        label="Vollständiger Name"
        value={form.fullName}
        onChange={(value) => onChange("fullName", value)}
      />
      <UserPositionField
        value={form.position}
        onChange={(value) => onChange("position", value)}
        listId={excludeUserId ? `user-position-${excludeUserId}` : "user-position-create"}
      />
      <UserFormSelect
        label="Filiale"
        value={form.filialeCode}
        onChange={(value) => onChange("filialeCode", value as UserFilialeCode | "")}
      >
        <option value="">— keine Filiale —</option>
        {DEFAULT_USER_FILIALEN.map((filiale) => (
          <option key={filiale.code} value={filiale.code}>
            {filiale.label} ({filiale.code})
          </option>
        ))}
      </UserFormSelect>
      <section className="personalFieldsSection">
        <h3 className="personalFieldsSectionTitle">Arbeit</h3>
        <UserFormSelect
          label="Arbeitsbereich"
          value={form.workArea}
          onChange={(value) => onChange("workArea", value as UserWorkArea | "")}
        >
          <option value="">— nicht angegeben —</option>
          {USER_WORK_AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </UserFormSelect>
        <DirectManagerField
          value={form.directManager}
          onChange={(value) => onChange("directManager", value)}
          supervisors={supervisors}
          excludeUserId={excludeUserId}
        />
        <UserFormTextInput
          label="Bankkonto / IBAN"
          value={form.bankAccount}
          onChange={(value) => onChange("bankAccount", value)}
        />
        {showOvertime ? (
          <UserFormTextInput
            label={isLocalhost ? "Urlaub" : "Überstunden (Std.)"}
            type="number"
            step={isLocalhost ? "1" : "0.25"}
            value={form.overtimeHoursBalance}
            onChange={(value) => onChange("overtimeHoursBalance", value)}
          />
        ) : null}
      </section>

      <section className="personalFieldsSection">
        <h3 className="personalFieldsSectionTitle">Kontakt &amp; Persönliches</h3>
        <UserFormTextInput
          label="Firmen-Handynummer"
          type="tel"
          value={form.companyMobile}
          onChange={(value) => onChange("companyMobile", value)}
        />
        <UserFormTextInput
          label="Privat-Handynummer"
          type="tel"
          value={form.privateMobile}
          onChange={(value) => onChange("privateMobile", value)}
        />
        <UserFormTextInput
          label="Firmen-E-Mail"
          type="email"
          value={form.companyEmail}
          onChange={(value) => onChange("companyEmail", value)}
        />
        <UserFormTextInput
          label="Privat-E-Mail"
          type="email"
          value={form.privateEmail}
          onChange={(value) => onChange("privateEmail", value)}
        />
        <UserFormField label="Geburtstag (TT.MM.JJJJ)">
          <GermanDateField
            value={form.birthDate}
            onChange={(value) => onChange("birthDate", value)}
            placeholder={birthDatePlaceholder}
            openPickerOnFocus
            pickerVariant="calendar"
            minYear={new Date().getFullYear() - 100}
            maxYear={new Date().getFullYear()}
          />
        </UserFormField>
        <UserFormTextarea
          label="Adresse"
          value={form.address}
          onChange={(value) => onChange("address", value)}
        />
        <UserFormTextInput
          label="E-Card Nummer"
          value={form.ecardNumber}
          onChange={(value) => onChange("ecardNumber", value)}
        />
      </section>

      <section className="personalFieldsSection">
        <h3 className="personalFieldsSectionTitle">Notfallkontakt</h3>
        <UserFormTextInput
          label="Name"
          value={form.emergencyContactName}
          onChange={(value) => onChange("emergencyContactName", value)}
        />
        <UserFormTextInput
          label="Handynummer"
          type="tel"
          value={form.emergencyContactPhone}
          onChange={(value) => onChange("emergencyContactPhone", value)}
        />
      </section>
    </>
  );
}

function wrapLocalhostMainFields(isLocalhost: boolean, content: ReactNode) {
  if (!isLocalhost) return content;
  return <div className="userProfileFormMainFields">{content}</div>;
}

export default function UsersPage() {
  const isLocalhost = useIsLocalhost();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newSecretPin, setNewSecretPin] = useState("");
  const [newProfile, setNewProfile] = useState<ProfileFormState>(emptyProfileForm);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editSecretPin, setEditSecretPin] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProfile, setEditProfile] = useState<ProfileFormState>(emptyProfileForm);

  function updateNewProfile<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setNewProfile((current) => ({ ...current, [key]: value }));
  }

  function updateEditProfile<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setEditProfile((current) => ({ ...current, [key]: value }));
  }

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
  const supervisorOptions: SupervisorOption[] = users
    .filter((user) => isUserActive(user) && isSupervisorPosition(user.position))
    .map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      position: user.position,
    }));
  const userFormClassName = `groupCreateForm userCreateForm${
    isLocalhost ? " userCreateFormLabeled userCreateForm--localhost" : ""
  }`;

  useEffect(() => {
    if (!selectedUser) return;
    setEditUsername(selectedUser.username ?? "");
    setEditProfile(profileFormFromUser(selectedUser));
    setEditSecretPin(
      selectedUser.secret_pin === null || selectedUser.secret_pin === undefined
        ? ""
        : String(selectedUser.secret_pin)
    );
    setEditPassword("");
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
        ...profilePayloadFromForm(newProfile),
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
    setNewProfile(emptyProfileForm());
    setShowCreateForm(false);
    setCreateMessage(`Benutzer „${data.user?.username ?? username}" wurde angelegt.`);
    await loadUsers();
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
        secretPin: pin === "" ? undefined : Number(pin),
        password: editPassword || undefined,
        ...profilePayloadFromForm(editProfile),
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
    if (data.user) {
      setEditProfile(profileFormFromUser(data.user as UserRow));
    }
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
            <form className={userFormClassName} onSubmit={handleCreateUser}>
              <div className={`userProfileFormLayout${isLocalhost ? " userProfileFormLayout--single" : ""}`}>
                <div className={`userProfileFormFields${isLocalhost ? " userProfileFormFields--withHeadMedia" : ""}`}>
                  {wrapLocalhostMainFields(
                    isLocalhost,
                    <>
                      <UserFormTextInput
                        label="Benutzername"
                        value={newUsername}
                        onChange={setNewUsername}
                        autoComplete="username"
                        required
                      />
                      <UserFormTextInput
                        label="Passwort (min. 6 Zeichen)"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        autoComplete="new-password"
                        minLength={6}
                        required
                      />
                      <UserFormTextInput
                        label="Geheimzahl (0–99)"
                        value={newSecretPin}
                        onChange={(value) => setNewSecretPin(value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        pattern="[0-9]{1,2}"
                        maxLength={2}
                        required
                      />
                      <UserProfileFieldsBlock
                        form={newProfile}
                        onChange={updateNewProfile}
                        onFileError={setCreateMessage}
                        showOvertime
                        supervisors={supervisorOptions}
                      />
                    </>
                  )}
                  {isLocalhost ? (
                    <UserProfileMediaFields
                      mode="inline"
                      grouped
                      idPrefix="user-create"
                      photoUrl={newProfile.photoUrl}
                      signatureUrl={newProfile.signatureUrl}
                      onPhotoChange={(value) => updateNewProfile("photoUrl", value)}
                      onSignatureChange={(value) => updateNewProfile("signatureUrl", value)}
                      onError={setCreateMessage}
                    />
                  ) : null}
                </div>
                {!isLocalhost ? (
                  <UserProfileMediaFields
                    mode="aside"
                    idPrefix="user-create"
                    photoUrl={newProfile.photoUrl}
                    signatureUrl={newProfile.signatureUrl}
                    onPhotoChange={(value) => updateNewProfile("photoUrl", value)}
                    onSignatureChange={(value) => updateNewProfile("signatureUrl", value)}
                    onError={setCreateMessage}
                  />
                ) : null}
              </div>
              <button type="submit" className="pillButton primary" disabled={creating}>
                {creating ? "Wird angelegt..." : "Benutzer speichern"}
              </button>
            </form>
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
            <div
              className={`serviceTable usersTable${isLocalhost ? " usersTableWithPosition" : ""}`}
            >
              <div className="serviceRow headerRow">
                <span>Benutzername</span>
                <span>Status</span>
                {isLocalhost ? <span>Position</span> : null}
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
                    {isLocalhost ? <span>{user.position?.trim() || "—"}</span> : null}
                    <span>{userFilialeLabel(user.filiale_code)}</span>
                    <span>{formatDate(user.created_at)}</span>
                    <span className="code">{user.id}</span>
                  </div>
                ))
              )}
            </div>
          </article>
        )}

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
            <form className={userFormClassName} onSubmit={handleSaveUserProfile}>
              <div className={`userProfileFormLayout${isLocalhost ? " userProfileFormLayout--single" : ""}`}>
                <div className={`userProfileFormFields${isLocalhost ? " userProfileFormFields--withHeadMedia" : ""}`}>
                  {wrapLocalhostMainFields(
                    isLocalhost,
                    <>
                      <UserFormTextInput
                        label="Benutzername"
                        value={editUsername}
                        onChange={setEditUsername}
                        autoComplete="username"
                        required
                      />
                      <UserProfileFieldsBlock
                        form={editProfile}
                        onChange={updateEditProfile}
                        onFileError={setSaveMessage}
                        showOvertime
                        supervisors={supervisorOptions}
                        excludeUserId={selectedUser.id}
                      />
                      <section className="personalFieldsSection">
                        <h3 className="personalFieldsSectionTitle">Zugang</h3>
                        <UserFormTextInput
                          label="Geheimzahl (0–99)"
                          value={editSecretPin}
                          onChange={(value) => setEditSecretPin(value.replace(/\D/g, ""))}
                          inputMode="numeric"
                          pattern="[0-9]{1,2}"
                          maxLength={2}
                        />
                        <UserFormTextInput
                          label="Neues Passwort (leer = unverändert)"
                          type="password"
                          value={editPassword}
                          onChange={setEditPassword}
                          autoComplete="new-password"
                        />
                      </section>
                    </>
                  )}
                  {isLocalhost ? (
                    <UserProfileMediaFields
                      mode="inline"
                      grouped
                      idPrefix={`user-edit-${selectedUser.id}`}
                      photoUrl={editProfile.photoUrl}
                      signatureUrl={editProfile.signatureUrl}
                      onPhotoChange={(value) => updateEditProfile("photoUrl", value)}
                      onSignatureChange={(value) => updateEditProfile("signatureUrl", value)}
                      onError={setSaveMessage}
                    />
                  ) : null}
                </div>
                {!isLocalhost ? (
                  <UserProfileMediaFields
                    mode="aside"
                    idPrefix={`user-edit-${selectedUser.id}`}
                    photoUrl={editProfile.photoUrl}
                    signatureUrl={editProfile.signatureUrl}
                    onPhotoChange={(value) => updateEditProfile("photoUrl", value)}
                    onSignatureChange={(value) => updateEditProfile("signatureUrl", value)}
                    onError={setSaveMessage}
                  />
                ) : null}
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
      </section>
    </AppPageShell>
  );
}
