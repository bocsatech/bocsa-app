import AppPageShell from "../components/AppPageShell";

export default function FilialenPage() {
  return (
    <AppPageShell activeHref="/filialen" subtitle="Betrieb">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>Filialen</h1>
          <p>Diese Seite gehört zum Menüpunkt Filialen.</p>
          <a className="backButton" href="/">
            Zur Startseite
          </a>
        </div>
      </div>
    </AppPageShell>
  );
}
