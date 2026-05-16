"use client";

import AppPageShell from "../components/AppPageShell";
import ArbeitsstundenDashboard from "../components/ArbeitsstundenDashboard";

export default function ArbeitsstundenPage() {
  return (
    <AppPageShell
      activeHref="/arbeitsstunden"
      subtitle="Betrieb"
      contentClassName="arbeitsauftragListPage"
      top={
        <div className="detailTopBar">
          <h1>Arbeitsstunden</h1>
          <p className="subtitle">
            Tagesnachweis 07:00–17:00 · Protokolle + manuelle Einträge · Auswertung
          </p>
        </div>
      }
    >
      <ArbeitsstundenDashboard />
    </AppPageShell>
  );
}
