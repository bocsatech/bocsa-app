"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ArbeitsauftragForm from "../../components/ArbeitsauftragForm";
import {
  ARBEITSAUFTRAG_LIST_PATH,
  shouldShowArbeitsauftragDetail,
} from "../../../lib/arbeitsauftrag-routes";

function ArbeitsauftragDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const machineId = searchParams.get("machineId");
  const showDetail = Boolean(machineId && shouldShowArbeitsauftragDetail(searchParams));

  useEffect(() => {
    if (!showDetail) {
      router.replace(ARBEITSAUFTRAG_LIST_PATH);
    }
  }, [router, showDetail]);

  if (!showDetail || !machineId) {
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

  const auftragId = searchParams.get("auftragId");
  const auftragNr = searchParams.get("auftragNr");

  return (
    <ArbeitsauftragForm
      key={`${machineId}-${auftragId ?? auftragNr ?? searchParams.get("status") ?? searchParams.get("type") ?? "new"}-${searchParams.get("edit") === "1" ? "edit" : "view"}`}
      machineId={machineId}
      auftragId={auftragId}
      initialAuftragNr={auftragNr}
      initialType={searchParams.get("status") ?? searchParams.get("type")}
      autoPrint={searchParams.get("print") === "1"}
      editMode={searchParams.get("edit") === "1"}
    />
  );
}

export default function ArbeitsauftragDetailPage() {
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
      <ArbeitsauftragDetailPageContent />
    </Suspense>
  );
}
