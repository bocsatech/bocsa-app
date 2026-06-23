import AppPageShell from "../components/AppPageShell";

export default function UrlaubPage() {
  return (
    <AppPageShell activeHref="/urlaub" subtitle="Betrieb">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>Urlaub</h1>
          <p style={{ margin: "10px 0 0", color: "var(--muted, #6b7280)" }}>
            Urlaubsanträge und Abwesenheiten — demnächst.
          </p>
        </div>
      </div>
    </AppPageShell>
  );
}
