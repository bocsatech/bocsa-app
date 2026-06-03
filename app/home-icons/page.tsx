import Image from "next/image";
import Link from "next/link";
import { HOME_MENU_ICON_LABELS, HOME_MENU_ICON_NAMES } from "../../lib/home-menu-icons";

export const metadata = {
  title: "Home Demo-Icons",
  description: "Vorschau der generierten Menü-Icons (PNG/SVG)",
};

export default function HomeIconsGalleryPage() {
  return (
    <main className="homeIconsGalleryPage">
      <header className="homeIconsGalleryHeader">
        <h1>Home Demo-Icons</h1>
        <p className="subtitle">
          PNG-Dateien in <code>public/icons/home/</code> — neu erzeugen:{" "}
          <code>npm run generate:home-icons</code>
        </p>
        <p>
          <Link href="/">← Zurück zur App (Home)</Link>
          {" · "}
          <Link href="/start">Start (PWA)</Link>
        </p>
      </header>

      <ul className="homeIconsGalleryGrid">
        {HOME_MENU_ICON_NAMES.map((name) => (
          <li key={name} className="homeIconsGalleryCard">
            <Image
              src={`/icons/home/${name}.png`}
              alt={HOME_MENU_ICON_LABELS[name] ?? name}
              width={320}
              height={240}
              unoptimized
            />
            <strong>{HOME_MENU_ICON_LABELS[name] ?? name}</strong>
            <div className="homeIconsGalleryLinks">
              <a href={`/icons/home/${name}.png`} download>
                PNG
              </a>
              <a href={`/icons/home/${name}.svg`} download>
                SVG
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
