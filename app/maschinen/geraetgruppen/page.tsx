"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppPageShell from "../../components/AppPageShell";
import ArbeitsauftragProtokollSection from "../../components/ArbeitsauftragProtokollSection";
import GeraetgruppeTabDefaultsEditor from "../../components/GeraetgruppeTabDefaultsEditor";
import {
  createDefaultProtocol,
  type WorkOrderProtocol,
} from "../../../lib/arbeitsauftrag-protokoll";
import {
  buildGeraetgruppeVorlageForSave,
  cloneProtocolFromVorlage,
  fetchGruppenProtokollOverview,
  fetchGruppenProtokollVorlage,
  normalizeGeraetgruppeVorlage,
  normalizeSubgroupKey,
  saveGruppenProtokollVorlage,
  tabDefaultsFromGeraetgruppeVorlage,
} from "../../../lib/geraetgruppe-protokoll";
import {
  INITIAL_LUBRICANT_DATA,
  INITIAL_MOTOR_DATA,
  INITIAL_TECHNICAL_DATA,
  type LubricantFormData,
  type MotorFormData,
  type TechnicalFormData,
} from "../../../lib/machine-tab-forms";

type EditorSection = "protokoll" | "maschine";

export default function GeraetgruppenProtokollPage() {
  const [subgroups, setSubgroups] = useState<string[]>(["ALLGEMEIN"]);
  const [selected, setSelected] = useState("ALLGEMEIN");
  const [section, setSection] = useState<EditorSection>("protokoll");
  const [bezeichnung, setBezeichnung] = useState("");
  const [protocol, setProtocol] = useState<WorkOrderProtocol>(() => createDefaultProtocol());
  const [motor, setMotor] = useState<MotorFormData>({ ...INITIAL_MOTOR_DATA });
  const [technical, setTechnical] = useState<TechnicalFormData>({ ...INITIAL_TECHNICAL_DATA });
  const [lubricants, setLubricants] = useState<LubricantFormData>({ ...INITIAL_LUBRICANT_DATA });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newSubgroup, setNewSubgroup] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchGruppenProtokollOverview();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const fromMachines = data?.subgroupsFromMachines ?? [];
    const fromTemplates = (data?.templates ?? []).map((t) => t.subgroup);
    const merged = new Set<string>(["ALLGEMEIN", ...fromMachines, ...fromTemplates]);
    setSubgroups([...merged].sort());
    setLoading(false);
  }, []);

  const loadVorlage = useCallback(async (subgroup: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchGruppenProtokollVorlage(subgroup);
    if (err) {
      setError(err.message);
      setProtocol(createDefaultProtocol());
      setMotor({ ...INITIAL_MOTOR_DATA });
      setTechnical({ ...INITIAL_TECHNICAL_DATA });
      setLubricants({ ...INITIAL_LUBRICANT_DATA });
      setLoading(false);
      return;
    }
    const normalized = normalizeGeraetgruppeVorlage(data?.vorlage);
    setBezeichnung(data?.bezeichnung ?? "");
    setProtocol(cloneProtocolFromVorlage(normalized));
    const tabs = tabDefaultsFromGeraetgruppeVorlage(normalized);
    setMotor(tabs.motor);
    setTechnical(tabs.technical);
    setLubricants(tabs.lubricants);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!selected) return;
    void loadVorlage(selected);
  }, [selected, loadVorlage]);

  const sortedSubgroups = useMemo(
    () => [...subgroups].sort((a, b) => a.localeCompare(b, "de")),
    [subgroups]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const key = normalizeSubgroupKey(selected);
    if (!key) {
      setError("Gerätegruppe erforderlich.");
      setSaving(false);
      return;
    }
    const { error: err } = await saveGruppenProtokollVorlage(
      key,
      buildGeraetgruppeVorlageForSave(protocol, motor, technical, lubricants),
      bezeichnung
    );
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(`Vorlage für ${key} gespeichert (Protokoll + Maschinen-Standard).`);
    await loadOverview();
  }

  function addSubgroup() {
    const key = normalizeSubgroupKey(newSubgroup);
    if (!key) return;
    setSubgroups((current) => [...new Set([...current, key])].sort());
    setSelected(key);
    setNewSubgroup("");
  }

  return (
    <AppPageShell activeHref="/maschinen/geraetgruppen" subtitle="Baumaschinen">
      <div className="welcomeCard geraetgruppenProtokollPage">
        <div className="detailTopBar">
          <div>
            <h1>Gerätegruppen – Vorlagen</h1>
            <p className="subtitle">
              Pro Gerätegruppe: Arbeitsauftrag-Protokoll (Reparaturdaten) und Standard für Motor,
              Technische Daten, Schmierstoffe bei neuen Maschinen.
            </p>
          </div>
          <Link className="pillButton outline" href="/maschinen">
            Zur Maschinenliste
          </Link>
        </div>

        {error ? <p className="errorText">{error}</p> : null}
        {message ? <p className="protocolNotice success">{message}</p> : null}

        <div className="geraetgruppenProtokollLayout">
          <aside className="geraetgruppenProtokollSidebar card">
            <h2 className="cardTitle">Gerätegruppen</h2>
            <ul className="geraetgruppenList">
              {sortedSubgroups.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={`geraetgruppenListBtn${selected === key ? " active" : ""}`}
                    onClick={() => setSelected(key)}
                  >
                    {key}
                  </button>
                </li>
              ))}
            </ul>
            <div className="geraetgruppenNewRow">
              <input
                type="text"
                placeholder="Neue Gruppe z. B. GG-BG2"
                value={newSubgroup}
                onChange={(e) => setNewSubgroup(e.target.value)}
              />
              <button type="button" className="pillButton outline" onClick={addSubgroup}>
                Hinzufügen
              </button>
            </div>
          </aside>

          <section className="geraetgruppenProtokollEditor card">
            <div className="geraetgruppenEditorHead">
              <label className="pkwField">
                <span>Bezeichnung (optional)</span>
                <input
                  value={bezeichnung}
                  onChange={(e) => setBezeichnung(e.target.value)}
                  placeholder="z. B. Großgerät Bagger 2 t"
                />
              </label>
              <button
                type="button"
                className="pillButton primary"
                disabled={saving || loading}
                onClick={() => void handleSave()}
              >
                {saving ? "Speichern…" : "Vorlage speichern"}
              </button>
            </div>

            <div className="tabList geraetgruppenSectionTabs">
              <button
                type="button"
                className={`tabButton${section === "protokoll" ? " active" : ""}`}
                onClick={() => setSection("protokoll")}
              >
                Arbeitsauftrag-Protokoll
              </button>
              <button
                type="button"
                className={`tabButton${section === "maschine" ? " active" : ""}`}
                onClick={() => setSection("maschine")}
              >
                Motor · Technische Daten · Schmierstoffe
              </button>
            </div>

            {loading ? (
              <p>Laden…</p>
            ) : section === "protokoll" ? (
              <ArbeitsauftragProtokollSection
                protocol={protocol}
                canEdit
                canIssueLager={false}
                auftragReferenz={`Gerätegruppe ${selected}`}
                onChange={setProtocol}
              />
            ) : (
              <GeraetgruppeTabDefaultsEditor
                motor={motor}
                technical={technical}
                lubricants={lubricants}
                onMotorChange={setMotor}
                onTechnicalChange={setTechnical}
                onLubricantsChange={setLubricants}
              />
            )}
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
