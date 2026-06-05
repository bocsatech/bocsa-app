import Link from "next/link";
import StartPageEffects from "./StartPageEffects";
import MobileBackBar from "../components/MobileBackBar";
import PkwPortalSessionJanitor from "../components/PkwPortalSessionJanitor";

export const metadata = {
  title: "Bocsa App starten",
  description: "Kunde: Termin buchen · Mitarbeiter: Anmeldung",
};

export default function StartPage() {
  return (
    <main className="pwaStartPage pwaStartPageWithNav">
      <StartPageEffects />
      <PkwPortalSessionJanitor />
      <header className="pwaStartHeader">
        <div className="sidebarMark">B</div>
        <div>
          <h1>Bocsa</h1>
          <p className="subtitle">Betrieb · PKW-Service · Lager</p>
        </div>
      </header>

      <p className="pwaStartLead">Was möchten Sie tun?</p>

      <nav className="pwaStartChoices" aria-label="Anmeldung wählen">
        <Link href="/pkw/buchen" className="pwaStartChoice pwaStartChoiceKunde">
          <span className="pwaStartChoiceBadge" aria-hidden>
            K
          </span>
          <span className="pwaStartChoiceBody">
            <strong>Kunde</strong>
            <span className="pwaStartChoiceDesc">Termin buchen (Kennzeichen + PIN)</span>
          </span>
          <span className="pwaStartChoiceArrow" aria-hidden>
            →
          </span>
        </Link>

        <Link href="/login" className="pwaStartChoice pwaStartChoiceTeam">
          <span className="pwaStartChoiceBadge" aria-hidden>
            M
          </span>
          <span className="pwaStartChoiceBody">
            <strong>Mitarbeiter</strong>
            <span className="pwaStartChoiceDesc">Login für Werkstatt, Lager, PKW-Service</span>
          </span>
          <span className="pwaStartChoiceArrow" aria-hidden>
            →
          </span>
        </Link>
      </nav>

      <p className="pwaStartFootnote">
        QR am Fahrzeug öffnet direkt die <Link href="/pkw/buchen">Terminbuchung</Link>.
      </p>

      <MobileBackBar fallbackHref="/" alwaysVisible />
    </main>
  );
}
