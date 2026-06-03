"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PkwArbeitsauftragList from "../../components/PkwArbeitsauftragList";
import {
  buildPkwArbeitsauftragDetailHref,
  shouldShowPkwArbeitsauftragDetail,
} from "../../../lib/pkw-arbeitsauftrag-routes";
import type { PkwWorkOrderListFilters } from "../../../lib/pkw-work-orders";

function readListFilters(searchParams: URLSearchParams): Partial<PkwWorkOrderListFilters> {
  return {
    kennzeichen: searchParams.get("kennzeichen") ?? "",
    auftrag: searchParams.get("auftrag") ?? searchParams.get("auftragNr") ?? "",
    bearbeiter: searchParams.get("bearbeiter") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
    kunde: searchParams.get("kunde") ?? "",
  };
}

function PkwArbeitsauftragListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldShowPkwArbeitsauftragDetail(searchParams)) return;

    const fahrzeugId = searchParams.get("fahrzeugId");
    if (!fahrzeugId) return;

    router.replace(
      buildPkwArbeitsauftragDetailHref({
        fahrzeugId,
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

  if (shouldShowPkwArbeitsauftragDetail(searchParams)) {
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

  const returnFahrzeugId = searchParams.get("fahrzeugId")?.trim() ?? "";

  return (
    <PkwArbeitsauftragList
      initialFilters={readListFilters(searchParams)}
      returnFahrzeugId={returnFahrzeugId || undefined}
    />
  );
}

export default function PkwArbeitsauftragPage() {
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
      <PkwArbeitsauftragListPageContent />
    </Suspense>
  );
}
