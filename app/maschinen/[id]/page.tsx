"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePublicScrollBody } from "../../../lib/use-mobile-scroll-body";

const MOBILE_MQ = "(max-width: 760px)";

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

function MaschineDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQr = searchParams.get("fromQr") === "1";
  const machineId = params.id as string;
  const [mode, setMode] = useState<ViewMode>("pending");
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const appQrScan = fromQr && isMobile === true;
  usePublicScrollBody(!appQrScan && mode !== "staff");

  useEffect(() => {
    if (fromQr && isMobile) return;

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
  }, [fromQr, isMobile]);

  if (appQrScan) {
    return (
      <PublicMachineMeldung
        machineId={machineId}
        appQrNav={{
          onBearbeiten: () => router.replace(`/maschinen/${machineId}`),
          onZuruck: () => router.push("/qr-code?scan=1"),
        }}
      />
    );
  }

  if (fromQr && isMobile === null) {
    return (
      <main className="publicMachinePage">
        <section className="publicMachineCard">
          <p className="scanHint">Laden…</p>
        </section>
      </main>
    );
  }

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

export default function MaschineDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="publicMachinePage">
          <section className="publicMachineCard">
            <p className="scanHint">Laden…</p>
          </section>
        </main>
      }
    >
      <MaschineDetailPageContent />
    </Suspense>
  );
}
