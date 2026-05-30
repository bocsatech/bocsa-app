"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppPageShell from "../../components/AppPageShell";
import ArbeitsauftragProtokollSection from "../../components/ArbeitsauftragProtokollSection";
import {
  createDefaultProtocol,
  type WorkOrderProtocol,
} from "../../../lib/arbeitsauftrag-protokoll";
import {
  cloneProtocolFromVorlage,
  fetchGruppenProtokollOverview,
  fetchGruppenProtokollVorlage,
  normalizeSubgroupKey,
  protocolToStoredVorlage,
  saveGruppenProtokollVorlage,
} from "../../../lib/geraetgruppe-protokoll";

export default function GeraetgruppenProtokollPage() {
  const [subgroups, setSubgroups] = useState<string[]>(["ALLGEMEIN"]);
  const [selected, setSelected] = useState("ALLGEMEIN");
  const [bezeichnung, setBezeichnung] = useState("");
  const [protocol, setProtocol] = useState<WorkOrderProtocol>(() => createDefaultProtocol());
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
      setLoading(false);
      return;
    }
    setBezeichnung(data?.bezeichnung ?? "");
    setProtocol(cloneProtocolFromVorlage(data?.vorlage));
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
      protocolToStoredVorlage(protocol),
      bezeichnung
    );
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(`Vorlage für ${key} gespeichert.`);
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
            <h1>Gerätegruppen – Protokoll</h1>
            <p className="subtitle">
              Reparaturdaten und Service-Material pro Gerätegruppe (z. B. GG-BG2). Neue
              Arbeitsaufträge übernehmen diese Struktur; am Auftrag kann individuell abgewichen
              werden.
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

            {loading ? (
              <p>Laden…</p>
            ) : (
              <ArbeitsauftragProtokollSection
                protocol={protocol}
                canEdit
                canIssueLager={false}
                auftragReferenz={`Gerätegruppe ${selected}`}
                onChange={setProtocol}
              />
            )}
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
