"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import RechnungPrintDocument from "../../../components/RechnungPrintDocument";
import { useLocalhostOnly } from "../../../hooks/useLocalhostOnly";
import { EMPTY_FIRMA, normalizeFirmaData, type FirmaData } from "../../../../lib/firma";
import { fetchRechnung } from "../../../../lib/rechnung";
import type { Rechnung } from "../../../../lib/types/rechnung";

export default function RechnungPrintPage() {
  const state = useLocalhostOnly();
  const params = useParams();
  const id = String(params.id ?? "");
  const [rechnung, setRechnung] = useState<Rechnung | null>(null);
  const [firma, setFirma] = useState<FirmaData>(EMPTY_FIRMA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "ready" || !id) return;
    void fetchRechnung(id).then(({ data, error: loadError }) => {
      if (loadError) setError(loadError);
      else setRechnung(data?.rechnung ?? null);
    });
    void fetch("/api/firma", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => setFirma(normalizeFirmaData(payload?.firma)))
      .catch(() => setFirma(EMPTY_FIRMA));
  }, [state, id]);

  if (state === "pending" || state === "blocked") {
    return (
      <div className="rechnungPrintPage">
        <p>{state === "pending" ? "Laden…" : "Nur localhost verfügbar."}</p>
      </div>
    );
  }

  return (
    <div className="rechnungPrintPage">
      <div className="rechnungPrintToolbar noPrint">
        <Link href={`/rechnungen/${id}`} className="pillButton outline">
          ← Zurück
        </Link>
        <button type="button" className="pillButton" onClick={() => window.print()}>
          Drucken / PDF
        </button>
      </div>
      {error ? <p className="formError">{error}</p> : null}
      {rechnung ? <RechnungPrintDocument rechnung={rechnung} firma={firma} /> : null}
    </div>
  );
}
