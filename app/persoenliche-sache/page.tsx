import AppPageShell from "../components/AppPageShell";
import PersoenlicheSacheProfile from "../components/PersoenlicheSacheProfile";
import "./persoenliche-sache.css";

export default function PersoenlicheSachePage() {
  return (
    <AppPageShell
      activeHref="/persoenliche-sache"
      subtitle="Betrieb"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Persönliche Sache</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Eigene Benutzerdaten bearbeiten.
            </p>
          </div>
        </header>
      }
    >
      <section className="usersPageContent persoenlicheSachePage">
        <PersoenlicheSacheProfile />
      </section>
    </AppPageShell>
  );
}
