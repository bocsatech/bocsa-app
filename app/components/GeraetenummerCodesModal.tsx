"use client";

import { useEffect, useState } from "react";
import { GERAETTYP_OPTIONS } from "../../lib/machines";
import {
  DEFAULT_GERAETENUMMER_CODES,
  type GeraetenummerCodesConfig,
  type GeraetenummerKlasseEntry,
  addGeraetenummerCodeEntry,
  fetchGeraetenummerCodes,
  normalizeGeraetenummerCode,
  updateGeraetenummerCodeEntry,
} from "../../lib/geraetenummer";

type Props = {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
};

type Category = "marken" | "klassen" | "arten";

const CATEGORY_LABELS: Record<Category, string> = {
  marken: "Marken",
  klassen: "Klassen",
  arten: "Gerätetypen (3. Auswahl)",
};

const CATEGORY_TABS: Category[] = ["marken", "klassen", "arten"];

export default function GeraetenummerCodesModal({ open, canWrite, onClose }: Props) {
  const [codes, setCodes] = useState<GeraetenummerCodesConfig>(DEFAULT_GERAETENUMMER_CODES);
  const [activeTab, setActiveTab] = useState<Category>("marken");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowSaving, setRowSaving] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newGeraettyp, setNewGeraettyp] = useState("");
  const [adding, setAdding] = useState(false);

  const [drafts, setDrafts] = useState<
    Record<Category, Record<string, { label: string; geraettyp?: string }>>
  >({
    marken: {},
    klassen: {},
    arten: {},
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    void fetchGeraetenummerCodes().then(({ data, error: loadError }) => {
      setLoading(false);
      if (loadError) {
        setError(loadError.message);
        return;
      }
      if (data) {
        setCodes(data);
        setDrafts({
          marken: Object.fromEntries(
            data.marken.map((entry) => [entry.code, { label: entry.label ?? entry.code }])
          ),
          klassen: Object.fromEntries(
            data.klassen.map((entry) => [
              entry.code,
              { label: entry.label ?? entry.code, geraettyp: entry.geraettyp },
            ])
          ),
          arten: Object.fromEntries(
            data.arten.map((entry) => [entry.code, { label: entry.label ?? entry.code }])
          ),
        });
      }
    });
  }, [open]);

  if (!open) return null;

  function updateDraft(
    category: Category,
    code: string,
    patch: { label?: string; geraettyp?: string }
  ) {
    setDrafts((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [code]: { ...prev[category][code], ...patch },
      },
    }));
  }

  async function saveRow(category: Category, code: string) {
    const draft = drafts[category][code];
    if (!draft?.label?.trim()) {
      setError("Bezeichnung darf nicht leer sein.");
      return;
    }

    setRowSaving(`${category}-${code}`);
    setError(null);

    const { data, error: saveError } = await updateGeraetenummerCodeEntry({
      category,
      code,
      label: draft.label.trim(),
      geraettyp: category === "klassen" ? draft.geraettyp : undefined,
    });

    setRowSaving(null);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data) {
      setCodes(data);
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;

    setAdding(true);
    setError(null);

    const { data, error: saveError } = await addGeraetenummerCodeEntry({
      category: activeTab,
      code: normalizeGeraetenummerCode(newCode),
      label: newLabel.trim() || undefined,
      geraettyp: activeTab === "klassen" ? newGeraettyp || newLabel.trim() : undefined,
    });

    setAdding(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data) {
      setCodes(data);
      setDrafts({
        marken: Object.fromEntries(
          data.marken.map((entry) => [entry.code, { label: entry.label ?? entry.code }])
        ),
        klassen: Object.fromEntries(
          data.klassen.map((entry) => [
            entry.code,
            { label: entry.label ?? entry.code, geraettyp: entry.geraettyp },
          ])
        ),
        arten: Object.fromEntries(
          data.arten.map((entry) => [entry.code, { label: entry.label ?? entry.code }])
        ),
      });
      setNewCode("");
      setNewLabel("");
      setNewGeraettyp("");
    }
  }

  const rows =
    activeTab === "marken"
      ? codes.marken
      : activeTab === "klassen"
        ? codes.klassen
        : codes.arten;

  return (
    <div className="qrModalBackdrop machineAddModalBackdrop">
      <div
        className="machineAddModal geraetenummerCodesModal"
        role="dialog"
        aria-labelledby="geraetenummer-codes-title"
      >
        <div className="machineAddModalHeader">
          <div>
            <h2 id="geraetenummer-codes-title" className="machineAddModalTitle">
              Nummern-Codes
            </h2>
            <p className="subtitle">
              Marken, Klassen und Gerätetypen für die Auswahl beim Anlegen (z. B. WN-GG-BRM-00001).
            </p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="geraetenummerCodesModalBody">
          <div className="tabList geraetenummerCodesTabs">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tabButton ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {CATEGORY_LABELS[tab]}
              </button>
            ))}
          </div>

          {loading ? <p>Laden…</p> : null}
          {error ? <p className="geraetenummerCodesError">{error}</p> : null}

          {!loading ? (
            <div className="geraetenummerCodesTableWrap">
              <table className="geraetenummerCodesTable">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Bezeichnung</th>
                    {activeTab === "klassen" ? <th>Gerättyp (Stammdaten)</th> : null}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => {
                    const draft = drafts[activeTab][entry.code] ?? {
                      label: entry.label ?? entry.code,
                      geraettyp:
                        activeTab === "klassen"
                          ? (entry as GeraetenummerKlasseEntry).geraettyp
                          : undefined,
                    };
                    const savingKey = `${activeTab}-${entry.code}`;
                    return (
                      <tr key={entry.code}>
                        <td>
                          <code>{entry.code}</code>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={draft.label}
                            disabled={!canWrite}
                            onChange={(event) =>
                              updateDraft(activeTab, entry.code, {
                                label: event.target.value,
                              })
                            }
                          />
                        </td>
                        {activeTab === "klassen" ? (
                          <td>
                            <select
                              value={draft.geraettyp ?? ""}
                              disabled={!canWrite}
                              onChange={(event) =>
                                updateDraft(activeTab, entry.code, {
                                  geraettyp: event.target.value,
                                })
                              }
                            >
                              <option value="">—</option>
                              {GERAETTYP_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                        ) : null}
                        <td>
                          <button
                            type="button"
                            className="pillButton outline"
                            disabled={!canWrite || rowSaving === savingKey}
                            onClick={() => saveRow(activeTab, entry.code)}
                          >
                            {rowSaving === savingKey ? "…" : "Speichern"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {canWrite ? (
            <form className="geraetenummerCodesAddForm" onSubmit={handleAdd}>
              <h3>Neuer Code ({CATEGORY_LABELS[activeTab]})</h3>
              <div className="geraetenummerCodesForm">
                <label>
                  <span>Code</span>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                    placeholder="z. B. CAT"
                    required
                  />
                </label>
                <label>
                  <span>Bezeichnung</span>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(event) => setNewLabel(event.target.value)}
                    placeholder="Anzeigename in der Auswahl"
                    required
                  />
                </label>
                {activeTab === "klassen" ? (
                  <label>
                    <span>Gerättyp</span>
                    <select
                      value={newGeraettyp}
                      onChange={(event) => setNewGeraettyp(event.target.value)}
                      required
                    >
                      <option value="">—</option>
                      {GERAETTYP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="submit" className="pillButton primary" disabled={adding}>
                  {adding ? "Hinzufügen…" : "Code hinzufügen"}
                </button>
              </div>
            </form>
          ) : (
            <p className="geraetenummerCodesHint">Nur mit Schreibrecht bearbeitbar.</p>
          )}
        </div>
      </div>
    </div>
  );
}
