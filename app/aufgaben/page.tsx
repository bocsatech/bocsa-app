import AppPageShell from "../components/AppPageShell";
import AufgabenStundenView from "../components/AufgabenStundenView";
import "./aufgaben.css";

export default function AufgabenPage() {
  return (
    <AppPageShell
      activeHref="/aufgaben"
      subtitle="Betrieb"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Aufgaben</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Arbeitsstunden aus allen Arbeitsaufträgen · nach Tagen
            </p>
          </div>
        </header>
      }
    >
      <AufgabenStundenView />
    </AppPageShell>
  );
}
