import Link from "next/link";
import AppPageShell from "./components/AppPageShell";

const homeCards = [
  { label: "Kleingerät", icon: "small", href: "/maschinen?geraettyp=Kleingerät" },
  { label: "Großgerät", icon: "large", href: "/maschinen?geraettyp=Großgerät" },
  { label: "Elektrogerät 230V", icon: "plug230", href: "/maschinen?geraettyp=Elektrogerät" },
  { label: "Elektrogerät 400V", icon: "plug400", href: "/maschinen?geraettyp=Elektrogerät" },
  { label: "PKW", icon: "car", href: "/maschinen?geraettyp=PKW" },
  { label: "Suchen", icon: "search", href: "/maschinen" },
  { label: "QR scannen", icon: "qr", href: "/qr-code" },
];

export default function HomePage() {
  return (
    <AppPageShell activeHref="/" subtitle="Betrieb">
      <div className="homeIconPage">
        <div className="homeIconGrid">
          {homeCards.map((card) => (
            <Link key={card.label} href={card.href} className="homeIconCard">
              <span>{card.label}</span>
              <HomeIcon name={card.icon} />
            </Link>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}

function HomeIcon({ name }: { name: string }) {
  if (name === "small") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path className="iconOrange" d="M24 82h58l18-32 36 22-10 18H24z" />
        <path className="iconBlack" d="M73 45h18v49H73zM92 42l43 25-7 13-43-25z" />
        <circle className="iconBlack" cx="67" cy="86" r="10" />
        <path className="iconStroke" d="M32 82c8-22 21-35 41-37" />
      </svg>
    );
  }

  if (name === "large") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path className="iconOrange" d="M74 25h28l22 35v23H86L62 64z" />
        <path className="iconBlack" d="M92 37h20v27H92zM45 82h83v18H45z" />
        <path className="iconStroke" d="M69 36 42 80l22 10 24-43" />
        <circle className="iconBlack" cx="62" cy="91" r="6" />
        <circle className="iconBlack" cx="111" cy="91" r="6" />
      </svg>
    );
  }

  if (name === "plug230") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path className="iconOrange" d="M58 52h44v26c0 15-10 25-22 25S58 93 58 78z" />
        <path className="iconBlack" d="M65 22h12v32H65zM84 22h12v32H84zM78 98h16v14H78z" />
        <path className="iconStroke" d="M94 106c18 0 28-8 28-24" />
      </svg>
    );
  }

  if (name === "plug400") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path className="iconOrange" d="M43 42h58l20 20v38H43z" />
        <path className="iconStroke" d="M43 42c-10 8-16 18-16 31s6 24 16 31M101 42c16 4 27 16 27 31s-11 27-27 31" />
        <circle className="iconBlack" cx="62" cy="62" r="6" />
        <circle className="iconBlack" cx="82" cy="62" r="6" />
        <circle className="iconBlack" cx="62" cy="82" r="6" />
        <circle className="iconBlack" cx="82" cy="82" r="6" />
      </svg>
    );
  }

  if (name === "car") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <path className="iconOrange" d="M35 73 50 43h60l15 30 11 8v20H24V81z" />
        <path className="iconBlack" d="M56 50h48l10 23H45z" />
        <circle className="iconBlack" cx="52" cy="100" r="10" />
        <circle className="iconBlack" cx="108" cy="100" r="10" />
        <path className="iconWhite" d="M35 77h24v8H35zM101 77h24v8h-24z" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg viewBox="0 0 160 120" aria-hidden="true">
        <circle className="iconStrokeWide" cx="68" cy="58" r="30" />
        <path className="iconOrangeStroke" d="m91 81 31 31" />
        <path className="iconBlack" d="M48 54h40v8H48z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <path className="iconBlack" d="M35 24h32v32H35zM93 24h32v32H93zM35 82h32v32H35z" />
      <path className="iconOrange" d="M75 24h10v10H75zM75 46h10v10H75zM93 70h10v10H93zM115 70h10v10h-10zM75 82h10v32H75zM93 92h32v22H93z" />
      <path className="iconWhite" d="M43 32h16v16H43zM101 32h16v16h-16zM43 90h16v16H43z" />
    </svg>
  );
}
