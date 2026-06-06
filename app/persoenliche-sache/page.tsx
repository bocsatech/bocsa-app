import AppPageShell from "../components/AppPageShell";

export default function PersoenlicheSachePage() {
  return (
    <AppPageShell activeHref="/persoenliche-sache" subtitle="Betrieb">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>Persönliche Sache</h1>
        </div>
      </div>
    </AppPageShell>
  );
}
