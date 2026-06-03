"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PkwArbeitsauftragForm from "../../../components/PkwArbeitsauftragForm";
import {
  PKW_ARBEITSAUFTRAG_LIST_PATH,
  shouldShowPkwArbeitsauftragDetail,
} from "../../../../lib/pkw-arbeitsauftrag-routes";

function PkwArbeitsauftragDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fahrzeugId = searchParams.get("fahrzeugId");
  const showDetail = Boolean(fahrzeugId && shouldShowPkwArbeitsauftragDetail(searchParams));

  useEffect(() => {
    if (!showDetail) {
      router.replace(PKW_ARBEITSAUFTRAG_LIST_PATH);
    }
  }, [router, showDetail]);

  if (!showDetail || !fahrzeugId) {
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
    <PkwArbeitsauftragForm
      key={`${fahrzeugId}-${auftragId ?? auftragNr ?? searchParams.get("status") ?? searchParams.get("type") ?? "new"}-${searchParams.get("edit") === "1" ? "edit" : "view"}`}
      fahrzeugId={fahrzeugId}
      auftragId={auftragId}
      initialAuftragNr={auftragNr}
      initialType={searchParams.get("status") ?? searchParams.get("type")}
      autoPrint={searchParams.get("print") === "1"}
      editMode={searchParams.get("edit") === "1"}
    />
  );
}

export default function PkwArbeitsauftragDetailPage() {
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
      <PkwArbeitsauftragDetailPageContent />
    </Suspense>
  );
}
