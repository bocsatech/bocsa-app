"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";

type Meldung = {
  id: string;
  machineId: string;
  geraetenummer: string | null;
  bezeichnung: string | null;
  message: string;
  reporter?: string | null;
  contact?: string | null;
  images?: string[];
  imageErrors?: string[];
  emailDelivery?: {
    status?: string;
    recipients?: string[];
    error?: string;
  };
  status?: string;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-AT");
}

function formatEmailDelivery(delivery: NonNullable<Meldung["emailDelivery"]>) {
  if (delivery.status === "sent") {
    return `gesendet an ${(delivery.recipients ?? []).join(", ")}`;
  }

  if (delivery.status === "missing_api_key") {
    return "nicht gesendet, RESEND_API_KEY fehlt";
  }

  if (delivery.status === "disabled") {
    return "nicht aktiv";
  }

  if (delivery.status === "failed") {
    return `Fehler: ${delivery.error ?? "unbekannt"}`;
  }

  return delivery.status ?? "-";
}

function parseRecipients(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function MeldungenPage() {
  const [meldungen, setMeldungen] = useState<Meldung[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recipients = parseRecipients(email);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [meldungenResponse, settingsResponse] = await Promise.all([
      fetch("/api/meldungen", { cache: "no-store", credentials: "include" }),
      fetch("/api/meldungen/settings", { cache: "no-store", credentials: "include" }),
    ]);

    const meldungenResult = await meldungenResponse.json().catch(() => []);
    const settingsResult = await settingsResponse.json().catch(() => ({}));

    if (!meldungenResponse.ok) {
      setError(meldungenResult.error ?? "Meldungen konnten nicht geladen werden.");
      setMeldungen([]);
    } else {
      setMeldungen(meldungenResult as Meldung[]);
    }

    if (settingsResponse.ok) {
      setEmail(settingsResult.email ?? "");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/meldungen/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Einstellungen konnten nicht gespeichert werden.");
    } else {
      setEmail(result.email ?? "");
      setMessage("Einstellungen gespeichert.");
    }

    setSaving(false);
  }

  async function deleteMeldung(meldung: Meldung) {
    if (!window.confirm("Meldung wirklich löschen?")) return;

    setDeletingId(meldung.id);
    setMessage(null);
    setError(null);

    const response = await fetch("/api/meldungen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ machineId: meldung.machineId, meldungId: meldung.id }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Meldung konnte nicht gelöscht werden.");
    } else {
      setMeldungen((current) => current.filter((item) => item.id !== meldung.id));
      setMessage("Meldung gelöscht.");
    }

    setDeletingId(null);
  }

  return (
    <AppPageShell
      activeHref="/meldungen"
      top={
        <header className="pageHeader">
          <div>
            <span className="badge">Meldungen</span>
            <h1>QR Meldungen</h1>
            <p className="subtitle">Störungsmeldungen aus der öffentlichen QR-Ansicht.</p>
          </div>
          <button type="button" className="pillButton outline" onClick={loadData}>
            Aktualisieren
          </button>
        </header>
      }
    >
        <section className="card meldungSettingsCard">
          <div className="cardHeader">
            <p className="cardTitle">E-Mail Benachrichtigung</p>
          </div>
          <label className="protocolField">
            <span>Empfänger E-Mail(s)</span>
            <textarea
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={"technik@example.com\nwerkstatt@example.com"}
              rows={3}
            />
          </label>
          <button type="button" className="pillButton primary" onClick={saveSettings} disabled={saving}>
            {saving ? "Speichern..." : "Speichern"}
          </button>
          <p className="scanHint">
            Mehrere Adressen mit Komma oder neuer Zeile trennen. Für den Versand muss zusätzlich <code>RESEND_API_KEY</code> in Vercel gesetzt sein.
          </p>
          {recipients.length ? (
            <div className="meldungRecipients">
              <strong>Aktuelle Empfänger:</strong>
              {recipients.map((recipient) => (
                <span key={recipient}>{recipient}</span>
              ))}
            </div>
          ) : (
            <p className="scanHint">Aktuell sind keine Empfänger gespeichert.</p>
          )}
        </section>

        {message ? <p className="protocolNotice">{message}</p> : null}
        {error ? <p className="protocolNotice">{error}</p> : null}

        <section className="card">
          <div className="cardHeader">
            <p className="cardTitle">Eingegangene Meldungen ({meldungen.length})</p>
          </div>

          {loading ? (
            <p className="scanHint">Meldungen werden geladen...</p>
          ) : meldungen.length ? (
            <div className="meldungList">
              {meldungen.map((meldung) => (
                <article key={`${meldung.machineId}-${meldung.id}`} className="meldungCard">
                  <div className="meldungCardHeader">
                    <div>
                      <strong>{meldung.geraetenummer ?? "Maschine"}</strong>
                      {meldung.bezeichnung ? <span>{meldung.bezeichnung}</span> : null}
                    </div>
                    <div className="meldungActions">
                      <Link className="pillButton outline" href={`/maschinen/${meldung.machineId}`}>
                        Maschine öffnen
                      </Link>
                      <button
                        type="button"
                        className="pillButton outline dangerButton"
                        onClick={() => deleteMeldung(meldung)}
                        disabled={deletingId === meldung.id}
                      >
                        {deletingId === meldung.id ? "Löschen..." : "Löschen"}
                      </button>
                    </div>
                  </div>
                  <p>{meldung.message}</p>
                  <div className="meldungMeta">
                    <span>{formatDate(meldung.createdAt)}</span>
                    {meldung.reporter ? <span>Name: {meldung.reporter}</span> : null}
                    {meldung.contact ? <span>Kontakt: {meldung.contact}</span> : null}
                    {meldung.status ? <span>Status: {meldung.status}</span> : null}
                    {meldung.emailDelivery ? (
                      <span>
                        E-Mail: {formatEmailDelivery(meldung.emailDelivery)}
                      </span>
                    ) : null}
                  </div>
                  {meldung.images?.length ? (
                    <div className="meldungImages">
                      {meldung.images.map((image) => (
                        <a key={image} href={image} target="_blank" rel="noreferrer" title="Bild öffnen">
                          <img
                            src={image}
                            alt="Meldung Bild"
                            loading="lazy"
                            decoding="async"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                          <span>Bild öffnen</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {meldung.imageErrors?.length ? (
                    <div className="meldungImageErrors">
                      {meldung.imageErrors.map((imageError, index) => (
                        <span key={`${meldung.id}-image-error-${index}`}>{imageError}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="scanHint">Noch keine Meldungen vorhanden.</p>
          )}
        </section>
    </AppPageShell>
  );
}
