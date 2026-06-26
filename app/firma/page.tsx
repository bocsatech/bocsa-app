"use client";

import { useCallback, useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import { EMPTY_FIRMA, type FirmaData } from "../../lib/firma";
import "./firma.css";

function applyFirma(setters: {
  setName: (v: string) => void;
  setContactName: (v: string) => void;
  setContactPhone: (v: string) => void;
  setEmail: (v: string) => void;
  setWebsite: (v: string) => void;
  setStreet: (v: string) => void;
  setPostalCode: (v: string) => void;
  setCity: (v: string) => void;
  setCountry: (v: string) => void;
  setTaxNumber: (v: string) => void;
  setCompanyRegisterNumber: (v: string) => void;
  setBankName: (v: string) => void;
  setIban: (v: string) => void;
  setBic: (v: string) => void;
  setNotes: (v: string) => void;
}, firma: FirmaData) {
  setters.setName(firma.name);
  setters.setContactName(firma.contactName);
  setters.setContactPhone(firma.contactPhone);
  setters.setEmail(firma.email);
  setters.setWebsite(firma.website);
  setters.setStreet(firma.street);
  setters.setPostalCode(firma.postalCode);
  setters.setCity(firma.city);
  setters.setCountry(firma.country);
  setters.setTaxNumber(firma.taxNumber);
  setters.setCompanyRegisterNumber(firma.companyRegisterNumber);
  setters.setBankName(firma.bankName);
  setters.setIban(firma.iban);
  setters.setBic(firma.bic);
  setters.setNotes(firma.notes);
}

export default function FirmaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Österreich");
  const [taxNumber, setTaxNumber] = useState("");
  const [companyRegisterNumber, setCompanyRegisterNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [notes, setNotes] = useState("");

  const setters = {
    setName,
    setContactName,
    setContactPhone,
    setEmail,
    setWebsite,
    setStreet,
    setPostalCode,
    setCity,
    setCountry,
    setTaxNumber,
    setCompanyRegisterNumber,
    setBankName,
    setIban,
    setBic,
    setNotes,
  };

  const loadFirma = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/firma", {
      credentials: "include",
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Firmendaten konnten nicht geladen werden.");
      applyFirma(setters, EMPTY_FIRMA);
      setLoading(false);
      return;
    }

    applyFirma(setters, result.firma ?? EMPTY_FIRMA);
    setUpdatedAt(result.updatedAt ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFirma();
  }, [loadFirma]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload: FirmaData = {
      name,
      contactName,
      contactPhone,
      email,
      website,
      street,
      postalCode,
      city,
      country,
      taxNumber,
      companyRegisterNumber,
      bankName,
      iban,
      bic,
      notes,
    };

    const response = await fetch("/api/firma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ firma: payload }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Speichern fehlgeschlagen.");
    } else {
      applyFirma(setters, result.firma ?? payload);
      setMessage("Firmendaten gespeichert.");
      setUpdatedAt(new Date().toISOString());
    }

    setSaving(false);
  }

  function formatUpdatedAt(value: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("de-AT");
  }

  return (
    <AppPageShell activeHref="/firma" subtitle="Betrieb">
      <div className="firmaPage">
        <header className="pageHeader">
          <div>
            <span className="badge">Einstellungen</span>
            <h1>Firma</h1>
            <p className="subtitle">Firmendaten für Rechnungen, Protokolle und Korrespondenz.</p>
          </div>
          <button type="button" className="pillButton outline" onClick={() => loadFirma()}>
            Aktualisieren
          </button>
        </header>

        {message ? <p className="protocolNotice">{message}</p> : null}
        {error ? <p className="protocolNotice">{error}</p> : null}

        <section className="card">
          <div className="cardHeader">
            <p className="cardTitle">Stammdaten</p>
            {updatedAt ? (
              <p className="scanHint">Zuletzt gespeichert: {formatUpdatedAt(updatedAt)}</p>
            ) : null}
          </div>

          {loading ? (
            <p className="scanHint">Firmendaten werden geladen…</p>
          ) : (
            <form onSubmit={handleSave}>
              <div className="firmaFormGrid">
                <label className="protocolField protocolField--full">
                  <span>Firmenname</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>Ansprechpartner</span>
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>Telefon</span>
                  <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>E-Mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="office@example.com"
                  />
                </label>

                <label className="protocolField">
                  <span>Webseite</span>
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />
                </label>

                <label className="protocolField protocolField--full">
                  <span>Straße / Hausnummer</span>
                  <input value={street} onChange={(e) => setStreet(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>PLZ</span>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>Ort</span>
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>Land</span>
                  <input value={country} onChange={(e) => setCountry(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>UID / Steuernummer</span>
                  <input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>Firmenbuchnummer</span>
                  <input
                    value={companyRegisterNumber}
                    onChange={(e) => setCompanyRegisterNumber(e.target.value)}
                  />
                </label>

                <label className="protocolField">
                  <span>Bankname</span>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>IBAN</span>
                  <input value={iban} onChange={(e) => setIban(e.target.value)} />
                </label>

                <label className="protocolField">
                  <span>BIC</span>
                  <input value={bic} onChange={(e) => setBic(e.target.value)} />
                </label>

                <label className="protocolField protocolField--full">
                  <span>Anmerkungen</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>

              <div className="firmaFormActions">
                <button type="submit" className="pillButton primary" disabled={saving}>
                  {saving ? "Speichern…" : "Speichern"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </AppPageShell>
  );
}
