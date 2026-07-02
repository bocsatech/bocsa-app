/** Solid white sidebar icons (24×24 viewBox) — demo PNG generation. */

/** @type {Record<string, string>} */
export const SOLID_ICON_PATHS = {
  home: '<path fill="#fff" d="M12 2.5 4 9.5V21h6v-7h4v7h6V9.5z"/>',
  baumaschinen:
    '<path fill="#fff" d="M3 18h18v2H3zm4-2 2-6h2l1 3h4l1-3h2l2 6H7zm3-6 1.5-3h3L15 10h-5z"/><circle fill="#fff" cx="7.5" cy="18.5" r="2"/><circle fill="#fff" cx="16.5" cy="18.5" r="2"/>',
  baugeraete:
    '<path fill="#fff" d="M5 9h14v9H5zm2-3h10v3H7zm-1 11h12v2H6z"/><circle fill="#fff" cx="8.5" cy="18" r="1.5"/><circle fill="#fff" cx="15.5" cy="18" r="1.5"/>',
  arbeitsauftrag:
    '<path fill="#fff" d="M8 3h8v3H8zm-2 3h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm2 6h8v2H8zm0 4h5v2H8z"/>',
  pruefprotokoll:
    '<path fill="#fff" d="M8 3h8v3H8zm-2 3h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm1.5 7.5 2.5 2.5 5-5 1.4 1.4-6.4 6.4-3.9-3.9z"/>',
  "maschine-hinzufuegen":
    '<path fill="#fff" d="M12 4v8M8 8h8"/><path fill="#fff" d="M5 17h14l-2-6H7z"/><circle fill="#fff" cx="8" cy="18" r="1.5"/><circle fill="#fff" cx="16" cy="18" r="1.5"/>',
  "nummern-codes":
    '<rect fill="#fff" x="4" y="4" width="6" height="6" rx="1"/><rect fill="#fff" x="14" y="4" width="6" height="6" rx="1"/><rect fill="#fff" x="4" y="14" width="6" height="6" rx="1"/><path fill="#fff" d="M15 15h5v2h-5zm0 4h5v2h-5z"/>',
  qr: '<rect fill="#fff" x="4" y="4" width="7" height="7" rx="1"/><rect fill="#fff" x="13" y="4" width="7" height="7" rx="1"/><rect fill="#fff" x="4" y="13" width="7" height="7" rx="1"/><rect fill="#fff" x="14" y="14" width="3" height="3"/><rect fill="#fff" x="18" y="18" width="2" height="2"/><rect fill="#fff" x="14" y="19" width="2" height="1"/>',
  geraetgruppen:
    '<path fill="#fff" d="M4 7h16v2H4zm0 5h10v2H4zm0 5h8v2H4z"/><circle fill="#fff" cx="18" cy="17" r="2.5"/>',
  pkw: '<path fill="#fff" d="M5 16h14l-1.5-5H6.5zm1.5-5 1.5-3h7l1.5 3z"/><circle fill="#fff" cx="8" cy="16" r="1.75"/><circle fill="#fff" cx="16" cy="16" r="1.75"/>',
  fahrzeug:
    '<path fill="#fff" d="M5 16h14l-1.5-5H6.5zm1.5-5 1.5-3h7l1.5 3z"/><circle fill="#fff" cx="8" cy="16" r="1.75"/><circle fill="#fff" cx="16" cy="16" r="1.75"/>',
  "fahrzeug-hinzufuegen":
    '<path fill="#fff" d="M12 4v5M9.5 6.5h5"/><path fill="#fff" d="M5 16h14l-1.5-5H6.5zm1.5-5 1.5-3h7l1.5 3z"/>',
  kunden:
    '<circle fill="#fff" cx="9" cy="9" r="2.5"/><circle fill="#fff" cx="15.5" cy="10" r="2"/><path fill="#fff" d="M4.5 19c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5zm7-1c0-2 1.5-3.6 3.3-3.8"/>',
  "pkw-gruppen":
    '<path fill="#fff" d="M3 16h5l1-3h2l1 3h5"/><circle fill="#fff" cx="5.5" cy="16" r="1.2"/><path fill="#fff" d="M14 16h5l1-3h2l1 3h1"/><circle fill="#fff" cx="16.5" cy="16" r="1.2"/>',
  "pkw-service":
    '<path fill="#fff" d="M4 16h10l-1.2-4H5.2z"/><circle fill="#fff" cx="7" cy="16" r="1.5"/><path fill="#fff" d="M17 8.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 1.8v1.4l1 .6"/>',
  lager:
    '<path fill="#fff" d="M4 10 12 6l8 4v9H4zm5 9v-5h6v5z"/><rect fill="#fff" x="10" y="13" width="4" height="6"/>',
  ersatzteile:
    '<path fill="#fff" d="M12 2 7 5v5l-3 1.5V19l8 4 8-4v-7.5L17 10V5z"/><circle fill="#ea580c" cx="12" cy="12" r="2.2"/>',
  reservierungen:
    '<path fill="#fff" d="M7 3h10v18l-3-2-2 1.5-2-1.5-3 2z"/><path fill="#fff" d="M10 8h4v2h-4zm0 4h4v2h-4z"/>',
  "lager-meldungen":
    '<path fill="#fff" d="M6 8h12v11H6zm3-4h6v4H9z"/><path fill="#fff" d="M12 3a2.5 2.5 0 0 1 2.5 2.5"/>',
  bewegungen:
    '<path fill="#fff" d="M7 8h10l-3-3 3-1v2H7V6l3 1zm0 8h10v-2H7l3 3-3 1z"/>',
  inventur:
    '<path fill="#fff" d="M8 4h8v16H8zm2 4h4v2h-4zm0 4h4v2h-4zm0 4h2v2h-2z"/>',
  meldungen:
    '<path fill="#fff" d="M12 4a5 5 0 0 1 5 5v2.5l1.8 3H5.2L7 11.5V9a5 5 0 0 1 5-5z"/><path fill="#fff" d="M10.5 18.5a1.5 1.5 0 0 0 3 0"/>',
  arbeitsstunden:
    '<circle fill="#fff" cx="12" cy="12" r="8"/><path fill="#ea580c" d="M12 7v5l3.5 2"/>',
  rechnungen:
    '<path fill="#fff" d="M8 3h8v18l-2-1.5L12 21l-2-1.5L8 21zm2 5h4v2h-4zm0 4h4v2h-4z"/>',
  aufgaben:
    '<path fill="#fff" d="M6 4h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm2 6.5 1.8 1.8L14 9.1l1.2 1.2-5 5-3-3z"/>',
  nachrichten:
    '<path fill="#fff" d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3V7a1 1 0 0 1 1-1z"/><path fill="#fff" d="M9 10h6v2H9z"/>',
  urlaub:
    '<circle fill="#fff" cx="12" cy="12" r="8"/><circle fill="#ea580c" cx="9.5" cy="10.5" r="1"/><circle fill="#ea580c" cx="14.5" cy="10.5" r="1"/><path fill="#ea580c" d="M9 15.5c.8-1.2 2-2 3-2s2.2.8 3 2"/>',
  stammdaten:
    '<rect fill="#fff" x="5" y="5" width="14" height="14" rx="2"/><circle fill="#ea580c" cx="12" cy="10" r="2.2"/><path fill="#ea580c" d="M8.5 16.5c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5"/>',
  "meine-menu":
    '<circle fill="#fff" cx="12" cy="9" r="3.5"/><path fill="#fff" d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/>',
  firma:
    '<path fill="#fff" d="M5 9h14v12H5zm2-4h10v4H7z"/><rect fill="#ea580c" x="9" y="12" width="2.5" height="2.5"/><rect fill="#ea580c" x="12.5" y="12" width="2.5" height="2.5"/><rect fill="#ea580c" x="9" y="16" width="2.5" height="2.5"/><rect fill="#ea580c" x="12.5" y="16" width="2.5" height="2.5"/>',
  users:
    '<circle fill="#fff" cx="9" cy="9" r="2.5"/><circle fill="#fff" cx="16" cy="10" r="2"/><path fill="#fff" d="M4.5 19c0-2.8 2-5 4.5-5s4.5 2.2 4.5 5zm7-1c0-2 1.5-3.6 3.3-3.8"/>',
  groups:
    '<circle fill="#fff" cx="8" cy="9" r="2"/><circle fill="#fff" cx="16" cy="9" r="2"/><path fill="#fff" d="M3.5 18.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5M12.5 18.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"/>',
  einstellungen:
    '<path fill="#fff" d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/><path fill="#fff" d="m12 2 1 2.2 2.4-.6.8 2.2 2.2.8-.6 2.4L21 12l-2.2 1-.6 2.4-2.2-.8-.8 2.2-2.4-.6L12 22l-1-2.2-2.4.6-.8-2.2-2.2-.8.6-2.4L3 12l2.2-1 .6-2.4 2.2.8.8-2.2 2.4.6z"/>',
  admin:
    '<path fill="#fff" d="M12 3 5 6.5V12c0 4.2 2.8 7.2 7 8.5 4.2-1.3 7-4.3 7-8.5V6.5zm-1.8 9.5 1.8 1.8 3.6-3.6-1.4-1.4-2.2 2.2-0.4-0.4z"/>',
  baugeraet:
    '<path fill="#fff" d="M6 15h12v2H6zm2-7 2-3h4l2 3v7H8z"/><rect fill="#fff" x="10" y="5" width="4" height="2"/>',
  "admin-uebersicht":
    '<rect fill="#fff" x="4" y="4" width="7" height="7" rx="1"/><rect fill="#fff" x="13" y="4" width="7" height="7" rx="1"/><rect fill="#fff" x="4" y="13" width="7" height="7" rx="1"/><rect fill="#fff" x="13" y="13" width="7" height="7" rx="1"/>',
};

/** @type {{ section: string; slug: string; icon: string | null; label: string; level: 0 | 1 | 2; parent?: boolean; active?: boolean; badge?: number }[]} */
export const SIDEBAR_MENU_DEMO_ROWS = [
  { section: "Start", slug: "home", icon: "home", label: "Home", level: 0, active: true },

  { section: "Betrieb", slug: "baumaschinen", icon: "baumaschinen", label: "Baumaschinen", level: 0, parent: true },
  { section: "Betrieb", slug: "baugeraete", icon: "baugeraete", label: "Baugeräte", level: 1 },
  { section: "Betrieb", slug: "arbeitsauftrag-bau", icon: "arbeitsauftrag", label: "Arbeitsauftrag", level: 1 },
  { section: "Betrieb", slug: "pruefprotokoll", icon: "pruefprotokoll", label: "Prüfprotokol", level: 1 },
  { section: "Betrieb", slug: "maschine-hinzufuegen", icon: "maschine-hinzufuegen", label: "Maschine hinzufügen", level: 1 },
  { section: "Betrieb", slug: "nummern-codes", icon: "nummern-codes", label: "Nummern-Codes", level: 1 },
  { section: "Betrieb", slug: "qr-scan", icon: "qr", label: "QR-Code scannen", level: 1 },
  { section: "Betrieb", slug: "geraetgruppen", icon: "geraetgruppen", label: "Gerätegruppen – Protokoll", level: 1 },
  { section: "Betrieb", slug: "pkw", icon: "pkw", label: "PKW", level: 0, parent: true },
  { section: "Betrieb", slug: "fahrzeug", icon: "fahrzeug", label: "Fahrzeug", level: 1 },
  { section: "Betrieb", slug: "arbeitsauftrag-pkw", icon: "arbeitsauftrag", label: "Arbeitsauftrag", level: 1 },
  { section: "Betrieb", slug: "fahrzeug-hinzufuegen", icon: "fahrzeug-hinzufuegen", label: "Fahrzeug hinzufügen", level: 1 },
  { section: "Betrieb", slug: "kunden-pkw", icon: "kunden", label: "Kunden", level: 1 },
  { section: "Betrieb", slug: "pkw-gruppen", icon: "pkw-gruppen", label: "PKW-Gruppen", level: 1 },
  { section: "Betrieb", slug: "pkw-service", icon: "pkw-service", label: "PKW-Service", level: 1 },
  { section: "Betrieb", slug: "kunden", icon: "kunden", label: "Kunden", level: 0 },
  { section: "Betrieb", slug: "lager", icon: "lager", label: "Lager", level: 0, parent: true },
  { section: "Betrieb", slug: "ersatzteile", icon: null, label: "Ersatzteile", level: 1 },
  { section: "Betrieb", slug: "reservierungen", icon: null, label: "Reservierungen", level: 1 },
  { section: "Betrieb", slug: "lager-meldungen", icon: null, label: "Meldungen", level: 1, badge: 3 },
  { section: "Betrieb", slug: "bewegungen", icon: null, label: "Bewegungen", level: 1 },
  { section: "Betrieb", slug: "inventur", icon: null, label: "Inventur", level: 1 },
  { section: "Betrieb", slug: "rechnungen", icon: "rechnungen", label: "Rechnungen", level: 0 },

  { section: "Meldungen & Zeit", slug: "meldungen", icon: "meldungen", label: "Meldungen", level: 0 },
  { section: "Meldungen & Zeit", slug: "arbeitsstunden", icon: "arbeitsstunden", label: "Arbeitsstunden", level: 0 },
  { section: "Meldungen & Zeit", slug: "qr-code", icon: "qr", label: "QR-Code", level: 0 },

  { section: "Personal", slug: "meine-menu", icon: "meine-menu", label: "Persönliche Menu", level: 0, parent: true },
  { section: "Personal", slug: "aufgaben", icon: null, label: "Aufgaben", level: 1 },
  { section: "Personal", slug: "nachrichten", icon: null, label: "Nachrichten", level: 1 },
  { section: "Personal", slug: "arbeitsstunden-meine", icon: null, label: "Arbeitsstunden", level: 1 },
  { section: "Personal", slug: "urlaub", icon: null, label: "Urlaub", level: 1 },
  { section: "Personal", slug: "stammdaten", icon: null, label: "Stammdaten", level: 1 },

  { section: "System", slug: "einstellungen", icon: "einstellungen", label: "Einstellungen", level: 0, parent: true },
  { section: "System", slug: "firma", icon: null, label: "Firma", level: 1 },
  { section: "System", slug: "users", icon: null, label: "Benutzer", level: 1 },
  { section: "System", slug: "groups", icon: null, label: "Gruppen", level: 1 },
  { section: "System", slug: "admin", icon: "admin", label: "Admin", level: 0, parent: true },
  { section: "System", slug: "admin-uebersicht", icon: null, label: "Übersicht", level: 1 },
  { section: "System", slug: "baugeraet", icon: "baugeraet", label: "Baugerät", level: 1, parent: true },
  { section: "System", slug: "maschine-hinzufuegen-admin", icon: null, label: "Maschine hinzufügen", level: 2 },
  { section: "System", slug: "nummern-codes-admin", icon: null, label: "Nummern-Codes", level: 2 },
  { section: "System", slug: "qr-admin", icon: null, label: "QR-Code scannen", level: 2 },
  { section: "System", slug: "geraetgruppen-admin", icon: null, label: "Gerätegruppen – Protokoll", level: 2 },
  { section: "System", slug: "pkw-admin", icon: "pkw", label: "PKW", level: 1, parent: true },
  { section: "System", slug: "fahrzeug-hinzufuegen-admin", icon: null, label: "Fahrzeug hinzufügen", level: 2 },
  { section: "System", slug: "pkw-gruppen-admin", icon: null, label: "PKW-Gruppen", level: 2 },
];

export const SIDEBAR_ORANGE = "#ea580c";
export const SIDEBAR_ORANGE_LIGHT = "#f97316";
