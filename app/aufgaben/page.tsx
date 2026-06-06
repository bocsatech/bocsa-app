import AppPageShell from "../components/AppPageShell";

export default function AufgabenPage() {
  return (
    <AppPageShell activeHref="/aufgaben" subtitle="Betrieb">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>Aufgaben</h1>
        </div>
      </div>
    </AppPageShell>
  );
}
