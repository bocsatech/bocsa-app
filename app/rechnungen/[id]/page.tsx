"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import RechnungForm from "../../components/RechnungForm";
import { useLocalhostOnly } from "../../hooks/useLocalhostOnly";
import { fetchRechnung } from "../../../lib/rechnung";
import type { Rechnung } from "../../../lib/types/rechnung";

export default function RechnungDetailPage() {
  const state = useLocalhostOnly();
  const params = useParams();
  const id = String(params.id ?? "");
  const [rechnung, setRechnung] = useState<Rechnung | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "ready" || !id) return;
    void fetchRechnung(id).then(({ data, error: loadError }) => {
      if (loadError) {
        setError(loadError);
        return;
      }
      setRechnung(data?.rechnung ?? null);
    });
  }, [state, id]);

  if (state === "pending" || state === "blocked") {
    return (
      <AppPageShell activeHref="/rechnungen" subtitle="Rechnungen" title="Rechnung">
        <div className="welcomeCard">
          <p>{state === "pending" ? "Laden…" : "Nur localhost verfügbar."}</p>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/rechnungen" subtitle="Rechnungen" title="Rechnung">
      <div className="welcomeCard rechnungEditorPage">
        <div className="detailTopActions">
          <h1>{rechnung?.rechnungs_nr ?? "Rechnung"}</h1>
          {rechnung ? (
            <Link href={`/rechnungen/${rechnung.id}/print`} className="pillButton outline">
              Drucken
            </Link>
          ) : null}
        </div>
        {error ? <p className="formError">{error}</p> : null}
        {rechnung ? (
          <RechnungForm initial={rechnung} onSaved={(saved) => setRechnung(saved)} />
        ) : !error ? (
          <p>Laden…</p>
        ) : null}
      </div>
    </AppPageShell>
  );
}
