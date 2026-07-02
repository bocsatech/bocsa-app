"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppPageShell from "../../components/AppPageShell";
import RechnungForm from "../../components/RechnungForm";
import { useLocalhostOnly } from "../../hooks/useLocalhostOnly";

function RechnungNeuContent() {
  const state = useLocalhostOnly();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (state === "pending" || state === "blocked") {
    return (
      <AppPageShell activeHref="/rechnungen/neu" subtitle="Rechnungen" title="Neue Rechnung">
        <div className="welcomeCard">
          <p>{state === "pending" ? "Laden…" : "Nur localhost verfügbar."}</p>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/rechnungen/neu" subtitle="Rechnungen" title="Neue Rechnung">
      <div className="welcomeCard rechnungEditorPage">
        <h1>Neue Rechnung</h1>
        <p className="subtitle">
          Kunde, Fahrzeug, Positionen — Daten aus Arbeitsauftrag oder Lager übernehmen.
        </p>
        <RechnungForm
          importQuery={{
            source: searchParams.get("source"),
            fahrzeugId: searchParams.get("fahrzeugId"),
            auftragId: searchParams.get("auftragId"),
            machineId: searchParams.get("machineId"),
          }}
          onSaved={(rechnung) => router.push(`/rechnungen/${rechnung.id}`)}
        />
      </div>
    </AppPageShell>
  );
}

export default function RechnungNeuPage() {
  return (
    <Suspense fallback={null}>
      <RechnungNeuContent />
    </Suspense>
  );
}
