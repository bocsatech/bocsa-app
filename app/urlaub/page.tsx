import AppPageShell from "../components/AppPageShell";
import UrlaubHorizCalendar from "./UrlaubHorizCalendar";
import "./urlaub.css";

export default function UrlaubPage() {
  return (
    <AppPageShell activeHref="/urlaub" subtitle="Betrieb">
      <div className="urlaubPage">
        <header className="urlaubPageHeader">
          <h1>Urlaub</h1>
        </header>
        <UrlaubHorizCalendar />
      </div>
    </AppPageShell>
  );
}
