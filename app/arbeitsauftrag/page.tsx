"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ArbeitsauftragForm from "../components/ArbeitsauftragForm";
import ArbeitsauftragList from "../components/ArbeitsauftragList";
import { shouldShowArbeitsauftragDetail } from "../../lib/arbeitsauftrag-routes";
import type { WorkOrderListFilters } from "../../lib/work-orders";

function readListFilters(searchParams: URLSearchParams): Partial<WorkOrderListFilters> {
  return {
    geraetenummer: searchParams.get("geraetenummer") ?? "",
    bearbeiter: searchParams.get("bearbeiter") ?? "",
    filiale: searchParams.get("filiale") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function ArbeitsauftragPageContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get("machineId");

  if (machineId && shouldShowArbeitsauftragDetail(searchParams)) {
    const auftragId = searchParams.get("auftragId");
    return (
      <ArbeitsauftragForm
        key={`${machineId}-${auftragId ?? searchParams.get("status") ?? searchParams.get("type") ?? "new"}-${searchParams.get("edit") === "1" ? "edit" : "view"}`}
        machineId={machineId}
        auftragId={auftragId}
        initialType={searchParams.get("status") ?? searchParams.get("type")}
        autoPrint={searchParams.get("print") === "1"}
        editMode={searchParams.get("edit") === "1"}
      />
    );
  }

  const returnMachineId = searchParams.get("machineId")?.trim() ?? "";

  return (
    <ArbeitsauftragList
      key={`list-${searchParams.toString()}`}
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
      <ArbeitsauftragPageContent />
    </Suspense>
  );
}
