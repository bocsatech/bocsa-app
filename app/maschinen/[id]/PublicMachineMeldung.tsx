"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicScrollBody } from "../../../lib/use-mobile-scroll-body";
import MachineStatusIndicators from "../../components/MachineStatusIndicators";
import { formatValue, hasValue } from "../../../lib/machines";
import type { MachineRecord } from "../../../lib/machines";
import type { Machine } from "../../../lib/types/machine";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AppQrNav = {
  onBearbeiten: () => void;
  onZuruck: () => void;
};

type Props = {
  machineId: string;
  appQrNav?: AppQrNav;
};

function AppQrNavBar({ onBearbeiten, onZuruck }: AppQrNav) {
  return (
    <footer
      className="mobileBackBar mobileBackBarAlways"
      role="navigation"
      aria-label="QR-Scan Navigation"
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          width: "100%",
          maxWidth: "22rem",
        }}
      >
        <button
          type="button"
          className="mobileBackBarBtn"
          style={{ flex: 1 }}
          onClick={onZuruck}
        >
          <span className="mobileBackBarIcon" aria-hidden>
            ←
          </span>
          Zurück
        </button>
        <button
          type="button"
          className="mobileBackBarBtn"
          style={{ flex: 1 }}
          onClick={onBearbeiten}
        >
          Bearbeiten
        </button>
      </div>
    </footer>
  );
}

function publicPageStyle(appQrNav?: AppQrNav) {
  return appQrNav
    ? { paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }
    : undefined;
}

function getPublicDocumentUrl(machine: Machine | null, keys: string[]) {
  const tabData = machine?.machine_tab_data;
  if (!tabData || typeof tabData !== "object") return "";

  for (const key of keys) {
    const directValue = (tabData as Record<string, unknown>)[key];
    if (typeof directValue === "string" && directValue.trim()) return directValue.trim();
  }

  const documentation = (tabData as Record<string, unknown>).documentation;
  if (documentation && typeof documentation === "object" && !Array.isArray(documentation)) {
    for (const key of keys) {
      const value = (documentation as Record<string, unknown>)[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return "";
}

export default function PublicMachineMeldung({ machineId, appQrNav }: Props) {
  usePublicScrollBody();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reporter, setReporter] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [imageHint, setImageHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [meldungStatus, setMeldungStatus] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef<File[]>([]);

  const loadMachine = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const response = await fetch(`/api/machines/${machineId}?ts=${Date.now()}`, {
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setLoadError(result?.error ?? "Maschine konnte nicht geladen werden.");
      setMachine(null);
    } else {
      setMachine(result as Machine);
    }

    setLoading(false);
  }, [machineId]);

  useEffect(() => {
    void loadMachine();
  }, [loadMachine]);

  const pruefprotokollUrl = getPublicDocumentUrl(machine, [
    "pruefprotokoll_url",
    "pruefprotokoll",
    "pruefbericht_url",
  ]);
  const betriebsanleitungUrl = getPublicDocumentUrl(machine, [
    "betriebsanleitung_url",
    "betriebsanleitung",
    "operatingManual",
  ]);

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";

    const accepted: File[] = [];
    const warnings: string[] = [];

    for (const file of picked.slice(0, MAX_IMAGES)) {
      if (!file.type.startsWith("image/")) {
        warnings.push(`${file.name}: kein Bild`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        warnings.push(`${file.name}: größer als 5 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (picked.length > MAX_IMAGES) {
      warnings.push(`Max. ${MAX_IMAGES} Bilder`);
    }

    imageFilesRef.current = accepted;
    setImageHint(
      accepted.length
        ? `${accepted.length} Bild(er) ausgewählt`
        : warnings.length
          ? warnings.join(" · ")
          : null
    );
    if (warnings.length && accepted.length) {
      setImageHint(`${accepted.length} Bild(er) · ${warnings.join(" · ")}`);
    }
  }

  async function submitMeldung(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    setSending(true);
    setMeldungStatus(null);

    const formData = new FormData();
    formData.append("reporter", reporter);
    formData.append("contact", contact);
    formData.append("message", message);
    for (const image of imageFilesRef.current) {
      formData.append("images", image);
    }

    try {
      const response = await fetch(`/api/machines/${machineId}/meldung`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMeldungStatus(result.error ?? "Meldung konnte nicht gesendet werden.");
      } else {
        setReporter("");
        setContact("");
        setMessage("");
        imageFilesRef.current = [];
        if (imageInputRef.current) imageInputRef.current.value = "";
        setImageHint(null);
        const imageWarning =
          Array.isArray(result.imageErrors) && result.imageErrors.length
            ? ` Einige Bilder wurden nicht gespeichert: ${result.imageErrors.join(" ")}`
            : "";
        setMeldungStatus(`Meldung wurde gesendet. Danke.${imageWarning}`);
      }
    } catch {
      setMeldungStatus("Netzwerkfehler — bitte erneut versuchen.");
    }

    setSending(false);
  }

  if (loading) {
    return (
      <>
        <main className="publicMachinePage" style={publicPageStyle(appQrNav)}>
          <section className="publicMachineCard">
            <p className="scanHint">Maschinendaten werden geladen…</p>
          </section>
        </main>
        {appQrNav ? <AppQrNavBar {...appQrNav} /> : null}
      </>
    );
  }

  if (loadError || !machine) {
    return (
      <>
        <main className="publicMachinePage" style={publicPageStyle(appQrNav)}>
          <section className="publicMachineCard">
            <h1>Maschine nicht gefunden</h1>
            <p>{loadError ?? "Diese Maschine konnte nicht geladen werden."}</p>
          </section>
        </main>
        {appQrNav ? <AppQrNavBar {...appQrNav} /> : null}
      </>
    );
  }

  return (
    <>
      <main className="publicMachinePage" style={publicPageStyle(appQrNav)}>
      <section className="publicMachineCard">
        <span className="badge">Maschine</span>
        <div className="publicMachineHeader">
          {machine.image ? (
            <img
              className="publicMachineThumb"
              src={machine.image}
              alt={formatValue(machine.geraetenummer)}
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <div className="publicMachineHeaderText">
            <h1>{formatValue(machine.geraetenummer)}</h1>
            {hasValue(machine.bezeichnung) ? (
              <p className="subtitle">{machine.bezeichnung}</p>
            ) : null}
          </div>
        </div>

        <MachineStatusIndicators
          machine={machine as MachineRecord}
          className="publicMachineStatus"
        />

        <div className="publicMachineLinks">
          {pruefprotokollUrl ? (
            <a href={pruefprotokollUrl} target="_blank" rel="noreferrer">
              Prüfprotokoll öffnen
            </a>
          ) : (
            <p>Kein Prüfprotokoll hinterlegt.</p>
          )}
          {betriebsanleitungUrl ? (
            <a href={betriebsanleitungUrl} target="_blank" rel="noreferrer">
              Betriebsanleitung öffnen
            </a>
          ) : (
            <p>Keine Betriebsanleitung hinterlegt.</p>
          )}
        </div>

        <form className="publicMeldungForm" onSubmit={submitMeldung}>
          <h2>Meldung</h2>
          <label>
            <span>Name optional</span>
            <input
              value={reporter}
              onChange={(event) => setReporter(event.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>Kontakt optional</span>
            <input
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
          <label>
            <span>Fehler beschreiben</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              required
            />
          </label>
          <label>
            <span>Bilder optional</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              multiple
              onChange={handleImagesChange}
            />
            <small>Max. 4 Bilder, je 5 MB. JPG, PNG, WEBP, HEIC oder HEIF.</small>
            {imageHint ? <small className="publicMeldungImageHint">{imageHint}</small> : null}
          </label>
          <button className="pillButton primary" type="submit" disabled={sending}>
            {sending ? "Senden…" : "Meldung senden"}
          </button>
          {meldungStatus ? <p className="protocolNotice">{meldungStatus}</p> : null}
        </form>
      </section>
      </main>
      {appQrNav ? <AppQrNavBar {...appQrNav} /> : null}
    </>
  );
}
