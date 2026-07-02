export type SidebarMenuIconId =
  | "home"
  | "baumaschinen"
  | "arbeitsauftrag"
  | "pruefprotokoll"
  | "maschine-hinzufuegen"
  | "nummern-codes"
  | "qr"
  | "geraetgruppen"
  | "pkw"
  | "pkw-gruppen"
  | "fahrzeug-hinzufuegen"
  | "kunden"
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
  | "baugeraet";

/** Dateiname unter /icons/home/ oder /icons/sidebar/ */
export const SIDEBAR_MENU_ICON_FILES: Record<SidebarMenuIconId, string> = {
  home: "home",
  baumaschinen: "baumaschinen",
  arbeitsauftrag: "arbeitsauftrag",
  pruefprotokoll: "pruefprotokoll",
  "maschine-hinzufuegen": "baumaschinen",
  "nummern-codes": "nummern-codes",
  qr: "qr",
  geraetgruppen: "baumaschinen",
  pkw: "pkw",
  "pkw-gruppen": "pkw",
  "fahrzeug-hinzufuegen": "pkw",
  kunden: "kunden",
  "pkw-service": "pkw-service",
  lager: "lager",
  ersatzteile: "ersatzteile",
  reservierungen: "reservierungen",
  "lager-meldungen": "lager-meldungen",
  bewegungen: "bewegungen",
  inventur: "inventur",
  meldungen: "meldungen",
  arbeitsstunden: "arbeitsstunden",
  rechnungen: "rechnungen",
  aufgaben: "aufgaben",
  nachrichten: "nachrichten",
  urlaub: "urlaub",
  stammdaten: "stammdaten",
  "meine-menu": "meine-menu",
  firma: "filialen",
  users: "users",
  groups: "groups",
  einstellungen: "einstellungen",
  admin: "admin",
  baugeraet: "baumaschinen",
};

const HOME_ICON_FILES = new Set([
  "baumaschinen",
  "arbeitsauftrag",
  "pruefprotokoll",
  "pkw",
  "pkw-service",
  "kunden",
  "lager",
  "ersatzteile",
  "lager-meldungen",
  "bewegungen",
  "inventur",
  "meldungen",
  "arbeitsstunden",
  "filialen",
  "qr",
]);

export function getSidebarMenuIconSrc(iconId: SidebarMenuIconId): string {
  const file = SIDEBAR_MENU_ICON_FILES[iconId];
  if (HOME_ICON_FILES.has(file)) {
    return `/icons/home/${file}.svg`;
  }
  return `/icons/sidebar/${file}.svg`;
}

export function getSidebarMenuIconForHref(href: string, aktion?: string | null): SidebarMenuIconId | undefined {
  const base = href.split("?")[0];

  if (base === "/") return "home";
  if (base === "/admin") return "admin";
  if (base === "/maschinen" || base === "/maschinen/hinzufuegen") {
    if (aktion === "hinzufuegen") return "maschine-hinzufuegen";
    if (aktion === "geraetenummer-codes") return "nummern-codes";
    if (aktion === "qr") return "qr";
    return "baumaschinen";
  }
  if (base === "/maschinen/geraetgruppen") return "geraetgruppen";
  if (base === "/arbeitsauftrag") return "arbeitsauftrag";
  if (base === "/pruefprotokoll") return "pruefprotokoll";
  if (base === "/pkw/fahrzeuge") {
    if (aktion === "hinzufuegen") return "fahrzeug-hinzufuegen";
    return "pkw";
  }
  if (base === "/pkw/gruppen") return "pkw-gruppen";
  if (base === "/pkw/arbeitsauftrag") return "arbeitsauftrag";
  if (base === "/pkw-service" || base.startsWith("/pkw-service")) return "pkw-service";
  if (base === "/kunden") return "kunden";
  if (base === "/lager") return "ersatzteile";
  if (base === "/lager/reservierungen") return "reservierungen";
  if (base === "/lager/meldungen") return "lager-meldungen";
  if (base === "/lager/bewegungen") return "bewegungen";
  if (base === "/lager/inventur") return "inventur";
  if (base === "/meldungen") return "meldungen";
  if (base === "/arbeitsstunden" || base === "/arbeitsstunden/aus-auftraegen") return "arbeitsstunden";
  if (base === "/qr-code") return "qr";
  if (base === "/aufgaben") return "aufgaben";
  if (base === "/nachrichten") return "nachrichten";
  if (base === "/urlaub") return "urlaub";
  if (base === "/stammdaten") return "stammdaten";
  if (base === "/firma") return "firma";
  if (base === "/users") return "users";
  if (base === "/groups") return "groups";

  return undefined;
}

export function getSidebarMenuIconForBaumaschinenChild(
  href: string,
  aktion?: string
): SidebarMenuIconId | undefined {
  if (aktion === "hinzufuegen") return "maschine-hinzufuegen";
  if (aktion === "geraetenummer-codes") return "nummern-codes";
  if (aktion === "qr") return "qr";
  return getSidebarMenuIconForHref(href);
}
