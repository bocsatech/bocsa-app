import AppPageShell from "../components/AppPageShell";
import PersoenlicheSacheProfile from "../components/PersoenlicheSacheProfile";
import "../persoenliche-sache/persoenliche-sache.css";
import "./stammdaten.css";

export default function StammdatenPage() {
  return (
    <AppPageShell
      activeHref="/stammdaten"
      subtitle="Betrieb"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Stammdaten</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              Persönliche und arbeitsbezogene Angaben.
            </p>
          </div>
        </header>
      }
    >
      <section className="usersPageContent persoenlicheSachePage stammdatenPage">
        <PersoenlicheSacheProfile />
      </section>
    </AppPageShell>
  );
}
