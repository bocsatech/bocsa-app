"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SIDEBAR_MENU_DEMO_SECTIONS,
  SIDEBAR_MENU_ICON_IDS,
  SidebarMenuIconGlyph,
  type SidebarMenuIconId,
} from "../../lib/sidebar-menu-icon-demo";

const ICON_LABELS: Partial<Record<SidebarMenuIconId, string>> = {
  home: "Home",
  baumaschinen: "Baumaschinen",
  baugeraete: "Baugeräte",
  arbeitsauftrag: "Arbeitsauftrag",
  pruefprotokoll: "Prüfprotokoll",
  "maschine-hinzufuegen": "Maschine hinzufügen",
  "nummern-codes": "Nummern-Codes",
  qr: "QR-Code",
  geraetgruppen: "Gerätegruppen",
  pkw: "PKW",
  fahrzeug: "Fahrzeug",
  "fahrzeug-hinzufuegen": "Fahrzeug hinzufügen",
  kunden: "Kunden",
  "pkw-gruppen": "PKW-Gruppen",
  "pkw-service": "PKW-Service",
  lager: "Lager",
  ersatzteile: "Ersatzteile",
  reservierungen: "Reservierungen",
  "lager-meldungen": "Lager-Meldungen",
  bewegungen: "Bewegungen",
  inventur: "Inventur",
  meldungen: "Meldungen",
  arbeitsstunden: "Arbeitsstunden",
  rechnungen: "Rechnungen",
  aufgaben: "Aufgaben",
  nachrichten: "Nachrichten",
  urlaub: "Urlaub",
  stammdaten: "Stammdaten",
  "meine-menu": "Persönliche Menu",
  firma: "Firma",
  users: "Benutzer",
  groups: "Gruppen",
  einstellungen: "Einstellungen",
  admin: "Admin",
  baugeraet: "Baugerät",
  "admin-uebersicht": "Übersicht",
};

function SidebarPreviewRow({
  label,
  icon,
  level = 0,
  parent = false,
  active = false,
}: {
  label: string;
  icon: SidebarMenuIconId;
  level?: 0 | 1 | 2;
  parent?: boolean;
  active?: boolean;
}) {
  const className = [
    "sidebarIconsDemoRow",
    level === 1 ? "sidebarIconsDemoRow--sub" : "",
    level === 2 ? "sidebarIconsDemoRow--nested" : "",
    parent ? "sidebarIconsDemoRow--parent" : "",
    active ? "sidebarIconsDemoRow--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = parent ? "button" : "div";

  return (
    <Tag type={parent ? "button" : undefined} className={className}>
      <SidebarMenuIconGlyph icon={icon} size={parent ? 18 : level === 2 ? 16 : 18} />
      <span>{label}</span>
      {parent ? <span className="sidebarIconsDemoChevron" aria-hidden /> : null}
    </Tag>
  );
}

export default function SidebarIconsDemoPage() {
  const [activeIcon, setActiveIcon] = useState<SidebarMenuIconId>("home");

  const uniqueIcons = useMemo(
    () => SIDEBAR_MENU_ICON_IDS.filter((id, index, all) => all.indexOf(id) === index),
    []
  );

  return (
    <main className="sidebarIconsDemoPage">
      <header className="sidebarIconsDemoHeader">
        <h1>Sidebar Menü — Icon Demo</h1>
        <p className="subtitle">
          Vorschlag: 24×24 Strich-Icons (<code>currentColor</code>), passend zum orangen Sidebar.
          Nur Demo — noch nicht in der App eingebaut.
        </p>
        <p>
          <Link href="/">← Zurück zur App</Link>
          {" · "}
          <Link href="/home-icons">Home-Icons (PNG/SVG)</Link>
        </p>
      </header>

      <figure className="sidebarIconsDemoPreviewImage">
        <Image
          src="/icons/sidebar/demo-preview.png"
          alt="Sidebar Icon Demo — Vorschau mit orangem Menü und Icon-Galerie"
          width={1280}
          height={720}
          priority
          unoptimized
        />
        <figcaption>
          Statische Vorschau — interaktive Demo unten. PNG:{" "}
          <a href="/icons/sidebar/demo-preview.png" download>
            demo-preview.png
          </a>
        </figcaption>
      </figure>

      <div className="sidebarIconsDemoLayout">
        <section className="sidebarIconsDemoPreview" aria-label="Sidebar-Vorschau">
          <h2>Sidebar-Vorschau</h2>
          <p className="sidebarIconsDemoHint">Klick auf ein Icon in der Galerie → aktiver Zustand</p>
          <div className="sidebarIconsDemoMock">
            <div className="sidebarIconsDemoMockHeader">
              <div className="sidebarIconsDemoMark">B</div>
              <div>
                <strong>Bocsa</strong>
                <span>Betrieb</span>
              </div>
            </div>
            <nav className="sidebarIconsDemoMockNav">
              {SIDEBAR_MENU_DEMO_SECTIONS.map((section) => (
                <div key={section.label} className="sidebarIconsDemoSection">
                  <p className="sidebarIconsDemoSectionLabel">{section.label}</p>
                  {section.items.map((item) => (
                    <SidebarPreviewRow
                      key={`${section.label}-${item.label}-${item.level ?? 0}`}
                      label={item.label}
                      icon={item.icon}
                      level={item.level}
                      parent={item.parent}
                      active={item.icon === activeIcon && !item.parent}
                    />
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </section>

        <section className="sidebarIconsDemoCatalog" aria-label="Icon-Galerie">
          <h2>Icon-Galerie</h2>
          <ul className="sidebarIconsDemoGrid">
            {uniqueIcons.map((icon) => (
              <li key={icon}>
                <button
                  type="button"
                  className={`sidebarIconsDemoCard${activeIcon === icon ? " sidebarIconsDemoCard--picked" : ""}`}
                  onClick={() => setActiveIcon(icon)}
                >
                  <div className="sidebarIconsDemoCardStates">
                    <div className="sidebarIconsDemoState sidebarIconsDemoState--idle">
                      <SidebarMenuIconGlyph icon={icon} size={22} />
                      <span>inaktiv</span>
                    </div>
                    <div className="sidebarIconsDemoState sidebarIconsDemoState--active">
                      <SidebarMenuIconGlyph icon={icon} size={22} />
                      <span>aktiv</span>
                    </div>
                  </div>
                  <strong>{ICON_LABELS[icon] ?? icon}</strong>
                  <code>{icon}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
