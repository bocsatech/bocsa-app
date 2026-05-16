"use client";

import { Suspense } from "react";
import AppPageShell from "../components/AppPageShell";
import PruefprotokollList from "../components/PruefprotokollList";

export default function PruefprotokollPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref="/pruefprotokoll">
          <div className="welcomeCard">
            <h2>Laden…</h2>
          </div>
        </AppPageShell>
      }
    >
      <PruefprotokollList />
    </Suspense>
  );
}
