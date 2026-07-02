"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Machine } from "../../lib/types/machine";
import type { LagerTeil } from "../../lib/types/lager";
import type { Kunde, PkwFahrzeug } from "../../lib/types/pkw";
import type { Rechnung, RechnungDraft, RechnungPosition } from "../../lib/types/rechnung";
import { fetchMachines } from "../../lib/machines";
import { fetchKunden, fetchPkwFahrzeuge, formatKundeName } from "../../lib/pkw";
import { fetchLagerTeile } from "../../lib/lager";
import { getPkwWorkOrders } from "../../lib/pkw-work-orders";
import { getWorkOrders } from "../../lib/work-orders";
import {
  calcRechnungTotals,
  createEmptyRechnungDraft,
  fetchNextRechnungsNr,
  mergeImportedPositions,
  newPosition,
  positionFromLagerTeil,
  renumberPositions,
  RECHNUNG_EINHEIT_OPTIONS,
  RECHNUNG_KOSTENART_OPTIONS,
  RECHNUNG_MWST_OPTIONS,
  RECHNUNG_STATUS_OPTIONS,
  saveRechnung,
} from "../../lib/rechnung";
import {
  positionsFromBauArbeitsauftrag,
  positionsFromPkwArbeitsauftrag,
} from "../../lib/rechnung-import";
import { kundeToSnapshot, fahrzeugToSnapshot } from "../../lib/types/rechnung";

type Props = {
  initial?: Rechnung | null;
  onSaved: (rechnung: Rechnung) => void;
  importQuery?: {
    source?: string | null;
    fahrzeugId?: string | null;
    auftragId?: string | null;
    machineId?: string | null;
  };
};

export default function RechnungForm({ initial, onSaved, importQuery }: Props) {
  const [draft, setDraft] = useState<RechnungDraft>(() =>
    initial
      ? {
          ...initial,
          positionen: initial.positionen ?? [],
        }
      : createEmptyRechnungDraft()
  );
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [lagerTeile, setLagerTeile] = useState<LagerTeil[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lagerOpen, setLagerOpen] = useState(false);
  const [selectedPkwAuftrag, setSelectedPkwAuftrag] = useState("");
  const [selectedBauMachine, setSelectedBauMachine] = useState("");
  const [selectedBauAuftrag, setSelectedBauAuftrag] = useState("");

  useEffect(() => {
    void fetchKunden().then(({ data }) => setKunden(data ?? []));
    void fetchMachines().then(({ data }) => setMachines((data ?? []) as Machine[]));
    void fetchLagerTeile().then(({ data }) => setLagerTeile(data ?? []));
  }, []);

  useEffect(() => {
    if (initial) return;
    void fetchNextRechnungsNr(draft.belegdatum).then(({ data }) => {
      if (data?.rechnungsNr) {
        setDraft((current) => ({ ...current, rechnungs_nr: data.rechnungsNr }));
      }
    });
  }, [initial, draft.belegdatum]);

  useEffect(() => {
    if (!draft.kunde_id) {
      setFahrzeuge([]);
      return;
    }
    void fetchPkwFahrzeuge(draft.kunde_id).then(({ data }) => {
      setFahrzeuge(data ?? []);
    });
  }, [draft.kunde_id]);

  const selectedFahrzeug = useMemo(
    () => fahrzeuge.find((item) => item.id === draft.pkw_fahrzeug_id) ?? null,
    [draft.pkw_fahrzeug_id, fahrzeuge]
  );

  const pkwAuftraege = useMemo(
    () => (selectedFahrzeug ? getPkwWorkOrders(selectedFahrzeug) : []),
    [selectedFahrzeug]
  );

  const selectedMachine = useMemo(
    () => machines.find((item) => item.id === selectedBauMachine) ?? null,
    [machines, selectedBauMachine]
  );

  const bauAuftraege = useMemo(
    () => (selectedMachine ? getWorkOrders(selectedMachine) : []),
    [selectedMachine]
  );

  useEffect(() => {
    if (initial || !importQuery) return;
    const { source, fahrzeugId, auftragId, machineId } = importQuery;
    if (source === "pkw_arbeitsauftrag" && fahrzeugId && auftragId) {
      void fetchPkwFahrzeuge().then(({ data }) => {
        const fahrzeug = (data ?? []).find((item) => item.id === fahrzeugId);
        if (!fahrzeug) return;
        const order = getPkwWorkOrders(fahrzeug).find((item) => item.id === auftragId);
        if (!order) return;
        const imported = positionsFromPkwArbeitsauftrag(order, fahrzeugId, 0);
        setDraft((current) => ({
          ...current,
          kunde_id: fahrzeug.kunde_id,
          kunde_snapshot: kundeToSnapshot(fahrzeug.kunde ?? null),
          pkw_fahrzeug_id: fahrzeug.id,
          fahrzeug_snapshot: fahrzeugToSnapshot(fahrzeug),
          source_type: "pkw_arbeitsauftrag",
          source_ref: imported.sourceRef,
          leistungsdatum: order.date || current.leistungsdatum,
          positionen: imported.positionen,
        }));
      });
    }
    if (source === "bau_arbeitsauftrag" && machineId && auftragId) {
      void fetchMachines().then(({ data }) => {
        const machine = (data ?? []).find((item) => item.id === machineId) as Machine | undefined;
        if (!machine) return;
        const order = getWorkOrders(machine).find((item) => item.id === auftragId);
        if (!order) return;
        const label = machine.geraetenummer || machine.bezeichnung || machine.id;
        const imported = positionsFromBauArbeitsauftrag(order, machineId, label, 0);
        setDraft((current) => ({
          ...current,
          source_type: "bau_arbeitsauftrag",
          source_ref: imported.sourceRef,
          leistungsdatum: order.date || current.leistungsdatum,
          positionen: imported.positionen,
        }));
        setSelectedBauMachine(machineId);
        setSelectedBauAuftrag(auftragId);
      });
    }
  }, [importQuery, initial]);

  const totals = useMemo(
    () => calcRechnungTotals(draft.positionen, draft.mwst_modus, draft.abzug),
    [draft.positionen, draft.mwst_modus, draft.abzug]
  );

  function updatePosition(id: string, patch: Partial<RechnungPosition>) {
    setDraft((current) => ({
      ...current,
      positionen: renumberPositions(
        current.positionen.map((row) => (row.id === id ? { ...row, ...patch } : row))
      ),
    }));
  }

  function addRow(posTyp: RechnungPosition["pos_typ"] = "position") {
    setDraft((current) => ({
      ...current,
      positionen: renumberPositions([
        ...current.positionen,
        newPosition({ pos_typ: posTyp, sort_order: current.positionen.length }),
      ]),
    }));
  }

  function removeRow(id: string) {
    setDraft((current) => ({
      ...current,
      positionen: renumberPositions(current.positionen.filter((row) => row.id !== id)),
    }));
  }

  function importPkwAuftrag() {
    const order = pkwAuftraege.find((item) => item.id === selectedPkwAuftrag);
    if (!order || !selectedFahrzeug) return;
    const imported = positionsFromPkwArbeitsauftrag(
      order,
      selectedFahrzeug.id,
      draft.positionen.length
    );
    setDraft((current) => ({
      ...current,
      source_type: current.source_type === "manual" ? "pkw_arbeitsauftrag" : "gemischt",
      source_ref: { ...(current.source_ref ?? {}), ...imported.sourceRef },
      leistungsdatum: order.date || current.leistungsdatum,
      positionen: mergeImportedPositions(current.positionen, imported.positionen),
    }));
  }

  function importBauAuftrag() {
    const order = bauAuftraege.find((item) => item.id === selectedBauAuftrag);
    if (!order || !selectedMachine) return;
    const label = selectedMachine.geraetenummer || selectedMachine.bezeichnung || selectedMachine.id;
    const imported = positionsFromBauArbeitsauftrag(
      order,
      selectedMachine.id,
      label,
      draft.positionen.length
    );
    setDraft((current) => ({
      ...current,
      source_type: current.source_type === "manual" ? "bau_arbeitsauftrag" : "gemischt",
      source_ref: { ...(current.source_ref ?? {}), ...imported.sourceRef },
      leistungsdatum: order.date || current.leistungsdatum,
      positionen: mergeImportedPositions(current.positionen, imported.positionen),
    }));
  }

  function importLagerTeil(teil: LagerTeil) {
    setDraft((current) => ({
      ...current,
      source_type: current.source_type === "manual" ? "lager" : "gemischt",
      positionen: mergeImportedPositions(current.positionen, [
        positionFromLagerTeil(teil, current.positionen.length),
      ]),
    }));
    setLagerOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...draft,
      ...totals,
      positionen: draft.positionen,
    };
    const { data, error: saveError } = await saveRechnung(payload, initial?.id);
    setSaving(false);
    if (saveError || !data?.rechnung) {
      setError(saveError ?? "Speichern fehlgeschlagen.");
      return;
    }
    onSaved(data.rechnung);
  }

  return (
    <form className="rechnungForm" onSubmit={handleSubmit}>
      {error ? <p className="formError">{error}</p> : null}

      <section className="rechnungFormSection">
        <h2>Beleg</h2>
        <div className="rechnungFormGrid">
          <label>
            Rechnungs-Nr.
            <input
              value={draft.rechnungs_nr}
              onChange={(event) =>
                setDraft((current) => ({ ...current, rechnungs_nr: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Belegdatum
            <input
              type="date"
              value={draft.belegdatum}
              onChange={(event) =>
                setDraft((current) => ({ ...current, belegdatum: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Fälligkeitsdatum
            <input
              type="date"
              value={draft.faelligkeitsdatum ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, faelligkeitsdatum: event.target.value }))
              }
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as RechnungDraft["status"],
                }))
              }
            >
              {RECHNUNG_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            MwSt.
            <select
              value={draft.mwst_modus}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mwst_modus: event.target.value as RechnungDraft["mwst_modus"],
                }))
              }
            >
              {RECHNUNG_MWST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Leistungsdatum
            <input
              type="date"
              value={draft.leistungsdatum ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, leistungsdatum: event.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <section className="rechnungFormSection">
        <h2>Kunde & Fahrzeug</h2>
        <div className="rechnungFormGrid">
          <label>
            Kunde
            <select
              value={draft.kunde_id ?? ""}
              onChange={(event) => {
                const kunde = kunden.find((item) => item.id === event.target.value) ?? null;
                setDraft((current) => ({
                  ...current,
                  kunde_id: kunde?.id ?? null,
                  kunde_snapshot: kundeToSnapshot(kunde),
                  pkw_fahrzeug_id: null,
                  fahrzeug_snapshot: null,
                }));
              }}
            >
              <option value="">—</option>
              {kunden.map((kunde) => (
                <option key={kunde.id} value={kunde.id}>
                  {formatKundeName(kunde)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fahrzeug (PKW)
            <select
              value={draft.pkw_fahrzeug_id ?? ""}
              onChange={(event) => {
                const fahrzeug = fahrzeuge.find((item) => item.id === event.target.value) ?? null;
                setDraft((current) => ({
                  ...current,
                  pkw_fahrzeug_id: fahrzeug?.id ?? null,
                  fahrzeug_snapshot: fahrzeugToSnapshot(fahrzeug),
                }));
              }}
            >
              <option value="">—</option>
              {fahrzeuge.map((fahrzeug) => (
                <option key={fahrzeug.id} value={fahrzeug.id}>
                  {fahrzeug.kennzeichen} · {[fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rechnungFormSection">
        <h2>Daten übernehmen</h2>
        <div className="rechnungImportRow">
          <label>
            PKW-Arbeitsauftrag
            <select value={selectedPkwAuftrag} onChange={(e) => setSelectedPkwAuftrag(e.target.value)}>
              <option value="">—</option>
              {pkwAuftraege.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.auftragNr || order.id} · {order.date} · {order.repairDescription?.slice(0, 40)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="pillButton outline" onClick={importPkwAuftrag}>
            Übernehmen
          </button>
        </div>
        <div className="rechnungImportRow">
          <label>
            Baugerät
            <select
              value={selectedBauMachine}
              onChange={(event) => {
                setSelectedBauMachine(event.target.value);
                setSelectedBauAuftrag("");
              }}
            >
              <option value="">—</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.geraetenummer || machine.bezeichnung || machine.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Bau-Arbeitsauftrag
            <select value={selectedBauAuftrag} onChange={(e) => setSelectedBauAuftrag(e.target.value)}>
              <option value="">—</option>
              {bauAuftraege.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.auftragNr || order.id} · {order.date}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="pillButton outline" onClick={importBauAuftrag}>
            Übernehmen
          </button>
        </div>
        <div className="rechnungImportRow">
          <button type="button" className="pillButton outline" onClick={() => setLagerOpen(true)}>
            Teil aus Lager hinzufügen
          </button>
        </div>
      </section>

      <section className="rechnungFormSection">
        <div className="rechnungFormSectionHead">
          <h2>Positionen</h2>
          <div className="rechnungFormActions">
            <button type="button" className="pillButton outline" onClick={() => addRow("position")}>
              + Position
            </button>
            <button type="button" className="pillButton outline" onClick={() => addRow("titel")}>
              + Titel
            </button>
            <button type="button" className="pillButton outline" onClick={() => addRow("abzug")}>
              + Abzug
            </button>
          </div>
        </div>
        <div className="rechnungPositionsWrap">
          <table className="rechnungPositionsTable">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Typ</th>
                <th>Kostenart</th>
                <th>Menge</th>
                <th>Einh.</th>
                <th>Bezeichnung</th>
                <th>Einzel netto</th>
                <th>Rab.%</th>
                <th>Netto</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.positionen.map((row) => (
                <tr key={row.id}>
                  <td>{row.position_nr || "—"}</td>
                  <td>
                    <select
                      value={row.pos_typ}
                      onChange={(event) =>
                        updatePosition(row.id, {
                          pos_typ: event.target.value as RechnungPosition["pos_typ"],
                        })
                      }
                    >
                      <option value="position">Position</option>
                      <option value="titel">Titel</option>
                      <option value="abzug">Abzug</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={row.kostenart ?? ""}
                      onChange={(event) =>
                        updatePosition(row.id, {
                          kostenart: (event.target.value || null) as RechnungPosition["kostenart"],
                        })
                      }
                    >
                      <option value="">—</option>
                      {RECHNUNG_KOSTENART_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      value={row.menge}
                      onChange={(event) =>
                        updatePosition(row.id, { menge: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={row.einheit}
                      onChange={(event) => updatePosition(row.id, { einheit: event.target.value })}
                    >
                      {RECHNUNG_EINHEIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={row.bezeichnung}
                      onChange={(event) =>
                        updatePosition(row.id, { bezeichnung: event.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.einzelpreis_netto}
                      onChange={(event) =>
                        updatePosition(row.id, { einzelpreis_netto: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.rabatt_prozent}
                      onChange={(event) =>
                        updatePosition(row.id, { rabatt_prozent: Number(event.target.value) })
                      }
                    />
                  </td>
                  <td>{row.positionspreis_netto.toFixed(2)}</td>
                  <td>
                    <button type="button" className="linkButton" onClick={() => removeRow(row.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rechnungFormSection rechnungFormTotals">
        <label>
          Abzug (EUR)
          <input
            type="number"
            step="0.01"
            value={draft.abzug}
            onChange={(event) =>
              setDraft((current) => ({ ...current, abzug: Number(event.target.value) }))
            }
          />
        </label>
        <div className="rechnungTotalsBox">
          <div>
            <span>Zwischensumme</span>
            <strong>{totals.zwischensumme_netto.toFixed(2)} €</strong>
          </div>
          {draft.mwst_modus === "zuzueglich" ? (
            <>
              <div>
                <span>USt 19%</span>
                <strong>{totals.ust_19.toFixed(2)} €</strong>
              </div>
              <div>
                <span>USt 7%</span>
                <strong>{totals.ust_7.toFixed(2)} €</strong>
              </div>
            </>
          ) : null}
          <div className="rechnungTotalsFinal">
            <span>Rechnungsbetrag</span>
            <strong>{totals.rechnungsbetrag.toFixed(2)} €</strong>
          </div>
        </div>
      </section>

      <section className="rechnungFormSection">
        <label>
          Zahlungshinweis
          <textarea
            rows={2}
            value={draft.zahlungshinweis ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, zahlungshinweis: event.target.value }))
            }
          />
        </label>
        <label>
          Fußnote (z. B. Radschrauben)
          <textarea
            rows={2}
            value={draft.footer_hinweis ?? ""}
            onChange={(event) =>
              setDraft((current) => ({ ...current, footer_hinweis: event.target.value }))
            }
          />
        </label>
      </section>

      <div className="rechnungFormFooter">
        <button type="submit" className="pillButton" disabled={saving}>
          {saving ? "Speichern…" : initial ? "Aktualisieren" : "Rechnung speichern"}
        </button>
      </div>

      {lagerOpen ? (
        <div className="modalBackdrop" onClick={() => setLagerOpen(false)}>
          <div className="modalCard rechnungLagerModal" onClick={(event) => event.stopPropagation()}>
            <h3>Teil aus Lager</h3>
            <ul className="rechnungLagerList">
              {lagerTeile.slice(0, 200).map((teil) => (
                <li key={teil.id}>
                  <button type="button" onClick={() => importLagerTeil(teil)}>
                    <strong>{teil.bezeichnung || teil.herstellernummer}</strong>
                    <span>{teil.herstellernummer}</span>
                    <span>{(teil.verkaufspreis ?? teil.listenpreis_netto ?? 0).toFixed(2)} €</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="pillButton outline" onClick={() => setLagerOpen(false)}>
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
