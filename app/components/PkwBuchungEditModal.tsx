"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MaintenanceLagerParts from "./MaintenanceLagerParts";
import {
  BUCHUNG_STATUS_LABELS,
  createPkwBuchung,
  createPkwServiceArt,
  fetchPkwSlots,
  fetchPkwTeam,
  normalizeKennzeichen,
  PKW_SERVICE_HOURS,
  dateYmdLocal,
  updatePkwBuchung,
} from "../../lib/pkw";
import { getPkwErsatzteile, serializePkwErsatzteile } from "../../lib/pkw-ersatzteile";
import type { MaintenanceLagerLink } from "../../lib/types/maintenance";
import type {
  PkwBuchung,
  PkwBuchungStatus,
  PkwFahrzeug,
  PkwMunkafolyamatSchritt,
  PkwServiceArt,
  PkwSlotOption,
  PkwTeamUser,
} from "../../lib/types/pkw";

const PLAETZE = [1, 2, 3, 4, 5];
const STATUS_OPTIONS: PkwBuchungStatus[] = [
  "angefragt",
  "bestaetigt",
  "in_arbeit",
  "fertig",
  "abgesagt",
];

function slotDayFromIso(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function newSchritt(text = ""): PkwMunkafolyamatSchritt {
  return { id: crypto.randomUUID(), text, erledigt: false };
}

type Props = {
  open: boolean;
  buchung: PkwBuchung | null;
  servicearten: PkwServiceArt[];
  fahrzeuge?: PkwFahrzeug[];
  defaultDay?: string;
  onClose: () => void;
  onSaved: (buchung: PkwBuchung) => void;
  onServiceartenChange: (list: PkwServiceArt[]) => void;
};

export default function PkwBuchungEditModal({
  open,
  buchung,
  servicearten,
  fahrzeuge = [],
  defaultDay,
  onClose,
  onSaved,
  onServiceartenChange,
}: Props) {
  const isNew = !buchung;
  const todayYmd = dateYmdLocal();
  const originalDay = buchung ? slotDayFromIso(buchung.slot_start) : "";
  const dateInputMin =
    isNew || !originalDay || originalDay >= todayYmd ? todayYmd : originalDay;

  const [kennzeichen, setKennzeichen] = useState("");
  const [kmStand, setKmStand] = useState("");
  const [day, setDay] = useState(defaultDay ?? "");
  const [slotStart, setSlotStart] = useState("");
  const [platz, setPlatz] = useState<number | "">("");
  const [status, setStatus] = useState<PkwBuchungStatus>("bestaetigt");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [problemText, setProblemText] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [schritte, setSchritte] = useState<PkwMunkafolyamatSchritt[]>([]);
  const [slots, setSlots] = useState<PkwSlotOption[]>([]);
  const [team, setTeam] = useState<PkwTeamUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newServiceLabel, setNewServiceLabel] = useState("");
  const [ersatzteile, setErsatzteile] = useState<MaintenanceLagerLink[]>([]);

  const matchedFahrzeug = useMemo(() => {
    if (buchung?.fahrzeug_id) {
      const byId = fahrzeuge.find((f) => f.id === buchung.fahrzeug_id);
      if (byId) return byId;
    }
    const kz = normalizeKennzeichen(kennzeichen);
    if (!kz) return null;
    return fahrzeuge.find((f) => normalizeKennzeichen(f.kennzeichen) === kz) ?? null;
  }, [buchung?.fahrzeug_id, fahrzeuge, kennzeichen]);

  const resetFromBuchung = useCallback(() => {
    if (!buchung) {
      setKennzeichen("");
      setKmStand("");
      setDay(defaultDay ?? "");
      setSlotStart("");
      setPlatz("");
      setStatus("bestaetigt");
      setSelectedServices([]);
      setProblemText("");
      setInternalNotes("");
      setAssignedUserId("");
      setSchritte([newSchritt()]);
      return;
    }
    setKennzeichen(buchung.kennzeichen);
    setKmStand(buchung.km_stand != null ? String(buchung.km_stand) : "");
    setDay(slotDayFromIso(buchung.slot_start));
    setSlotStart(buchung.slot_start);
    setPlatz(buchung.platz_nummer ?? "");
    setStatus(buchung.status);
    setSelectedServices(buchung.servicearten ?? []);
    setProblemText(buchung.problem_text ?? "");
    setInternalNotes(buchung.internal_notes ?? "");
    setAssignedUserId(buchung.assigned_user_id ?? "");
    const steps = buchung.munkafolyamat ?? [];
    setSchritte(steps.length ? steps : [newSchritt()]);
  }, [buchung, defaultDay]);

  useEffect(() => {
    if (!open) return;
    if (matchedFahrzeug) {
      setErsatzteile(getPkwErsatzteile(matchedFahrzeug));
    } else {
      setErsatzteile([]);
    }
  }, [open, matchedFahrzeug]);

  useEffect(() => {
    if (!open) return;
    resetFromBuchung();
    setError(null);
    fetchPkwTeam().then(({ data }) => {
      if (data) setTeam(data);
    });
  }, [open, resetFromBuchung]);

  useEffect(() => {
    if (!open || !day) return;
    fetchPkwSlots(day).then(({ data }) => setSlots(data ?? []));
  }, [open, day]);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("appModalOpen");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("appModalOpen");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.start === slotStart) ?? null,
    [slots, slotStart]
  );

  async function handleAddService() {
    const label = newServiceLabel.trim();
    if (!label) return;
    const { data, error: err } = await createPkwServiceArt({ label });
    if (err || !data) {
      setError(err ?? "Leistung konnte nicht angelegt werden.");
      return;
    }
    const next = [...servicearten, data].sort((a, b) => a.sort_order - b.sort_order);
    onServiceartenChange(next);
    setSelectedServices((cur) => [...cur, data.key]);
    setNewServiceLabel("");
  }

  async function handleSave() {
    setError(null);
    if (!kennzeichen.trim()) {
      setError("Kennzeichen erforderlich.");
      return;
    }
    if (!slotStart || !selectedSlot) {
      setError("Bitte Datum und Termin (07:00–17:00) wählen.");
      return;
    }
    if (isNew && day < todayYmd) {
      setError("Termine in der Vergangenheit sind nicht möglich.");
      return;
    }
    if (!selectedSlot.available && slotStart !== buchung?.slot_start) {
      setError("Dieser Termin ist nicht mehr verfügbar.");
      return;
    }
    const slotChanged = !buchung || selectedSlot.start !== buchung.slot_start;
    if (slotChanged && new Date(selectedSlot.start).getTime() < Date.now()) {
      setError("Termine in der Vergangenheit sind nicht möglich.");
      return;
    }

    const payload = {
      kennzeichen: kennzeichen.trim(),
      km_stand: kmStand !== "" ? Number(kmStand) : null,
      slot_start: selectedSlot.start,
      slot_end: selectedSlot.end,
      platz_nummer: platz !== "" ? Number(platz) : null,
      status,
      servicearten: selectedServices,
      problem_text: problemText.trim() || null,
      internal_notes: internalNotes.trim() || null,
      assigned_user_id: assignedUserId || null,
      munkafolyamat: schritte
        .map((s) => ({ ...s, text: s.text.trim() }))
        .filter((s) => s.text.length > 0),
      fahrzeug_id: matchedFahrzeug?.id ?? buchung?.fahrzeug_id ?? null,
      kunde_id: matchedFahrzeug?.kunde_id ?? buchung?.kunde_id ?? null,
      ...(matchedFahrzeug
        ? { ersatzteile: serializePkwErsatzteile(ersatzteile) }
        : {}),
    };

    setSaving(true);
    if (isNew) {
      const { data, error: err } = await createPkwBuchung(payload);
      setSaving(false);
      if (err || !data) {
        setError(err ?? "Termin konnte nicht angelegt werden.");
        return;
      }
      onSaved(data);
      onClose();
      return;
    }

    const { data, error: err } = await updatePkwBuchung(buchung.id, {
      ...payload,
      ...(platz === "" && payload.slot_start !== buchung.slot_start ? { auto_platz: true } : {}),
    });
    setSaving(false);
    if (err || !data) {
      setError(err ?? "Speichern fehlgeschlagen.");
      return;
    }
    onSaved(data);
    onClose();
  }

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="qrModalBackdrop machineAddModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pkw-buchung-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="machineAddModal pkwBuchungModal machineDetailPage"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="machineAddModalHeader">
          <div>
            <h2 id="pkw-buchung-modal-title" className="machineAddModalTitle">
              {isNew ? "Neuer Termin" : "Termin bearbeiten"}
            </h2>
            <p className="subtitle scanHint">
              Werkstattzeit {PKW_SERVICE_HOURS.von}:00–{PKW_SERVICE_HOURS.bis}:00 Uhr
            </p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="machineDetailBody pkwBuchungModalBody">
          <div className="pkwFormGrid pkwBuchungFormGrid">
            <label className="pkwField">
              <span>Kennzeichen *</span>
              <input value={kennzeichen} onChange={(e) => setKennzeichen(e.target.value)} />
            </label>
            <label className="pkwField">
              <span>KM-Stand</span>
              <input
                type="number"
                value={kmStand}
                onChange={(e) => setKmStand(e.target.value)}
              />
            </label>
            <label className="pkwField">
              <span>Datum *</span>
              <input
                type="date"
                value={day}
                min={dateInputMin}
                onChange={(e) => {
                  const next = e.target.value;
                  setDay(next);
                  if (next !== day) setSlotStart("");
                }}
              />
            </label>
            <label className="pkwField">
              <span>Uhrzeit *</span>
              <select value={slotStart} onChange={(e) => setSlotStart(e.target.value)}>
                <option value="">— wählen —</option>
                {slots.map((slot) => (
                  <option key={slot.start} value={slot.start} disabled={!slot.available && slot.start !== slotStart}>
                    {slot.label}
                    {!slot.available && slot.start !== slotStart ? " (voll)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="pkwField">
              <span>Platz</span>
              <select value={platz} onChange={(e) => setPlatz(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Automatisch</option>
                {PLAETZE.map((p) => (
                  <option key={p} value={p}>
                    Platz {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="pkwField">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as PkwBuchungStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {BUCHUNG_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="pkwField pkwFieldFull">
              <span>Szerelő / Monteur</span>
              <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)}>
                <option value="">— keiner —</option>
                {team.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="pkwFieldset">
            <legend>Leistungen</legend>
            <div className="pkwServiceCheckGrid">
              {servicearten.map((s) => (
                <label key={s.key} className="checkboxLabel">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(s.key)}
                    onChange={(e) => {
                      setSelectedServices((cur) =>
                        e.target.checked ? [...cur, s.key] : cur.filter((k) => k !== s.key)
                      );
                    }}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <div className="pkwInlineAddRow">
              <input
                placeholder="Neue Leistung / Service…"
                value={newServiceLabel}
                onChange={(e) => setNewServiceLabel(e.target.value)}
              />
              <button type="button" className="secondaryBtn" onClick={() => void handleAddService()}>
                Hinzufügen
              </button>
            </div>
          </fieldset>

          <label className="pkwField">
            <span>Kundenangabe / Problem</span>
            <textarea
              rows={2}
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
            />
          </label>

          <label className="pkwField">
            <span>Interne Notiz</span>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </label>

          {matchedFahrzeug ? (
            <fieldset className="pkwFieldset">
              <legend>Ersatzteilbedarf (Lager-Meldung)</legend>
              <p className="scanHint" style={{ margin: "0 0 10px" }}>
                Verknüpft mit Fahrzeug{" "}
                <strong>{matchedFahrzeug.kennzeichen}</strong> — erscheint unter Lager →
                Meldungen (PKW-Bedarf), wenn der Lagerstand nicht reicht.
              </p>
              <MaintenanceLagerParts
                parts={ersatzteile}
                canEdit
                onChange={setErsatzteile}
                showGruppenActions={false}
              />
            </fieldset>
          ) : kennzeichen.trim() ? (
            <p className="scanHint pkwFieldFull">
              Kein Fahrzeug mit diesem Kennzeichen in der PKW-Liste — Ersatzteilbedarf nur nach
              Anlage unter PKW → Fahrzeuge. Der Termin wird trotzdem gespeichert.
            </p>
          ) : null}

          <fieldset className="pkwFieldset">
            <legend>Munkafolyamat / Arbeitsschritte</legend>
            {schritte.map((schritt, index) => (
              <div key={schritt.id} className="pkwSchrittRow">
                <input
                  type="checkbox"
                  checked={schritt.erledigt}
                  onChange={(e) => {
                    const next = [...schritte];
                    next[index] = { ...schritt, erledigt: e.target.checked };
                    setSchritte(next);
                  }}
                />
                <input
                  value={schritt.text}
                  placeholder="Arbeitsschritt…"
                  onChange={(e) => {
                    const next = [...schritte];
                    next[index] = { ...schritt, text: e.target.value };
                    setSchritte(next);
                  }}
                />
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={() => setSchritte(schritte.filter((_, i) => i !== index))}
                  aria-label="Schritt entfernen"
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondaryBtn"
              onClick={() => setSchritte([...schritte, newSchritt()])}
            >
              + Schritt
            </button>
          </fieldset>

          {error ? <p className="errorText">{error}</p> : null}
        </div>

        <div className="machineAddModalActions">
          <button type="button" className="pillButton outline" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="pillButton primary" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
