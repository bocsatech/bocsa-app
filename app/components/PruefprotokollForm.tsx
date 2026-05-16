"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../pruefprotokoll/pruefprotokoll.css";
import AppPageShell from "./AppPageShell";
import {
  PRUEFPROTOKOLL_SECTIONS,
  createEmptyPruefprotokoll,
  getPruefprotokolle,
  machineToGeraetedaten,
  mergePruefprotokoll,
  normalizePruefprotokoll,
  type Pruefprotokoll,
  type PruefprotokollCheckItem,
} from "../../lib/pruefprotokoll";
import { fetchMachineById, updateMachine } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machineId: string;
  protokollId?: string | null;
};

export default function PruefprotokollForm({ machineId, protokollId }: Props) {
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [protokoll, setProtokoll] = useState<Pruefprotokoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [username, setUsername] = useState("");
  const [userSignatureUrl, setUserSignatureUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNew = !protokollId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [machineRes, sessionRes] = await Promise.all([
      fetchMachineById(machineId),
      fetch("/api/auth/session", { cache: "no-store", credentials: "include" }),
    ]);

    const session = await sessionRes.json().catch(() => ({}));
    setUsername(session.username ?? "");
    setCanWrite(Boolean(session.permissions?.includes("machines.write")));
    setUserSignatureUrl(
      typeof session.profile?.signatureUrl === "string"
        ? session.profile.signatureUrl
        : null
    );

    const { data, error: loadError } = machineRes;
    if (loadError || !data) {
      setError(loadError?.message ?? "Maschine nicht gefunden.");
      setMachine(null);
      setProtokoll(null);
      setLoading(false);
      return;
    }

    setMachine(data);
    const existing = protokollId
      ? getPruefprotokolle(data).find((item) => item.id === protokollId)
      : null;

    if (protokollId && !existing) {
      setError("Prüfprotokoll nicht gefunden.");
      setProtokoll(null);
    } else if (existing) {
      setProtokoll(normalizePruefprotokoll(existing, data));
    } else {
      setProtokoll(createEmptyPruefprotokoll(data, session.username));
    }

    setLoading(false);
  }, [machineId, protokollId]);

  useEffect(() => {
    load();
  }, [load]);

  const checklistBySection = useMemo(() => {
    if (!protokoll) return new Map<string, PruefprotokollCheckItem[]>();
    const map = new Map<string, PruefprotokollCheckItem[]>();
    for (const section of PRUEFPROTOKOLL_SECTIONS) {
      map.set(
        section.id,
        protokoll.checklist.filter((item) => item.sectionId === section.id)
      );
    }
    return map;
  }, [protokoll]);

  function updateGeraet(field: keyof Pruefprotokoll["geraetedaten"], value: string) {
    setProtokoll((current) =>
      current
        ? {
            ...current,
            geraetedaten: { ...current.geraetedaten, [field]: value },
            pruefdatum:
              field === "pruefdatum" ? value : current.pruefdatum,
          }
        : current
    );
  }

  function toggleCheck(code: string) {
    setProtokoll((current) =>
      current
        ? {
            ...current,
            checklist: current.checklist.map((item) =>
              item.code === code ? { ...item, checked: !item.checked } : item
            ),
          }
        : current
    );
  }

  function updateErgebnis<K extends keyof Pruefprotokoll["ergebnis"]>(
    field: K,
    value: Pruefprotokoll["ergebnis"][K]
  ) {
    setProtokoll((current) =>
      current ? { ...current, ergebnis: { ...current.ergebnis, [field]: value } } : current
    );
  }

  async function handleSave() {
    if (!machine || !protokoll || !canWrite) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    const toSave = normalizePruefprotokoll(
      {
        ...protokoll,
        pruefdatum: protokoll.geraetedaten.pruefdatum,
        geraetedaten: machineToGeraetedaten(machine, protokoll.geraetedaten),
        ergebnis: {
          ...protokoll.ergebnis,
          unterschriftUrl:
            protokoll.ergebnis.unterschriftUrl || userSignatureUrl || null,
        },
      },
      machine
    );

    const protokollUrl = `/pruefprotokoll/form?machineId=${encodeURIComponent(
      machine.id
    )}&protokollId=${encodeURIComponent(toSave.id)}`;
    const mergedTabData = mergePruefprotokoll(machine, toSave, username);
    const mergedDocumentation =
      mergedTabData.documentation && typeof mergedTabData.documentation === "object"
        ? {
            ...(mergedTabData.documentation as Record<string, unknown>),
            pruefprotokoll: protokollUrl,
          }
        : { pruefprotokoll: protokollUrl };

    const { data, error: saveErr } = await updateMachine(machine.id, {
      machine_tab_data: {
        ...mergedTabData,
        pruefprotokoll_url: protokollUrl,
        documentation: mergedDocumentation,
      },
    });

    setSaving(false);

    if (saveErr) {
      setError(saveErr.message);
      return;
    }

    if (data) {
      setMachine(data);
      const saved =
        getPruefprotokolle(data).find((item) => item.id === toSave.id) ?? toSave;
      setProtokoll(saved);
      setMessage("Prüfprotokoll gespeichert.");
      if (isNew) {
        router.replace(
          `/pruefprotokoll/form?machineId=${encodeURIComponent(machineId)}&protokollId=${encodeURIComponent(saved.id)}`
        );
      }
    }
  }

  function handlePrint() {
    document.body.classList.add("ppPrinting");
    window.print();
    window.setTimeout(() => document.body.classList.remove("ppPrinting"), 500);
  }

  if (!machine || !protokoll) {
    if (loading) {
      return (
        <AppPageShell activeHref="/pruefprotokoll">
          <p className="scanHint">Laden…</p>
        </AppPageShell>
      );
    }

    return (
      <AppPageShell
        activeHref="/pruefprotokoll"
        top={
          <div className="detailTopBar noPrint">
            <h1>Prüfprotokoll</h1>
          </div>
        }
      >
        <p className="protocolNotice">{error ?? "Prüfprotokoll nicht verfügbar."}</p>
        <Link className="pillButton outline noPrint" href="/pruefprotokoll">
          Zur Liste
        </Link>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell
      activeHref="/pruefprotokoll"
      mainClassName="protocolShell ppShell"
      contentClassName="protocolPage ppPage"
      top={
        <div className="detailTopBar noPrint">
          <div>
            <h1>§ 11 AM-VO Prüfprotokoll</h1>
            <p className="subtitle">
              {protokoll.geraetedaten.geraetenummer || machine.geraetenummer}
            </p>
          </div>
          <div className="detailTopActions">
            <button
              type="button"
              className="pillButton primary"
              disabled={saving || !canWrite}
              onClick={handleSave}
            >
              {saving ? "Speichern…" : "Speichern"}
            </button>
            <button type="button" className="pillButton outline" onClick={handlePrint}>
              Drucken
            </button>
            <Link className="pillButton outline" href="/pruefprotokoll">
              Zur Liste
            </Link>
            <Link className="pillButton outline" href={`/maschinen/${machineId}`}>
              Maschine
            </Link>
          </div>
        </div>
      }
    >
      <div className="ppScroll">
        <article className="ppSheet">
          <header className="ppSheetHeader">
            <div>
              <h2>§ 11 AM-VO selbstfahrende Arbeitsmittel</h2>
              <p>Mängelaufnahme · Prüfprotokoll</p>
            </div>
            <div className="ppLogo" aria-hidden />
          </header>

          <h3 className="ppSectionTitle">1. Gerätedaten</h3>
          <div className="ppGeraetGrid">
            <label className="ppField">
              <span>Betreiber / Maschineneigner</span>
              <input
                value={protokoll.geraetedaten.betreiber}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("betreiber", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Baujahr</span>
              <input
                value={protokoll.geraetedaten.baujahr}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("baujahr", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Maschinenart</span>
              <input
                value={protokoll.geraetedaten.maschinenart}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("maschinenart", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Prüfdatum</span>
              <input
                value={protokoll.geraetedaten.pruefdatum}
                readOnly={!canWrite}
                placeholder="TT.MM.JJJJ"
                onChange={(e) => updateGeraet("pruefdatum", e.target.value)}
              />
            </label>
            <label className="ppField ppFieldManual">
              <span>Betr. Std. / km</span>
              <input
                value={protokoll.geraetedaten.betrStdKm}
                readOnly={!canWrite}
                placeholder="manuell eintragen"
                onChange={(e) => updateGeraet("betrStdKm", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Hersteller / Typ</span>
              <input
                value={protokoll.geraetedaten.herstellerTyp}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("herstellerTyp", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Datum letzte Prüfung</span>
              <input
                value={protokoll.geraetedaten.datumLetztePruefung}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("datumLetztePruefung", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Fahrgestellnummer</span>
              <input
                value={protokoll.geraetedaten.fahrgestellnummer}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("fahrgestellnummer", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Seriennummer</span>
              <input
                value={protokoll.geraetedaten.seriennummer}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("seriennummer", e.target.value)}
              />
            </label>
            <label className="ppField">
              <span>Gerätenummer</span>
              <input
                value={protokoll.geraetedaten.geraetenummer}
                readOnly={!canWrite}
                onChange={(e) => updateGeraet("geraetenummer", e.target.value)}
              />
            </label>
          </div>

          <h3 className="ppSectionTitle">2. Mängelaufnahme</h3>
          <div className="ppCheckSections">
            {PRUEFPROTOKOLL_SECTIONS.map((section) => (
              <div key={section.id} className="ppCheckSection">
                <h4>
                  {section.id} {section.title}
                </h4>
                <ul className="ppCheckList">
                  {(checklistBySection.get(section.id) ?? []).map((item) => (
                    <li key={item.code} className="ppCheckItem">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        disabled={!canWrite}
                        onChange={() => toggleCheck(item.code)}
                      />
                      <span>{item.label}</span>
                      <code>{item.code}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="ppSectionTitle">3. Prüfergebnis</h3>
          <div className="ppErgebnisGrid">
            <label>
              <input
                type="checkbox"
                checked={protokoll.ergebnis.entsprichtJa}
                disabled={!canWrite}
                onChange={(e) => updateErgebnis("entsprichtJa", e.target.checked)}
              />
              Entspricht den Erfordernissen (JA)
            </label>
            <label className="ppField">
              <span>Prüfplakette Nr.</span>
              <input
                value={protokoll.ergebnis.plaketteNr}
                readOnly={!canWrite}
                onChange={(e) => updateErgebnis("plaketteNr", e.target.value)}
              />
            </label>
            <label className="ppTextarea">
              <span>Nicht entsprechend wegen der Mängel</span>
              <textarea
                value={protokoll.ergebnis.maengelText}
                readOnly={!canWrite}
                onChange={(e) => updateErgebnis("maengelText", e.target.value)}
              />
            </label>
            <label className="ppTextarea">
              <span>Behobene Mängel im Zuge der Begutachtung</span>
              <textarea
                value={protokoll.ergebnis.behobeneMaengel}
                readOnly={!canWrite}
                onChange={(e) => updateErgebnis("behobeneMaengel", e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={protokoll.ergebnis.arbeitnehmerInformiert}
                disabled={!canWrite}
                onChange={(e) =>
                  updateErgebnis("arbeitnehmerInformiert", e.target.checked)
                }
              />
              Arbeitnehmer über Mängel informiert
            </label>
            <label className="ppField">
              <span>Ort der Prüfung</span>
              <input
                value={protokoll.ergebnis.ortDerPruefung}
                readOnly={!canWrite}
                onChange={(e) => updateErgebnis("ortDerPruefung", e.target.value)}
              />
            </label>
            <div className="ppSignBox">
              {protokoll.ergebnis.unterschriftUrl ? (
                <img
                  src={protokoll.ergebnis.unterschriftUrl}
                  alt="Unterschrift"
                  style={{ maxHeight: 52, maxWidth: "100%", objectFit: "contain" }}
                />
              ) : (
                "Unterschrift nicht hinterlegt"
              )}
            </div>
          </div>
        </article>

        {message ? <p className="protocolNotice success noPrint">{message}</p> : null}
        {error ? <p className="protocolNotice noPrint">{error}</p> : null}
      </div>
    </AppPageShell>
  );
}
