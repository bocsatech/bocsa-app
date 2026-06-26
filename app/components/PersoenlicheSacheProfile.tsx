"use client";

import { useCallback, useEffect, useState } from "react";
import GermanDateField from "./GermanDateField";
import DirectManagerField, { type SupervisorOption } from "./DirectManagerField";
import UserPositionField from "./UserPositionField";
import UserProfileMediaFields from "./UserProfileMediaFields";
import UserFormField, { UserFormSelect, UserFormTextInput, UserFormTextarea } from "./UserFormField";
import {
  DEFAULT_USER_FILIALEN,
  type UserFilialeCode,
} from "../../lib/user-filiale";
import {
  USER_WORK_AREAS,
  type UserWorkArea,
} from "../../lib/user-stammdaten";
import { useIsLocalhost } from "../../lib/use-is-localhost";

type UrlaubStats = {
  year: number;
  taken: number;
  planned: number;
  remaining: number;
  annualDays: number;
  formatted?: {
    taken: string;
    planned: string;
    remaining: string;
    annualDays: string;
  };
};

type UserRow = {
  id: string;
  username: string | null;
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
};

export default function PersoenlicheSacheProfile() {
  const isLocalhost = useIsLocalhost();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserRow | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editFilialeCode, setEditFilialeCode] = useState<UserFilialeCode | "">("");
  const [editSecretPin, setEditSecretPin] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [editSignatureUrl, setEditSignatureUrl] = useState("");
  const [editCompanyMobile, setEditCompanyMobile] = useState("");
  const [editPrivateMobile, setEditPrivateMobile] = useState("");
  const [editCompanyEmail, setEditCompanyEmail] = useState("");
  const [editPrivateEmail, setEditPrivateEmail] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEcardNumber, setEditEcardNumber] = useState("");
  const [editEmergencyContactName, setEditEmergencyContactName] = useState("");
  const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState("");
  const [editBankAccount, setEditBankAccount] = useState("");
  const [editDirectManager, setEditDirectManager] = useState("");
  const [editWorkArea, setEditWorkArea] = useState<UserWorkArea | "">("");
  const [urlaubStats, setUrlaubStats] = useState<UrlaubStats | null>(null);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);

  const applyUser = useCallback((row: UserRow, stats?: { urlaub?: UrlaubStats; overtimeHours?: number }) => {
    setUser(row);
    setEditFullName(row.full_name ?? "");
    setEditPosition(row.position ?? "");
    setEditFilialeCode(row.filiale_code ?? "");
    setEditSecretPin(
      row.secret_pin === null || row.secret_pin === undefined ? "" : String(row.secret_pin)
    );
    setEditPassword("");
    setEditPhotoUrl(row.photo_url ?? "");
    setEditSignatureUrl(row.signature_url ?? "");
    setEditCompanyMobile(row.company_mobile ?? "");
    setEditPrivateMobile(row.private_mobile ?? "");
    setEditCompanyEmail(row.company_email ?? "");
    setEditPrivateEmail(row.private_email ?? "");
    setEditBirthDate(row.birth_date ?? "");
    setEditAddress(row.address ?? "");
    setEditEcardNumber(row.ecard_number ?? "");
    setEditEmergencyContactName(row.emergency_contact_name ?? "");
    setEditEmergencyContactPhone(row.emergency_contact_phone ?? "");
    setEditBankAccount(row.bank_account ?? "");
    setEditDirectManager(row.direct_manager ?? "");
    setEditWorkArea(row.work_area ?? "");
    if (stats?.urlaub) setUrlaubStats(stats.urlaub);
    if (stats?.overtimeHours !== undefined) setOvertimeHours(stats.overtimeHours);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/users/me", {
      credentials: "include",
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(
        typeof result.error === "string" && result.error.trim()
          ? result.error
          : `Profil konnte nicht geladen werden. (${response.status})`
      );
      setUser(null);
      setLoading(false);
      return;
    }

    if (!result.user || typeof result.user !== "object") {
      setError("Profil konnte nicht geladen werden. (Ungültige Server-Antwort)");
      setUser(null);
      setLoading(false);
      return;
    }

    applyUser(result.user as UserRow, {
      urlaub: result.urlaub as UrlaubStats | undefined,
      overtimeHours: typeof result.overtimeHours === "number" ? result.overtimeHours : 0,
    });
    setLoading(false);
  }, [applyUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    async function loadSupervisors() {
      const response = await fetch("/api/users/supervisors", {
        credentials: "include",
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setSupervisors(Array.isArray(result.supervisors) ? result.supervisors : []);
    }

    void loadSupervisors();
  }, []);

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
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

    setSavingProfile(true);
    const response = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName: editFullName,
        position: editPosition,
        filialeCode: editFilialeCode || null,
        secretPin: pin === "" ? undefined : Number(pin),
        password: editPassword || undefined,
        photoUrl: editPhotoUrl,
        signatureUrl: editSignatureUrl,
        companyMobile: editCompanyMobile,
        privateMobile: editPrivateMobile,
        companyEmail: editCompanyEmail,
        privateEmail: editPrivateEmail,
        birthDate: editBirthDate,
        address: editAddress,
        ecardNumber: editEcardNumber,
        emergencyContactName: editEmergencyContactName,
        emergencyContactPhone: editEmergencyContactPhone,
        bankAccount: editBankAccount,
        directManager: editDirectManager,
        workArea: editWorkArea || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingProfile(false);

    if (!response.ok) {
      setSaveMessage(data.error ?? "Daten konnten nicht gespeichert werden.");
      return;
    }

    setSaveMessage("Gespeichert.");
    setEditPassword("");
    applyUser(data.user as UserRow, {
      urlaub: data.urlaub as UrlaubStats | undefined,
      overtimeHours: typeof data.overtimeHours === "number" ? data.overtimeHours : overtimeHours,
    });
  }

  if (loading) {
    return (
      <div className="welcomeCard">
        <h2>Laden…</h2>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="welcomeCard">
        <h2>Fehler</h2>
        <p>{error ?? "Profil nicht verfügbar."}</p>
      </div>
    );
  }

  return (
    <>
      <div className="stammdatenOverview">
        <article className="stammdatenStatCard">
          <h3>Urlaub {urlaubStats?.year ?? new Date().getFullYear()}</h3>
          <div className="stammdatenStatGrid">
            <div className="stammdatenStatRow">
              <span>Genommen</span>
              <strong>{urlaubStats?.formatted?.taken ?? urlaubStats?.taken ?? 0}</strong>
            </div>
            <div className="stammdatenStatRow">
              <span>Geplant / reserviert</span>
              <strong>{urlaubStats?.formatted?.planned ?? urlaubStats?.planned ?? 0}</strong>
            </div>
            <div className="stammdatenStatRow">
              <span>Übrig</span>
              <strong>{urlaubStats?.formatted?.remaining ?? urlaubStats?.remaining ?? 0}</strong>
            </div>
          </div>
          <p className="stammdatenStatHint">
            Kontingent {urlaubStats?.formatted?.annualDays ?? urlaubStats?.annualDays ?? 25} Tage —
            Planung unter Menüpunkt Urlaub.
          </p>
        </article>

        <article className="stammdatenStatCard">
          <h3>Überstunden</h3>
          <div className="stammdatenStatGrid">
            <div className="stammdatenStatRow">
              <span>Verfügbar</span>
              <strong>{overtimeHours} Std.</strong>
            </div>
          </div>
          <p className="stammdatenStatHint">Saldo wird von der Verwaltung gepflegt.</p>
        </article>
      </div>

      <article className="card userCreateCard usersPanel usersEditPanel">
      <div className="cardHeader">
        <p className="cardTitle">
          Stammdaten: <strong>{user.username ?? "—"}</strong>
        </p>
      </div>
      {saveMessage ? (
        <p
          className={
            saveMessage.includes("Gespeichert") ? "protocolNotice success" : "protocolNotice"
          }
        >
          {saveMessage}
        </p>
      ) : null}
      <form
        className="groupCreateForm userCreateForm userCreateFormLabeled userCreateForm--labeled"
        onSubmit={handleSaveProfile}
      >
        <UserFormTextInput
          label="Vollständiger Name"
          value={editFullName}
          onChange={setEditFullName}
        />
        <UserPositionField
          value={editPosition}
          onChange={setEditPosition}
          listId="stammdaten-position"
          readOnly={isLocalhost}
        />
        <UserFormSelect
          label="Filiale"
          value={editFilialeCode}
          onChange={(value) => setEditFilialeCode(value as UserFilialeCode | "")}
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
            value={editWorkArea}
            onChange={(value) => setEditWorkArea(value as UserWorkArea | "")}
          >
            <option value="">— nicht angegeben —</option>
            {USER_WORK_AREAS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </UserFormSelect>
          <DirectManagerField
            value={editDirectManager}
            onChange={setEditDirectManager}
            supervisors={supervisors}
            excludeUserId={user.id}
          />
          <UserFormTextInput
            label="Bankkonto / IBAN"
            value={editBankAccount}
            onChange={setEditBankAccount}
          />
        </section>

        <section className="personalFieldsSection">
          <h3 className="personalFieldsSectionTitle">Kontakt &amp; Persönliches</h3>
          <UserFormTextInput
            label="Firmen-Handynummer"
            type="tel"
            value={editCompanyMobile}
            onChange={setEditCompanyMobile}
          />
          <UserFormTextInput
            label="Privat-Handynummer"
            type="tel"
            value={editPrivateMobile}
            onChange={setEditPrivateMobile}
          />
          <UserFormTextInput
            label="Firmen-E-Mail"
            type="email"
            value={editCompanyEmail}
            onChange={setEditCompanyEmail}
          />
          <UserFormTextInput
            label="Privat-E-Mail"
            type="email"
            value={editPrivateEmail}
            onChange={setEditPrivateEmail}
          />
          <UserFormField label="Geburtstag (TT.MM.JJJJ)">
            <GermanDateField
              value={editBirthDate}
              onChange={setEditBirthDate}
              placeholder=""
              openPickerOnFocus
              pickerVariant="calendar"
              minYear={new Date().getFullYear() - 100}
              maxYear={new Date().getFullYear()}
            />
          </UserFormField>
          <UserFormTextarea label="Adresse" value={editAddress} onChange={setEditAddress} />
          <UserFormTextInput
            label="E-Card Nummer"
            value={editEcardNumber}
            onChange={setEditEcardNumber}
          />
        </section>

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

        <section className="personalFieldsSection">
          <h3 className="personalFieldsSectionTitle">Notfallkontakt</h3>
          <UserFormTextInput
            label="Name"
            value={editEmergencyContactName}
            onChange={setEditEmergencyContactName}
          />
          <UserFormTextInput
            label="Handynummer"
            type="tel"
            value={editEmergencyContactPhone}
            onChange={setEditEmergencyContactPhone}
          />
        </section>

        <UserProfileMediaFields
          mode="inline"
          idPrefix={`stammdaten-${user.id}`}
          photoUrl={editPhotoUrl}
          signatureUrl={editSignatureUrl}
          onPhotoChange={setEditPhotoUrl}
          onSignatureChange={setEditSignatureUrl}
          onError={setSaveMessage}
        />
        <button type="submit" className="pillButton primary" disabled={savingProfile}>
          {savingProfile ? "Speichern…" : "Stammdaten speichern"}
        </button>
      </form>
    </article>
    </>
  );
}
