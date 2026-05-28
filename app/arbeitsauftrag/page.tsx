"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ArbeitsauftragForm from "../components/ArbeitsauftragForm";
import ArbeitsauftragList from "../components/ArbeitsauftragList";
import type { WorkOrderListFilters } from "../../lib/work-orders";

function readListFilters(searchParams: URLSearchParams): Partial<WorkOrderListFilters> {
  return {
    geraetenummer: searchParams.get("geraetenummer") ?? "",
    auftrag: searchParams.get("auftrag") ?? "",
    auftragsart: searchParams.get("auftragsart") ?? "",
    bearbeiter: searchParams.get("bearbeiter") ?? "",
    filiale: searchParams.get("filiale") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function shouldShowWorkOrderForm(searchParams: URLSearchParams) {
  const machineId = searchParams.get("machineId");
  if (!machineId) return false;

  const auftragId = searchParams.get("auftragId");
  const isNew = searchParams.get("new") === "1";
  const hasType = Boolean(
    searchParams.get("status")?.trim() || searchParams.get("type")?.trim()
  );

  return Boolean(auftragId || isNew || hasType);
}

function ArbeitsauftragPageContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get("machineId");

  if (machineId && shouldShowWorkOrderForm(searchParams)) {
    const auftragId = searchParams.get("auftragId");
    return (
      <ArbeitsauftragForm
        key={`${machineId}-${auftragId ?? searchParams.get("status") ?? searchParams.get("type") ?? "new"}`}
        machineId={machineId}
        auftragId={auftragId}
        initialType={searchParams.get("status") ?? searchParams.get("type")}
        autoPrint={searchParams.get("print") === "1"}
      />
    );
  }

  return (
    <ArbeitsauftragList
      key={`list-${searchParams.toString()}`}
      initialFilters={readListFilters(searchParams)}
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
      <ArbeitsauftragPageContent />
    </Suspense>
  );
}
