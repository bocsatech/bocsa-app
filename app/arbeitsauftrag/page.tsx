"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArbeitsauftragList from "../components/ArbeitsauftragList";
import {
  buildArbeitsauftragDetailHref,
  shouldShowArbeitsauftragDetail,
} from "../../lib/arbeitsauftrag-routes";
import type { WorkOrderListFilters } from "../../lib/work-orders";

function readListFilters(searchParams: URLSearchParams): Partial<WorkOrderListFilters> {
  return {
    geraetenummer: searchParams.get("geraetenummer") ?? "",
    auftrag: searchParams.get("auftrag") ?? searchParams.get("auftragNr") ?? "",
    auftragsart: searchParams.get("auftragsart") ?? searchParams.get("type") ?? "",
    bearbeiter: searchParams.get("bearbeiter") ?? "",
    filiale: searchParams.get("filiale") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function ArbeitsauftragListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldShowArbeitsauftragDetail(searchParams)) return;

    const machineId = searchParams.get("machineId");
    if (!machineId) return;

    router.replace(
      buildArbeitsauftragDetailHref({
        machineId,
        auftragId: searchParams.get("auftragId"),
        status: searchParams.get("status"),
        type: searchParams.get("type"),
        edit: searchParams.get("edit") === "1",
        print: searchParams.get("print") === "1",
        from: searchParams.get("from"),
        new: searchParams.get("new") === "1",
      })
    );
  }, [router, searchParams]);

  if (shouldShowArbeitsauftragDetail(searchParams)) {
    return (
      <main className="workorderPage appShell">
        <aside className="sidebar" aria-hidden />
        <section className="pageContent">
          <div className="appPageScroll">
            <div className="welcomeCard">
              <h2>Laden…</h2>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const returnMachineId = searchParams.get("machineId")?.trim() ?? "";

  return (
    <ArbeitsauftragList
      initialFilters={readListFilters(searchParams)}
      returnMachineId={returnMachineId || undefined}
    />
  );
}

export default function ArbeitsauftragPage() {
  return (
    <Suspense
      fallback={
        <main className="workorderPage appShell">
          <aside className="sidebar" aria-hidden />
          <section className="pageContent">
            <div className="appPageScroll">
              <div className="welcomeCard">
                <h2>Laden…</h2>
              </div>
            </div>
          </section>
        </main>
      }
    >
      <ArbeitsauftragListPageContent />
    </Suspense>
  );
}
