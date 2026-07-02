import type { ReactNode } from "react";

/** Demo-only sidebar icon set — stroke glyphs, 24×24, currentColor. */
export type SidebarMenuIconId =
  | "home"
  | "baumaschinen"
  | "baugeraete"
  | "arbeitsauftrag"
  | "pruefprotokoll"
  | "maschine-hinzufuegen"
  | "nummern-codes"
  | "qr"
  | "geraetgruppen"
  | "pkw"
  | "fahrzeug"
  | "fahrzeug-hinzufuegen"
  | "kunden"
  | "pkw-gruppen"
  | "pkw-service"
  | "lager"
  | "ersatzteile"
  | "reservierungen"
  | "lager-meldungen"
  | "bewegungen"
  | "inventur"
  | "meldungen"
  | "arbeitsstunden"
  | "rechnungen"
  | "aufgaben"
  | "nachrichten"
  | "urlaub"
  | "stammdaten"
  | "meine-menu"
  | "firma"
  | "users"
  | "groups"
  | "einstellungen"
  | "admin"
  | "baugeraet"
  | "admin-uebersicht";

type IconPaths = Record<SidebarMenuIconId, ReactNode>;

const ICON_PATHS: IconPaths = {
  home: (
    <>
      <path d="M5 10.5 12 5l7 5.5" />
      <path d="M7 10.5V20h10v-9.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  baumaschinen: (
    <>
      <path d="M4 17h16" />
      <path d="M7 17V11l3-4h4l3 4v6" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
      <path d="M10 7V5h4v2" />
    </>
  ),
  baugeraete: (
    <>
      <rect x="5" y="8" width="14" height="10" rx="1.5" />
      <path d="M9 8V6h6v2" />
      <path d="M8 14h8" />
      <circle cx="9" cy="17.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17.5" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  arbeitsauftrag: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </>
  ),
  pruefprotokoll: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m10 13 2 2 4-4" />
    </>
  ),
  "maschine-hinzufuegen": (
    <>
      <path d="M6 18h12" />
      <path d="M12 6v8M8 10h8" />
      <path d="M5 18l2-6h10l2 6" />
    </>
  ),
  "nummern-codes": (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <path d="M16 16h4M16 19h4" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <path d="M14 14h2v2h-2zM17 17h3v3h-3zM14 20h2" />
    </>
  ),
  geraetgruppen: (
    <>
      <path d="M4 7h16M4 12h16M4 17h10" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  pkw: (
    <>
      <path d="M5 16h14" />
      <path d="M7 16l1.5-5h7L17 16" />
      <circle cx="8" cy="16" r="1.5" />
      <circle cx="16" cy="16" r="1.5" />
      <path d="M9 11h6" />
    </>
  ),
  fahrzeug: (
    <>
      <path d="M5 16h14" />
      <path d="M7 16l1.5-5h7L17 16" />
      <circle cx="8" cy="16" r="1.5" />
      <circle cx="16" cy="16" r="1.5" />
    </>
  ),
  "fahrzeug-hinzufuegen": (
    <>
      <path d="M5 16h14" />
      <path d="M7 16l1.5-5h7L17 16" />
      <path d="M12 5v4M10 7h4" />
    </>
  ),
  kunden: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </>
  ),
  "pkw-gruppen": (
    <>
      <path d="M4 16h6M14 16h6" />
      <path d="M6 16l1-4h2l1 4M15 16l1-4h2l1 4" />
      <circle cx="7" cy="16" r="1" />
      <circle cx="17" cy="16" r="1" />
    </>
  ),
  "pkw-service": (
    <>
      <path d="M5 16h11" />
      <path d="M7 16l1.5-4.5h5L15 16" />
      <circle cx="8" cy="16" r="1.25" />
      <path d="M17.5 10.5 20 13l-2 2-2-2" />
      <path d="M18 8v5" />
    </>
  ),
  lager: (
    <>
      <path d="M4 10 12 6l8 4v8H4z" />
      <path d="M9 18v-5h6v5" />
      <path d="M9 13h6" />
    </>
  ),
  ersatzteile: (
    <>
      <path d="M12 4 8 6v4l-4 2v4l4 2v4l4 2 4-2v-4l4-2v-4l-4-2V6z" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  reservierungen: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M9 8h6M9 12h6" />
      <path d="M15 4v3a1.5 1.5 0 0 0 3 0V4" />
    </>
  ),
  "lager-meldungen": (
    <>
      <path d="M6 8h12v10H6z" />
      <path d="M9 8V6h6v2" />
      <path d="M12 4a2 2 0 0 1 2 2" />
      <path d="M12 13v3" />
      <circle cx="12" cy="11" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  bewegungen: (
    <>
      <path d="M7 7h10M7 7l3-3M17 17H7M17 17l-3 3" />
    </>
  ),
  inventur: (
    <>
      <path d="M8 6h8v14H8z" />
      <path d="M10 10h4M10 14h4M10 18h2" />
      <path d="M12 4v2" />
    </>
  ),
  meldungen: (
    <>
      <path d="M12 4a5 5 0 0 1 5 5v2l1.5 2.5H5.5L7 11V9a5 5 0 0 1 5-5z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  arbeitsstunden: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  rechnungen: (
    <>
      <path d="M7 4h10v16l-2-1.5L13 20l-2-1.5L9 20l-2-1.5z" />
      <path d="M10 9h4M10 13h4" />
    </>
  ),
  aufgaben: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h4" />
      <path d="m8 9 1 1 2-2" />
    </>
  ),
  nachrichten: (
    <>
      <path d="M5 6h14v10H9l-4 3V6z" />
      <path d="M9 10h6" />
    </>
  ),
  urlaub: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 14s1.5-3 4-3 4 3 4 3" />
      <circle cx="10" cy="10" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14" cy="10" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  stammdaten: (
    <>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <circle cx="12" cy="10" r="2" />
      <path d="M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
    </>
  ),
  "meine-menu": (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M6 20c0-3.5 2.7-6.5 6-6.5s6 3 6 6.5" />
    </>
  ),
  firma: (
    <>
      <rect x="5" y="8" width="14" height="12" rx="1" />
      <path d="M9 8V6h6v2" />
      <path d="M9 13h2M13 13h2M9 17h2M13 17h2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="2.5" />
      <circle cx="16" cy="10" r="2" />
      <path d="M4 19c0-2.5 2.2-4.5 5-4.5M14 19c0-2 1.5-3.5 3.5-3.8" />
    </>
  ),
  groups: (
    <>
      <circle cx="8" cy="9" r="2" />
      <circle cx="16" cy="9" r="2" />
      <path d="M4 18c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M12 18c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
    </>
  ),
  einstellungen: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  admin: (
    <>
      <path d="M12 4 5 7v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V7z" />
      <path d="m10 12 1.5 1.5L14 11" />
    </>
  ),
  baugeraet: (
    <>
      <path d="M6 14h12" />
      <path d="M8 14V9l2-3h4l2 3v5" />
      <path d="M10 6h4" />
    </>
  ),
  "admin-uebersicht": (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </>
  ),
};

export type SidebarMenuDemoItem = {
  icon: SidebarMenuIconId;
  label: string;
  level?: 0 | 1 | 2;
  parent?: boolean;
};

export type SidebarMenuDemoSection = {
  label: string;
  items: SidebarMenuDemoItem[];
};

/** Mirrors the current localhost sidebar menu (AppSidebar.tsx). */
export const SIDEBAR_MENU_DEMO_SECTIONS: SidebarMenuDemoSection[] = [
  {
    label: "Start",
    items: [{ icon: "home", label: "Home" }],
  },
  {
    label: "Betrieb",
    items: [
      { icon: "baumaschinen", label: "Baumaschinen", parent: true },
      { icon: "baugeraete", label: "Baugeräte", level: 1 },
      { icon: "arbeitsauftrag", label: "Arbeitsauftrag", level: 1 },
      { icon: "pruefprotokoll", label: "Prüfprotokol", level: 1 },
      { icon: "maschine-hinzufuegen", label: "Maschine hinzufügen", level: 1 },
      { icon: "nummern-codes", label: "Nummern-Codes", level: 1 },
      { icon: "qr", label: "QR-Code scannen", level: 1 },
      { icon: "geraetgruppen", label: "Gerätegruppen – Protokoll", level: 1 },
      { icon: "pkw", label: "PKW", parent: true },
      { icon: "fahrzeug", label: "Fahrzeug", level: 1 },
      { icon: "arbeitsauftrag", label: "Arbeitsauftrag", level: 1 },
      { icon: "fahrzeug-hinzufuegen", label: "Fahrzeug hinzufügen", level: 1 },
      { icon: "kunden", label: "Kunden", level: 1 },
      { icon: "pkw-gruppen", label: "PKW-Gruppen", level: 1 },
      { icon: "pkw-service", label: "PKW-Service", level: 1 },
      { icon: "kunden", label: "Kunden" },
      { icon: "lager", label: "Lager", parent: true },
      { icon: "ersatzteile", label: "Ersatzteile", level: 1 },
      { icon: "reservierungen", label: "Reservierungen", level: 1 },
      { icon: "lager-meldungen", label: "Meldungen", level: 1 },
      { icon: "bewegungen", label: "Bewegungen", level: 1 },
      { icon: "inventur", label: "Inventur", level: 1 },
      { icon: "rechnungen", label: "Rechnungen" },
    ],
  },
  {
    label: "Meldungen & Zeit",
    items: [
      { icon: "meldungen", label: "Meldungen" },
      { icon: "arbeitsstunden", label: "Arbeitsstunden" },
      { icon: "qr", label: "QR-Code" },
    ],
  },
  {
    label: "Personal",
    items: [
      { icon: "meine-menu", label: "Persönliche Menu", parent: true },
      { icon: "aufgaben", label: "Aufgaben", level: 1 },
      { icon: "nachrichten", label: "Nachrichten", level: 1 },
      { icon: "arbeitsstunden", label: "Arbeitsstunden", level: 1 },
      { icon: "urlaub", label: "Urlaub", level: 1 },
      { icon: "stammdaten", label: "Stammdaten", level: 1 },
    ],
  },
  {
    label: "System",
    items: [
      { icon: "einstellungen", label: "Einstellungen", parent: true },
      { icon: "firma", label: "Firma", level: 1 },
      { icon: "users", label: "Benutzer", level: 1 },
      { icon: "groups", label: "Gruppen", level: 1 },
      { icon: "admin", label: "Admin", parent: true },
      { icon: "admin-uebersicht", label: "Übersicht", level: 1 },
      { icon: "baugeraet", label: "Baugerät", level: 1, parent: true },
      { icon: "maschine-hinzufuegen", label: "Maschine hinzufügen", level: 2 },
      { icon: "nummern-codes", label: "Nummern-Codes", level: 2 },
      { icon: "qr", label: "QR-Code scannen", level: 2 },
      { icon: "geraetgruppen", label: "Gerätegruppen – Protokoll", level: 2 },
      { icon: "pkw", label: "PKW", level: 1, parent: true },
      { icon: "fahrzeug-hinzufuegen", label: "Fahrzeug hinzufügen", level: 2 },
      { icon: "pkw-gruppen", label: "PKW-Gruppen", level: 2 },
    ],
  },
];

export const SIDEBAR_MENU_ICON_IDS = Object.keys(ICON_PATHS) as SidebarMenuIconId[];

type GlyphProps = {
  icon: SidebarMenuIconId;
  size?: number;
  className?: string;
};

export function SidebarMenuIconGlyph({ icon, size = 20, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}
