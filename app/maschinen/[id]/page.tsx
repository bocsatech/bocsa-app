"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppShellScrollBody, usePublicScrollBody } from "../../../lib/use-mobile-scroll-body";

const PublicMachineMeldung = dynamic(() => import("./PublicMachineMeldung"), {
  loading: () => (
    <main className="publicMachinePage">
      <section className="publicMachineCard">
        <p className="scanHint">Maschinendaten werden geladen…</p>
      </section>
    </main>
  ),
});

const MachineDetailStaff = dynamic(() => import("./MachineDetailStaff"), {
  loading: () => (
    <main className="publicMachinePage">
      <section className="publicMachineCard">
        <p className="scanHint">Laden…</p>
      </section>
    </main>
  ),
});

type ViewMode = "pending" | "public" | "staff";

export default function MaschineDetailPage() {
  const params = useParams();
  const machineId = params.id as string;
  const [mode, setMode] = useState<ViewMode>("pending");
  usePublicScrollBody(mode !== "staff");
  useAppShellScrollBody(mode === "staff");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => response.json().catch(() => ({})))
      .then((result) => {
        if (cancelled) return;
        setMode(result?.user ? "staff" : "public");
      })
      .catch(() => {
        if (!cancelled) setMode("public");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "pending") {
    return (
      <main className="publicMachinePage">
        <section className="publicMachineCard">
          <p className="scanHint">Laden…</p>
        </section>
      </main>
    );
  }

  if (mode === "public") {
    return <PublicMachineMeldung machineId={machineId} />;
  }

  return <MachineDetailStaff machineId={machineId} />;
}
