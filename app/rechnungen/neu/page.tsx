"use client";

import AppPageShell from "../../components/AppPageShell";

export default function RechnungNeuPage() {
  return (
    <AppPageShell activeHref="/rechnungen/neu" subtitle="Rechnungen" title="Neue Rechnung">
      <div className="welcomeCard">
        <h1>Neu</h1>
        <p className="subtitle">Neue Rechnung erstellen — demnächst verfügbar (nur localhost).</p>
      </div>
    </AppPageShell>
  );
}
