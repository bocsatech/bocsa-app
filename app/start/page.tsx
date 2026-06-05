import Link from "next/link";
import HomeMenuIcon from "../components/HomeMenuIcons";
import MobileBackBar from "../components/MobileBackBar";
import PkwPortalSessionJanitor from "../components/PkwPortalSessionJanitor";
import PwaInstallHint from "../components/PwaInstallHint";

export const metadata = {
  title: "Bocsa App starten",
  description: "Kunde: Termin buchen · Mitarbeiter: Anmeldung",
};

export default function StartPage() {
  return (
    <main className="pwaStartPage pwaStartPageWithNav">
      <PkwPortalSessionJanitor />
      <header className="pwaStartHeader">
        <div className="sidebarMark">B</div>
        <div>
          <h1>Bocsa</h1>
          <p className="subtitle">Betrieb · PKW-Service · Lager</p>
        </div>
      </header>

      <p className="pwaStartLead">Was möchten Sie tun?</p>

      <div className="pwaStartGrid">
        <Link href="/pkw/buchen" className="pwaStartCard pwaStartCardKunde">
          <span className="pwaStartCardIconSvg" aria-hidden>
            <HomeMenuIcon name="pkw" />
          </span>
          <strong>Kunde</strong>
          <span className="pwaStartCardDesc">Termin buchen (Kennzeichen + PIN)</span>
        </Link>

        <Link href="/login" className="pwaStartCard pwaStartCardTeam">
          <span className="pwaStartCardIconSvg" aria-hidden>
            <HomeMenuIcon name="pkw-service" />
          </span>
          <strong>Mitarbeiter</strong>
          <span className="pwaStartCardDesc">Login für Werkstatt, Lager, PKW-Service</span>
        </Link>
      </div>

      <PwaInstallHint />

      <p className="pwaStartFootnote">
        QR am Fahrzeug öffnet direkt die <Link href="/pkw/buchen">Terminbuchung</Link>.
      </p>

      <MobileBackBar fallbackHref="/" alwaysVisible />
    </main>
  );
}
