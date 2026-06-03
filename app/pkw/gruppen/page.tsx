"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import MaintenanceLagerParts from "../../components/MaintenanceLagerParts";
import {
  fetchPkwGruppenOverview,
  fetchPkwGruppeVorlage,
  normalizePkwGruppeKey,
  savePkwGruppeVorlage,
} from "../../../lib/pkw";
import { getPkwErsatzteile } from "../../../lib/pkw-ersatzteile";
import { hasPkwKundenRead, hasPkwKundenWrite } from "../../../lib/pkw-permissions";
import type { MaintenanceLagerLink } from "../../../lib/types/maintenance";
import type { PkwFahrzeug } from "../../../lib/types/pkw";

export default function PkwGruppenPage() {
  const [gruppen, setGruppen] = useState<string[]>(["ALLGEMEIN"]);
  const [selected, setSelected] = useState("ALLGEMEIN");
  const [bezeichnung, setBezeichnung] = useState("");
  const [ersatzteile, setErsatzteile] = useState<MaintenanceLagerLink[]>([]);
  const [newGruppe, setNewGruppe] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  const sortedGruppen = useMemo(
    () => [...gruppen].sort((a, b) => a.localeCompare(b, "de")),
    [gruppen]
  );

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchPkwGruppenOverview();
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    setGruppen(data?.gruppen ?? ["ALLGEMEIN"]);
    setLoading(false);
  }, []);

  const loadVorlage = useCallback(async (gruppe: string) => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchPkwGruppeVorlage(gruppe);
    if (err) {
      setError(err);
      setBezeichnung("");
      setErsatzteile([]);
      setLoading(false);
      return;
    }
    setBezeichnung(data?.bezeichnung ?? "");
    setErsatzteile(getPkwErsatzteile({ ersatzteile: data?.ersatzteile ?? [] } as PkwFahrzeug));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        const perms = result.permissions ?? [];
        const groups = result.groups ?? [];
        const username = result.username ?? result.user?.username;
        setCanRead(hasPkwKundenRead(perms, groups, username));
        setCanWrite(hasPkwKundenWrite(perms, groups, username));
      });
  }, []);

  useEffect(() => {
    if (canRead) void loadOverview();
    else setLoading(false);
  }, [canRead, loadOverview]);

  useEffect(() => {
    if (!selected || !canRead) return;
    void loadVorlage(selected);
  }, [selected, canRead, loadVorlage]);

  async function handleSave() {
    if (!canWrite) return;
    const key = normalizePkwGruppeKey(selected);
    if (!key) {
      setError("Gruppe erforderlich.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: err } = await savePkwGruppeVorlage(key, {
      bezeichnung,
      ersatzteile,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setMessage(`Vorlage für ${key} gespeichert.`);
    await loadOverview();
  }

  function addGruppe() {
    const key = normalizePkwGruppeKey(newGruppe);
    if (!key) return;
    setGruppen((current) => [...new Set([...current, key])].sort());
    setSelected(key);
    setNewGruppe("");
  }

  if (!canRead && !loading) {
    return (
      <AppPageShell activeHref="/pkw/gruppen" subtitle="PKW">
        <p className="errorText">Keine Berechtigung: pkw.kunden.read</p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/pkw/gruppen" subtitle="PKW">
      <div className="welcomeCard geraetgruppenProtokollPage">
        <div className="detailTopBar">
          <div>
            <h1>PKW-Gruppen – Vorlagen</h1>
            <p className="subtitle">
              Pro PKW-Gruppe Standard-Ersatzteile für neue Fahrzeuge (wie Gerätegruppen bei
              Baumaschinen).
            </p>
          </div>
          <Link className="pillButton outline" href="/pkw/fahrzeuge">
            Zur Fahrzeugliste
          </Link>
        </div>

        <div className="geraetgruppenProtokollLayout">
          <aside className="geraetgruppenProtokollSidebar card">
            <h2 className="cardTitle">Gruppen</h2>
            <div className="geraetgruppenList">
              {sortedGruppen.map((gruppe) => (
                <button
                  key={gruppe}
                  type="button"
                  className={`geraetgruppenListBtn ${selected === gruppe ? "active" : ""}`}
                  onClick={() => setSelected(gruppe)}
                >
                  {gruppe}
                </button>
              ))}
            </div>
            <div className="geraetgruppenNewRow">
              <input
                value={newGruppe}
                onChange={(e) => setNewGruppe(e.target.value)}
                placeholder="Neue Gruppe"
              />
              <button type="button" className="pillButton outline" onClick={addGruppe}>
                Hinzufügen
              </button>
            </div>
          </aside>

          <section className="geraetgruppenProtokollEditor card">
            <div className="geraetgruppenEditorHead">
              <label className="fieldRow">
                <span>Bezeichnung</span>
                <input
                  value={bezeichnung}
                  onChange={(e) => setBezeichnung(e.target.value)}
                  placeholder={`Standard für ${selected}`}
                  disabled={!canWrite}
                />
              </label>
              <button
                type="button"
                className="pillButton primary"
                onClick={() => void handleSave()}
                disabled={saving || !canWrite}
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>

            {loading ? <p className="subtitle">Laden…</p> : null}
            {error ? <p className="errorText">{error}</p> : null}
            {message ? <p className="protocolNotice success">{message}</p> : null}

            <MaintenanceLagerParts
              parts={ersatzteile}
              canEdit={canWrite}
              onChange={setErsatzteile}
              showGruppenActions={false}
            />
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
