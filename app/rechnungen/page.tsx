"use client";

import AppPageShell from "../components/AppPageShell";

export default function RechnungenPage() {
  return (
    <AppPageShell activeHref="/rechnungen" subtitle="Rechnungen" title="Rechnungen">
      <div className="welcomeCard">
        <h1>Rechnungen</h1>
        <p className="subtitle">Rechnungsübersicht — demnächst verfügbar (nur localhost).</p>
      </div>
    </AppPageShell>
  );
}
