import AppPageShell from "./components/AppPageShell";
import HomeMenuCard from "./components/HomeMenuCard";
import HomeMenuIcon from "./components/HomeMenuIcons";
import { HOME_PHOTO_ICON_NAMES } from "../lib/home-menu-icons";
import { getBauArbeitsauftragMenuLabel, getBaupruefprotokollMenuLabel } from "../lib/local-host";
import { maschinenListHref } from "../lib/maschinen-routes";

type HomeMenuCardConfig = {
  label: string;
  icon: string;
  href: string;
};

function buildHomeMenuCards(): HomeMenuCardConfig[] {
  return [
    {
      label: "Kleingerät",
      icon: "kleingeraet",
      href: maschinenListHref({ geraettyp: "Kleingerät" }),
    },
    {
      label: "Elektrogerät",
      icon: "elektrogeraet",
      href: maschinenListHref({ geraettyp: "Elektrogerät" }),
    },
    { label: "Baumaschinen", icon: "grossgeraet", href: maschinenListHref() },
    {
      label: getBauArbeitsauftragMenuLabel(),
      icon: "arbeitsauftrag",
      href: "/arbeitsauftrag",
    },
    { label: getBaupruefprotokollMenuLabel(), icon: "pruefprotokoll", href: "/pruefprotokoll" },
    { label: "PKW", icon: "pkw", href: "/pkw/fahrzeuge" },
    { label: "PKW-Service", icon: "pkw-service", href: "/pkw-service" },
    { label: "Kunden", icon: "kunden", href: "/kunden" },
    { label: "Lager", icon: "lager", href: "/lager" },
    { label: "Ersatzteile", icon: "ersatzteile", href: "/lager" },
    { label: "Meldungen", icon: "meldungen", href: "/meldungen" },
    { label: "Lager-Meldungen", icon: "lager-meldungen", href: "/lager/meldungen" },
    { label: "Bewegungen", icon: "bewegungen", href: "/lager/bewegungen" },
    { label: "Inventur", icon: "inventur", href: "/lager/inventur" },
    { label: "Firma", icon: "filialen", href: "/firma" },
    { label: "QR-Code", icon: "qr", href: "/qr-code" },
  ];
}

/** Home-Kacheln — Menünamen aus der Sidebar (Demo-Icons) */
export default function HomePage() {
  const homeMenuCards = buildHomeMenuCards();

  return (
    <AppPageShell activeHref="/" subtitle="Betrieb" hideMobileBackBar>
      <div className="homeIconPage">
        <p className="homeIconLead">Schnellzugriff — Menüs</p>
        <div className="homeIconGrid">
          {homeMenuCards.map((card) => (
            <HomeMenuCard
              key={card.href}
              href={card.href}
              className={`homeIconCard${
                (HOME_PHOTO_ICON_NAMES as readonly string[]).includes(card.icon)
                  ? " homeIconCard--photo"
                  : ""
              }`}
            >
              <span className="homeIconCardLabel">{card.label}</span>
              <HomeMenuIcon name={card.icon} />
            </HomeMenuCard>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
