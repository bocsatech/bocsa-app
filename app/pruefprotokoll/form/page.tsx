"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PruefprotokollForm from "../../components/PruefprotokollForm";

function PruefprotokollFormPageContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get("machineId");

  if (!machineId) {
    return (
      <div className="welcomeCard" style={{ margin: 24 }}>
        <h2>Keine Maschine gewählt</h2>
        <p>Bitte von der Maschinenliste oder der Prüfprotokoll-Übersicht starten.</p>
      </div>
    );
  }

  return (
    <PruefprotokollForm
      key={`${machineId}-${searchParams.get("protokollId") ?? "new"}`}
      machineId={machineId}
      protokollId={searchParams.get("protokollId")}
    />
  );
}

export default function PruefprotokollFormPage() {
  return (
    <Suspense
      fallback={
        <div className="welcomeCard" style={{ margin: 24 }}>
          <h2>Laden…</h2>
        </div>
      }
    >
      <PruefprotokollFormPageContent />
    </Suspense>
  );
}
