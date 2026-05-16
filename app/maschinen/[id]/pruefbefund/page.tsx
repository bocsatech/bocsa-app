"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy route → neues §11-Prüfprotokoll */
export default function PruefbefundRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const machineId = params?.id ? String(params.id) : "";

  useEffect(() => {
    if (!machineId) return;
    router.replace(`/pruefprotokoll/form?machineId=${encodeURIComponent(machineId)}`);
  }, [machineId, router]);

  return (
    <main className="workorderPage appShell">
      <p className="scanHint" style={{ padding: 24 }}>
        Weiterleitung zum Prüfprotokoll…
      </p>
    </main>
  );
}
