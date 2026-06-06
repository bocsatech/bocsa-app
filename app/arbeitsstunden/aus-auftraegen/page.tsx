import AppPageShell from "../../components/AppPageShell";
import ArbeitsstundenAuftragView from "../../components/ArbeitsstundenAuftragView";
import "../arbeitsstunden.css";

export default function ArbeitsstundenAusAuftraegenPage() {
  return (
    <AppPageShell
      activeHref="/arbeitsstunden/aus-auftraegen"
      subtitle="Betrieb"
      contentClassName="asAuftragStundenShell"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Arbeitsstunden</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Aus Arbeitsaufträgen · nach Tagen
            </p>
          </div>
        </header>
      }
    >
      <ArbeitsstundenAuftragView />
    </AppPageShell>
  );
}
