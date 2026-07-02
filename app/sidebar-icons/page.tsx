import Image from "next/image";
import Link from "next/link";
import manifest from "../../public/icons/sidebar/demo/manifest.json";

export const metadata = {
  title: "Sidebar Menü — Icon Demo",
  description: "Demo-PNGs: solid weiße Icons auf orangem Sidebar-Hintergrund",
};

type DemoRow = (typeof manifest)[number];

const SECTIONS = [...new Set(manifest.map((row) => row.section))];

function rowsForSection(section: string): DemoRow[] {
  return manifest.filter((row) => row.section === section);
}

export default function SidebarIconsDemoPage() {
  return (
    <main className="sidebarIconsDemoPage">
      <header className="sidebarIconsDemoHeader">
        <h1>Sidebar Menü — Icon Demo</h1>
        <p className="subtitle">
          Solid weiße Icons auf orangem Hintergrund — wie in der App-Sidebar. Nur Demo-PNGs, noch
          nicht eingebaut. Neu erzeugen: <code>node scripts/generate-sidebar-menu-demo-images.mjs</code>
        </p>
        <p>
          <Link href="/">← Zurück zur App</Link>
          {" · "}
          <Link href="/home-icons">Home-Icons</Link>
        </p>
      </header>

      <figure className="sidebarIconsDemoPreviewImage">
        <Image
          src="/icons/sidebar/demo/full-sidebar.png"
          alt="Vollständige Sidebar-Demo mit allen Menüpunkten"
          width={320}
          height={1200}
          priority
          unoptimized
          className="sidebarIconsDemoFullSidebar"
        />
        <figcaption>
          Gesamtansicht —{" "}
          <a href="/icons/sidebar/demo/full-sidebar.png" download>
            full-sidebar.png
          </a>
        </figcaption>
      </figure>

      {SECTIONS.map((section) => (
        <section key={section} className="sidebarIconsDemoSectionBlock">
          <h2>{section}</h2>
          <ul className="sidebarIconsDemoRowGrid">
            {rowsForSection(section).map((row) => (
              <li key={row.slug} className="sidebarIconsDemoRowCard">
                <Image
                  src={row.rowPng}
                  alt={row.label}
                  width={320}
                  height={44}
                  unoptimized
                />
                <div className="sidebarIconsDemoRowMeta">
                  <strong>{row.label}</strong>
                  {row.icon ? (
                    <div className="sidebarIconsDemoRowIconOnly">
                      <Image
                        src={row.iconPng!}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <span className="sidebarIconsDemoRowNoIcon">Untermenü — nur Text</span>
                  )}
                  <a href={row.rowPng} download>
                    row PNG
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
