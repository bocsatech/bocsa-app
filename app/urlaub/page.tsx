import AppPageShell from "../components/AppPageShell";
import UrlaubHorizCalendar from "./UrlaubHorizCalendar";
import "./urlaub.css";

export default function UrlaubPage() {
  return (
    <AppPageShell activeHref="/urlaub" subtitle="Betrieb">
      <div className="urlaubPage">
        <header className="urlaubPageHeader">
          <h1>Urlaub</h1>
          <p>Horizontale Timeline — frei scrollen, österreichische Feiertage.</p>
        </header>
        <UrlaubHorizCalendar />
      </div>
    </AppPageShell>
  );
}
