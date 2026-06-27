"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type MouseEvent, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "./LogoutButton";
import {
  ARBEITSAUFTRAG_DETAIL_PATH,
  ARBEITSAUFTRAG_LIST_PATH,
  isArbeitsauftragDetailPath,
} from "../../lib/arbeitsauftrag-routes";
import { MACHINE_PERM } from "../../lib/machine-permissions";
import { MASCHINEN_LIST_PATH } from "../../lib/maschinen-routes";
import { getBauArbeitsauftragMenuLabel, getBaupruefprotokollMenuLabel, isLocalAppEnvironment } from "../../lib/local-host";

const MOBILE_SIDEBAR_MQ = "(max-width: 760px)";

function isMobileSidebarViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_SIDEBAR_MQ).matches;
}

type MaschinenSubAktion = {
  kind: "aktion";
  href: string;
  label: string;
  aktion: string;
  permission?: string;
};

type MaschinenSubRoute = {
  kind: "route";
  href: string;
  label: string;
  permission?: string;
};

type MaschinenSubItem = MaschinenSubAktion | MaschinenSubRoute;

export const BAUMASCHINEN_NAV = {
  href: MASCHINEN_LIST_PATH,
  label: "Baumaschinen",
  permission: "menu.machines",
  children: [
    {
      kind: "route",
      href: "/arbeitsauftrag",
      label: "Bauarbeitsauftrag",
    },
    {
      kind: "route",
      href: "/pruefprotokoll",
      label: "Bauprüfprotokoll",
    },
    {
      kind: "aktion",
      href: "/maschinen?aktion=hinzufuegen",
      label: "Maschine hinzufügen",
      aktion: "hinzufuegen",
      permission: MACHINE_PERM.create,
    },
    {
      kind: "aktion",
      href: "/maschinen?aktion=geraetenummer-codes",
      label: "Nummern-Codes",
      aktion: "geraetenummer-codes",
      permission: MACHINE_PERM.geraetenummerCodes,
    },
    {
      kind: "aktion",
      href: "/maschinen?aktion=qr",
      label: "QR-Code scannen",
      aktion: "qr",
    },
    {
      kind: "route",
      href: "/maschinen/geraetgruppen",
      label: "Gerätegruppen – Protokoll",
    },
  ] as const satisfies readonly MaschinenSubItem[],
};

/** @deprecated Alias — Baumaschinen */
export const MASCHINEN_NAV = BAUMASCHINEN_NAV;

export const PKW_NAV = {
  href: "/pkw/fahrzeuge",
  label: "PKW",
  children: [
    { kind: "route", href: "/pkw/fahrzeuge", label: "Fahrzeug", permission: "menu.kunden" },
    {
      kind: "route",
      href: "/pkw/arbeitsauftrag",
      label: "Arbeitsauftrag",
      permission: "menu.kunden",
    },
    {
      kind: "aktion",
      href: "/pkw/fahrzeuge?aktion=hinzufuegen",
      label: "Fahrzeug hinzufügen",
      aktion: "hinzufuegen",
      permission: "menu.kunden",
    },
    { kind: "route", href: "/kunden", label: "Kunden", permission: "menu.kunden" },
    { kind: "route", href: "/pkw/gruppen", label: "PKW-Gruppen", permission: "menu.kunden" },
    { kind: "route", href: "/pkw-service", label: "PKW-Service", permission: "menu.pkw_service" },
  ],
} as const;

export const HOME_NAV = { href: "/", label: "Home", permission: "menu.dashboard" } as const;

export const LAGER_NAV = {
  href: "/lager",
  label: "Lager",
  permission: "menu.warehouse",
  children: [
    { kind: "route", href: "/lager", label: "Ersatzteile" },
    { kind: "route", href: "/lager/reservierungen", label: "Reservierungen" },
    { kind: "route", href: "/lager/meldungen", label: "Meldungen" },
    { kind: "route", href: "/lager/bewegungen", label: "Bewegungen" },
    { kind: "route", href: "/lager/inventur", label: "Inventur" },
  ],
} as const;

export const MEINE_MENU_NAV = {
  label: "Persönliche Menu",
  children: [
    { href: "/aufgaben", label: "Aufgaben" },
    { href: "/nachrichten", label: "Nachrichten" },
    { href: "/arbeitsstunden/aus-auftraegen", label: "Arbeitsstunden" },
    { href: "/urlaub", label: "Urlaub" },
    { href: "/stammdaten", label: "Stammdaten" },
  ],
} as const;

export const APP_NAV_ITEMS = [
  { href: "/meldungen", label: "Meldungen", permission: "menu.machines" },
  { href: "/arbeitsstunden", label: "Arbeitsstunden", permission: "menu.hours" },
  { href: "/qr-code", label: "QR-Code", permission: "menu.qr" },
] as const;

export const EINSTELLUNGEN_NAV = {
  label: "Einstellungen",
  children: [
    { href: "/firma", label: "Firma", permission: "menu.branches" },
    { href: "/users", label: "Benutzer", permission: "menu.users" },
    { href: "/groups", label: "Gruppen", permission: "menu.groups" },
  ],
} as const;

export const ADMIN_LOCALHOST_BAUGERAET_NAV = {
  label: "Baugerät",
  href: MASCHINEN_LIST_PATH,
  children: [
    {
      href: "/maschinen?aktion=hinzufuegen",
      label: "Maschine hinzufügen",
      permission: MACHINE_PERM.create,
      aktion: "hinzufuegen",
    },
    {
      href: "/maschinen?aktion=geraetenummer-codes",
      label: "Nummern-Codes",
      permission: MACHINE_PERM.geraetenummerCodes,
      aktion: "geraetenummer-codes",
    },
    {
      href: "/maschinen?aktion=qr",
      label: "QR-Code scannen",
      aktion: "qr",
    },
    { href: "/maschinen/geraetgruppen", label: "Gerätegruppen – Protokoll" },
  ],
} as const;

export const ADMIN_LOCALHOST_PKW_NAV = {
  label: "PKW",
  href: PKW_NAV.href,
  children: [
    { href: "/pkw/fahrzeuge", label: "Fahrzeug", permission: "menu.kunden" },
    { href: "/pkw/arbeitsauftrag", label: "Arbeitsauftrag", permission: "menu.kunden" },
    {
      href: "/pkw/fahrzeuge?aktion=hinzufuegen",
      label: "Fahrzeug hinzufügen",
      permission: "menu.kunden",
      aktion: "hinzufuegen",
    },
    { href: "/kunden", label: "Kunden", permission: "menu.kunden" },
    { href: "/pkw/gruppen", label: "PKW-Gruppen", permission: "menu.kunden" },
    { href: "/pkw-service", label: "PKW-Service", permission: "menu.pkw_service" },
  ],
} as const;

export const ADMIN_LOCALHOST_NAV = {
  label: "Admin",
  href: "/admin",
  children: [{ href: "/admin", label: "Übersicht" }],
  baugeraet: ADMIN_LOCALHOST_BAUGERAET_NAV,
  pkw: ADMIN_LOCALHOST_PKW_NAV,
} as const;

/** @deprecated — use EINSTELLUNGEN_NAV.children */
export const ADMIN_NAV_ITEMS = EINSTELLUNGEN_NAV.children;

const ALL_MENU_HREFS = [
  HOME_NAV.href,
  ...MEINE_MENU_NAV.children.map((child) => child.href),
  BAUMASCHINEN_NAV.href,
  ...BAUMASCHINEN_NAV.children.map((child) => child.href.split("?")[0]),
  PKW_NAV.href,
  ...PKW_NAV.children.map((child) => child.href.split("?")[0]),
  LAGER_NAV.href,
  ...LAGER_NAV.children.map((child) => child.href),
  ...APP_NAV_ITEMS.map((item) => item.href),
  ...EINSTELLUNGEN_NAV.children.map((item) => item.href),
  ADMIN_LOCALHOST_NAV.href,
  ...ADMIN_LOCALHOST_NAV.children.map((item) => item.href),
  ADMIN_LOCALHOST_BAUGERAET_NAV.href,
  ...ADMIN_LOCALHOST_BAUGERAET_NAV.children.map((item) => item.href),
  ADMIN_LOCALHOST_PKW_NAV.href,
  ...ADMIN_LOCALHOST_PKW_NAV.children.map((item) => item.href),
] as const;

type NavItem = (typeof APP_NAV_ITEMS)[number];
type MeineMenuSubItem = (typeof MEINE_MENU_NAV.children)[number];
type EinstellungenNavItem = (typeof EINSTELLUNGEN_NAV.children)[number];
type AdminLocalhostNavItem = (typeof ADMIN_LOCALHOST_NAV.children)[number];
type AdminLocalhostBaugeraetNavItem = (typeof ADMIN_LOCALHOST_BAUGERAET_NAV.children)[number];
type AdminLocalhostPkwNavItem = (typeof ADMIN_LOCALHOST_PKW_NAV.children)[number];
type AdminNavItem = EinstellungenNavItem;
type BauSubItem = (typeof BAUMASCHINEN_NAV.children)[number] | MaschinenSubRoute;

const BAUGERAETE_NAV_ITEM = {
  kind: "route",
  href: MASCHINEN_LIST_PATH,
  label: "Baugeräte",
} as const satisfies MaschinenSubRoute;

const BAUMASCHINEN_ADMIN_AKTIONS = new Set(["hinzufuegen", "geraetenummer-codes", "qr"]);

function getBaumaschinenMenuChildren(): BauSubItem[] {
  const children: BauSubItem[] = isLocalAppEnvironment()
    ? [BAUGERAETE_NAV_ITEM, ...BAUMASCHINEN_NAV.children]
    : [...BAUMASCHINEN_NAV.children];

  if (!isLocalAppEnvironment()) {
    return children;
  }

  return children.filter((child) => {
    if (child.kind === "aktion" && BAUMASCHINEN_ADMIN_AKTIONS.has(child.aktion)) {
      return false;
    }
    if (child.kind === "route" && child.href === "/maschinen/geraetgruppen") {
      return false;
    }
    return true;
  });
}

function getBaumaschinenChildLabel(child: BauSubItem) {
  if (child.kind === "route" && child.href === ARBEITSAUFTRAG_LIST_PATH) {
    return getBauArbeitsauftragMenuLabel();
  }
  if (child.kind === "route" && child.href === "/pruefprotokoll") {
    return getBaupruefprotokollMenuLabel();
  }
  return child.label;
}

type SidebarAuth = {
  permissions: string[];
  groups: string[];
  username?: string;
};

let cachedSidebarAuth: SidebarAuth | null = null;

function isAdminUser(username: string | undefined, groups: string[]) {
  return groups.includes("Admin") || username?.trim().toLowerCase() === "admin";
}

function canShowMenuItem(
  permission: string | undefined,
  permissions: string[],
  groups: string[],
  username?: string
) {
  if (isAdminUser(username, groups)) return true;
  if (!permission) return true;
  return permissions.includes(permission);
}

type Props = {
  activeHref?: string;
  subtitle?: string;
};

function navHrefBase(href: string) {
  return href.split("?")[0];
}

function isNavActive(
  item:
    | NavItem
    | AdminNavItem
    | AdminLocalhostNavItem
    | MeineMenuSubItem
    | EinstellungenNavItem,
  activeHref: string | undefined,
  pathname: string
) {
  const href = item.href;
  const base = navHrefBase(href);
  if (activeHref === href || activeHref === base || pathname === base) return true;
  if (!pathname.startsWith(`${base}/`)) return false;

  const hasMoreSpecificMatch = ALL_MENU_HREFS.some((other) => {
    const otherBase = navHrefBase(other);
    if (otherBase === base || !otherBase.startsWith(`${base}/`)) return false;
    return (
      activeHref === other ||
      activeHref === otherBase ||
      pathname === otherBase ||
      pathname.startsWith(`${otherBase}/`)
    );
  });

  return !hasMoreSpecificMatch;
}

function isMeineMenuSectionActive(activeHref: string | undefined, pathname: string) {
  return MEINE_MENU_NAV.children.some((child) => isNavActive(child, activeHref, pathname));
}

function isEinstellungenSectionActive(activeHref: string | undefined, pathname: string) {
  return EINSTELLUNGEN_NAV.children.some((child) => isNavActive(child, activeHref, pathname));
}

function isAdminLocalhostSectionActive(
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  if (
    activeHref === ADMIN_LOCALHOST_NAV.href ||
    pathname === ADMIN_LOCALHOST_NAV.href
  ) {
    return true;
  }

  return ADMIN_LOCALHOST_NAV.children.some((child) =>
    isAdminLocalhostChildActive(child, activeHref, pathname, aktion)
  ) || ADMIN_LOCALHOST_BAUGERAET_NAV.children.some((child) =>
    isAdminLocalhostBaugeraetChildActive(child, activeHref, pathname, aktion)
  ) || isAdminLocalhostBaugeraetParentActive(activeHref, pathname, aktion)
  || ADMIN_LOCALHOST_PKW_NAV.children.some((child) =>
    isAdminLocalhostPkwChildActive(child, activeHref, pathname, aktion)
  ) || isAdminLocalhostPkwParentActive(activeHref, pathname, aktion);
}

function isAdminLocalhostPkwChildActive(
  child: AdminLocalhostPkwNavItem,
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  if ("aktion" in child && child.aktion) {
    return pathname.startsWith("/pkw/fahrzeuge") && aktion === child.aktion;
  }
  return isNavActive(child, activeHref, pathname);
}

function isAdminLocalhostPkwParentActive(
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  const anyNestedActive = ADMIN_LOCALHOST_PKW_NAV.children.some((child) =>
    isAdminLocalhostPkwChildActive(child, activeHref, pathname, aktion)
  );
  if (anyNestedActive) return false;
  if (pathname.startsWith("/pkw/fahrzeuge") && aktion) return false;
  return (
    activeHref === PKW_NAV.href ||
    pathname === PKW_NAV.href ||
    pathname.startsWith("/pkw/fahrzeuge/")
  );
}

function isAdminLocalhostBaugeraetChildActive(
  child: AdminLocalhostBaugeraetNavItem,
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  if ("aktion" in child && child.aktion) {
    return pathname.startsWith("/maschinen") && aktion === child.aktion;
  }
  return isNavActive(child, activeHref, pathname);
}

function isAdminLocalhostBaugeraetParentActive(
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  const anyNestedActive = ADMIN_LOCALHOST_BAUGERAET_NAV.children.some((child) =>
    isAdminLocalhostBaugeraetChildActive(child, activeHref, pathname, aktion)
  );
  if (anyNestedActive || aktion) return false;
  if (pathname === "/maschinen/geraetgruppen") return false;
  return (
    activeHref === MASCHINEN_LIST_PATH ||
    pathname === MASCHINEN_LIST_PATH ||
    (pathname.startsWith("/maschinen/") && pathname !== "/maschinen/geraetgruppen")
  );
}

function isAdminLocalhostChildActive(
  child: AdminLocalhostNavItem,
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  return isNavActive(child, activeHref, pathname);
}

function isBaumaschinenSectionActive(activeHref: string | undefined, pathname: string) {
  return (
    activeHref === BAUMASCHINEN_NAV.href ||
    pathname === BAUMASCHINEN_NAV.href ||
    pathname.startsWith("/maschinen/") ||
    pathname === "/maschinen/geraetgruppen" ||
    activeHref === ARBEITSAUFTRAG_LIST_PATH ||
    pathname === ARBEITSAUFTRAG_LIST_PATH ||
    pathname === ARBEITSAUFTRAG_DETAIL_PATH ||
    pathname.startsWith("/arbeitsauftrag/") ||
    activeHref === "/pruefprotokoll" ||
    pathname.startsWith("/pruefprotokoll")
  );
}

function isBaumaschinenSubActive(
  child: BauSubItem,
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
) {
  if (child.kind === "aktion") {
    return pathname.startsWith("/maschinen") && aktion === child.aktion;
  }
  if (child.kind === "route" && child.href === MASCHINEN_LIST_PATH) {
    if (pathname.startsWith("/pruefprotokoll")) return false;
    if (pathname === "/maschinen/geraetgruppen" || pathname.startsWith("/maschinen/geraetgruppen/")) {
      return false;
    }
    if (aktion) return false;
    return (
      activeHref === MASCHINEN_LIST_PATH ||
      pathname === MASCHINEN_LIST_PATH ||
      (pathname.startsWith("/maschinen/") && pathname !== "/maschinen/geraetgruppen")
    );
  }
  if (child.href === ARBEITSAUFTRAG_LIST_PATH) {
    if (isArbeitsauftragDetailPath(pathname)) {
      return false;
    }
    return activeHref === ARBEITSAUFTRAG_LIST_PATH || pathname === ARBEITSAUFTRAG_LIST_PATH;
  }
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

function isPkwSectionActive(activeHref: string | undefined, pathname: string) {
  return (
    activeHref === "/pkw/arbeitsauftrag" ||
    pathname === "/pkw/arbeitsauftrag" ||
    pathname.startsWith("/pkw/arbeitsauftrag/") ||
    activeHref === "/pkw/fahrzeuge" ||
    activeHref === "/pkw/gruppen" ||
    pathname === "/pkw/gruppen" ||
    pathname.startsWith("/pkw/gruppen/") ||
    activeHref === "/kunden" ||
    activeHref === "/pkw-service" ||
    pathname === "/pkw/fahrzeuge" ||
    pathname.startsWith("/pkw/fahrzeuge/") ||
    pathname === "/kunden" ||
    pathname.startsWith("/kunden/") ||
    pathname === "/pkw-service" ||
    pathname.startsWith("/pkw-service/") ||
    pathname === "/pkw/buchen"
  );
}

type PkwSubAktion = {
  kind: "aktion";
  href: string;
  label: string;
  aktion: string;
  permission?: string;
};

type PkwSubRoute = {
  kind: "route";
  href: string;
  label: string;
  permission?: string;
};

type PkwSubItem = PkwSubAktion | PkwSubRoute;

type LagerSubRoute = {
  kind: "route";
  href: string;
  label: string;
  badge?: number;
};

type LagerSubItem = LagerSubRoute;

function isLagerSectionActive(activeHref: string | undefined, pathname: string) {
  return (
    activeHref === LAGER_NAV.href ||
    pathname === "/lager" ||
    pathname.startsWith("/lager/") ||
    activeHref === "/lager/meldungen" ||
    activeHref === "/lager/reservierungen" ||
    activeHref === "/lager/bewegungen" ||
    activeHref === "/lager/inventur"
  );
}

function isLagerSubActive(child: LagerSubItem, pathname: string) {
  if (child.href === "/lager") {
    return pathname === "/lager";
  }
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

function isPkwSubActive(child: PkwSubItem, pathname: string, aktion: string | null) {
  if (child.kind === "aktion") {
    return pathname.startsWith("/pkw/fahrzeuge") && aktion === child.aktion;
  }
  if (child.href === "/pkw/fahrzeuge") {
    return pathname.startsWith("/pkw/fahrzeuge") && aktion !== "hinzufuegen";
  }
  return pathname === child.href || pathname.startsWith(`${child.href}/`);
}

function useSidebarAuth() {
  const [auth, setAuth] = useState<SidebarAuth>(
    () => cachedSidebarAuth ?? { permissions: [], groups: [], username: undefined }
  );

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        const next: SidebarAuth = {
          permissions: result.permissions ?? [],
          groups: result.groups ?? [],
          username: result.username ?? result.user?.username,
        };
        cachedSidebarAuth = next;
        setAuth(next);
      })
      .catch(() => {
        if (!cachedSidebarAuth) {
          setAuth({ permissions: [], groups: [], username: undefined });
        }
      });
  }, []);

  return auth;
}

type SidebarMenuId = "meine" | "baumaschinen" | "pkw" | "lager" | "einstellungen" | "admin";

type SidebarAccordionState = {
  openMenuId: SidebarMenuId | null;
  setOpenMenuId: (id: SidebarMenuId | null) => void;
};

function sidebarMenuIsExpanded(
  menuId: SidebarMenuId,
  localOpen: boolean,
  submenuOpen: boolean,
  accordion?: SidebarAccordionState
) {
  if (accordion && isLocalAppEnvironment()) {
    return accordion.openMenuId === menuId;
  }
  return submenuOpen || localOpen;
}

function sidebarAccordionToggle(accordion: SidebarAccordionState, menuId: SidebarMenuId) {
  accordion.setOpenMenuId(accordion.openMenuId === menuId ? null : menuId);
}

function resolveOpenSidebarMenuId(
  activeHref: string | undefined,
  pathname: string,
  aktion: string | null
): SidebarMenuId | null {
  if (isAdminLocalhostSectionActive(activeHref, pathname, aktion)) return "admin";
  if (isMeineMenuSectionActive(activeHref, pathname)) return "meine";
  if (isBaumaschinenSectionActive(activeHref, pathname)) return "baumaschinen";
  if (isPkwSectionActive(activeHref, pathname)) return "pkw";
  if (isLagerSectionActive(activeHref, pathname)) return "lager";
  if (isEinstellungenSectionActive(activeHref, pathname)) return "einstellungen";
  return null;
}

function isBaumaschinenListRoot(
  pathname: string,
  aktion: string | null,
  geraettyp: string | null,
  geraetenummer: string | null
) {
  return (
    pathname === BAUMASCHINEN_NAV.href &&
    !aktion &&
    !geraettyp?.trim() &&
    !geraetenummer?.trim()
  );
}

function MeineMenuNavGroup({
  activeHref,
  pathname,
  submenuOpen,
  permissions,
  groups,
  username,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  submenuOpen: boolean;
  permissions: string[];
  groups: string[];
  username?: string;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const visibleChildren = MEINE_MENU_NAV.children.filter((child) =>
    canShowMenuItem(
      "permission" in child ? child.permission : undefined,
      permissions,
      groups,
      username
    )
  );
  const sectionActive = isMeineMenuSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  useEffect(() => {
    if (accordionOn) return;
    if (!sectionActive) setOpen(false);
  }, [pathname, activeHref, sectionActive, accordionOn]);

  function handleParentClick() {
    if (accordionOn && accordion) {
      sidebarAccordionToggle(accordion, "meine");
      return;
    }
    if (sectionActive && open) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }

  if (visibleChildren.length === 0) return null;

  const showSub = sidebarMenuIsExpanded("meine", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup sidebarMeineMenuGroup">
      <button
        type="button"
        className="sidebarNavParent"
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {MEINE_MENU_NAV.label}
      </button>
      {showSub ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={isNavActive(child, activeHref, pathname) ? "active" : undefined}
              onClick={() => onMobileNavClose?.()}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EinstellungenNavGroup({
  activeHref,
  pathname,
  submenuOpen,
  permissions,
  groups,
  username,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  submenuOpen: boolean;
  permissions: string[];
  groups: string[];
  username?: string;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const visibleChildren = EINSTELLUNGEN_NAV.children.filter((child) =>
    canShowMenuItem(child.permission, permissions, groups, username)
  );
  const sectionActive = isEinstellungenSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  useEffect(() => {
    if (accordionOn) return;
    if (!sectionActive) setOpen(false);
  }, [pathname, activeHref, sectionActive, accordionOn]);

  function handleParentClick() {
    if (accordionOn && accordion) {
      sidebarAccordionToggle(accordion, "einstellungen");
      return;
    }
    if (sectionActive && open) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }

  if (visibleChildren.length === 0) return null;

  const showSub = sidebarMenuIsExpanded("einstellungen", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup sidebarEinstellungenGroup">
      <button
        type="button"
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {EINSTELLUNGEN_NAV.label}
      </button>
      {showSub ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={isNavActive(child, activeHref, pathname) ? "active" : undefined}
              onClick={() => onMobileNavClose?.()}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AdminLocalhostNavGroup({
  activeHref,
  pathname,
  aktion,
  submenuOpen,
  permissions,
  groups,
  username,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  aktion: string | null;
  submenuOpen: boolean;
  permissions: string[];
  groups: string[];
  username?: string;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const visibleChildren = ADMIN_LOCALHOST_NAV.children.filter((child) =>
    canShowMenuItem("permission" in child ? child.permission : undefined, permissions, groups, username)
  );
  const visibleBaugeraetChildren = ADMIN_LOCALHOST_BAUGERAET_NAV.children.filter((child) =>
    canShowMenuItem("permission" in child ? child.permission : undefined, permissions, groups, username)
  );
  const visiblePkwChildren = ADMIN_LOCALHOST_PKW_NAV.children.filter((child) =>
    canShowMenuItem("permission" in child ? child.permission : undefined, permissions, groups, username)
  );
  const sectionActive = isAdminLocalhostSectionActive(activeHref, pathname, aktion);
  const baugeraetParentActive = isAdminLocalhostBaugeraetParentActive(activeHref, pathname, aktion);
  const pkwParentActive = isAdminLocalhostPkwParentActive(activeHref, pathname, aktion);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  useEffect(() => {
    if (accordionOn) return;
    if (!sectionActive) setOpen(false);
  }, [pathname, activeHref, sectionActive, accordionOn]);

  function handleParentClick() {
    if (accordionOn && accordion) {
      sidebarAccordionToggle(accordion, "admin");
      return;
    }
    if (sectionActive && open) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }

  if (visibleChildren.length === 0 && visibleBaugeraetChildren.length === 0 && visiblePkwChildren.length === 0) {
    return null;
  }

  const showSub = sidebarMenuIsExpanded("admin", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup sidebarEinstellungenGroup">
      <button
        type="button"
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {ADMIN_LOCALHOST_NAV.label}
      </button>
      {showSub ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={
                isAdminLocalhostChildActive(child, activeHref, pathname, aktion) ? "active" : undefined
              }
              onClick={() => onMobileNavClose?.()}
            >
              {child.label}
            </Link>
          ))}
          {visibleBaugeraetChildren.length > 0 ? (
            <Fragment>
              <Link
                href={ADMIN_LOCALHOST_BAUGERAET_NAV.href}
                className={baugeraetParentActive ? "active" : undefined}
                onClick={() => onMobileNavClose?.()}
              >
                {ADMIN_LOCALHOST_BAUGERAET_NAV.label}
              </Link>
              <div className="sidebarNavSubNested">
                {visibleBaugeraetChildren.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={
                      isAdminLocalhostBaugeraetChildActive(child, activeHref, pathname, aktion)
                        ? "active"
                        : undefined
                    }
                    onClick={() => onMobileNavClose?.()}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </Fragment>
          ) : null}
          {visiblePkwChildren.length > 0 ? (
            <Fragment>
              <Link
                href={ADMIN_LOCALHOST_PKW_NAV.href}
                className={pkwParentActive ? "active" : undefined}
                onClick={() => onMobileNavClose?.()}
              >
                {ADMIN_LOCALHOST_PKW_NAV.label}
              </Link>
              <div className="sidebarNavSubNested">
                {visiblePkwChildren.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={
                      isAdminLocalhostPkwChildActive(child, activeHref, pathname, aktion)
                        ? "active"
                        : undefined
                    }
                    onClick={() => onMobileNavClose?.()}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </Fragment>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BaumaschinenNavGroup({
  activeHref,
  pathname,
  aktion,
  geraettyp,
  geraetenummer,
  submenuOpen,
  permissions,
  groups,
  username,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  aktion: string | null;
  geraettyp: string | null;
  geraetenummer: string | null;
  submenuOpen: boolean;
  permissions: string[];
  groups: string[];
  username?: string;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const router = useRouter();
  const menuChildren = getBaumaschinenMenuChildren();
  const sectionActive = isBaumaschinenSectionActive(activeHref, pathname);
  const onListRoot = isBaumaschinenListRoot(pathname, aktion, geraettyp, geraetenummer);
  const visibleChildren = menuChildren.filter((child) => {
    const childPermission =
      "permission" in child && child.permission ? child.permission : BAUMASCHINEN_NAV.permission;
    return canShowMenuItem(childPermission, permissions, groups, username);
  });
  const anySubActive = visibleChildren.some((child) =>
    isBaumaschinenSubActive(child, activeHref, pathname, aktion)
  );
  const parentActive =
    !anySubActive &&
    (activeHref === BAUMASCHINEN_NAV.href ||
      onListRoot ||
      (pathname.startsWith("/maschinen/") && pathname !== "/maschinen/geraetgruppen") ||
      isArbeitsauftragDetailPath(pathname));
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
    if (accordionOn && accordion) {
      event.preventDefault();
      const wasOpen = accordion.openMenuId === "baumaschinen";
      sidebarAccordionToggle(accordion, "baumaschinen");
      if (!wasOpen && !onListRoot) {
        router.push(BAUMASCHINEN_NAV.href);
      }
      if (mobile) onMobileNavClose?.();
      return;
    }
    if (sectionActive && open && onListRoot) {
      event.preventDefault();
      setOpen(false);
      if (mobile) onMobileNavClose?.();
      return;
    }
    event.preventDefault();
    setOpen(true);
    if (mobile) return;
    if (!onListRoot) {
      router.push(BAUMASCHINEN_NAV.href);
    }
    onMobileNavClose?.();
  }

  const showSub = sidebarMenuIsExpanded("baumaschinen", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup">
      <Link
        href={BAUMASCHINEN_NAV.href}
        className={`sidebarNavParent${parentActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {BAUMASCHINEN_NAV.label}
      </Link>
      {showSub ? (
        <div className="sidebarNavSub">
          {menuChildren.map((child) => {
            const childPermission =
              "permission" in child && child.permission
                ? child.permission
                : BAUMASCHINEN_NAV.permission;
            if (!canShowMenuItem(childPermission, permissions, groups, username)) {
              return null;
            }
            const active = isBaumaschinenSubActive(child, activeHref, pathname, aktion);
            return (
              <Link
                key={`${child.kind}-${child.href}-${"label" in child ? child.label : ""}`}
                href={child.href}
                className={active ? "active" : undefined}
                onClick={() => onMobileNavClose?.()}
              >
                {getBaumaschinenChildLabel(child)}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LagerNavGroup({
  activeHref,
  pathname,
  submenuOpen,
  meldungenCount,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  submenuOpen: boolean;
  meldungenCount: number;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const router = useRouter();
  const sectionActive = isLagerSectionActive(activeHref, pathname);
  const anySubActive = LAGER_NAV.children.some((child) => isLagerSubActive(child, pathname));
  const parentActive = !anySubActive && pathname === LAGER_NAV.href;
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
    if (accordionOn && accordion) {
      event.preventDefault();
      const wasOpen = accordion.openMenuId === "lager";
      sidebarAccordionToggle(accordion, "lager");
      if (!wasOpen && pathname !== LAGER_NAV.href) {
        router.push(LAGER_NAV.href);
      }
      if (mobile) onMobileNavClose?.();
      return;
    }
    if (sectionActive && open && pathname === LAGER_NAV.href) {
      event.preventDefault();
      setOpen(false);
      if (mobile) onMobileNavClose?.();
      return;
    }
    event.preventDefault();
    setOpen(true);
    if (mobile) return;
    if (!sectionActive || pathname !== LAGER_NAV.href) {
      router.push(LAGER_NAV.href);
    }
    onMobileNavClose?.();
  }

  const children: LagerSubItem[] = LAGER_NAV.children.map((child) =>
    child.href === "/lager/meldungen" && meldungenCount > 0
      ? { ...child, badge: meldungenCount }
      : child
  );

  const showSub = sidebarMenuIsExpanded("lager", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup">
      <Link
        href={LAGER_NAV.href}
        className={`sidebarNavParent${parentActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {LAGER_NAV.label}
      </Link>
      {showSub ? (
        <div className="sidebarNavSub">
          {children.map((child) => {
            const active = isLagerSubActive(child, pathname);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={active ? "active" : undefined}
                onClick={() => onMobileNavClose?.()}
              >
                {child.label}
                {child.badge ? ` (${child.badge})` : ""}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function PkwNavGroup({
  activeHref,
  pathname,
  aktion,
  visibleChildren,
  submenuOpen,
  accordion,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  aktion: string | null;
  visibleChildren: PkwSubItem[];
  submenuOpen: boolean;
  accordion?: SidebarAccordionState;
  onMobileNavClose?: () => void;
}) {
  const accordionOn = Boolean(accordion && isLocalAppEnvironment());
  const router = useRouter();
  const sectionActive = isPkwSectionActive(activeHref, pathname);
  const anySubActive = visibleChildren.some((child) =>
    isPkwSubActive(child, pathname, aktion)
  );
  const parentActive = !anySubActive && pathname === PKW_NAV.href && !aktion;
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (accordionOn) return;
    if (sectionActive) setOpen(true);
  }, [sectionActive, accordionOn]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
    if (accordionOn && accordion) {
      event.preventDefault();
      const wasOpen = accordion.openMenuId === "pkw";
      sidebarAccordionToggle(accordion, "pkw");
      if (!wasOpen && (pathname !== PKW_NAV.href || aktion)) {
        router.push(PKW_NAV.href);
      }
      if (mobile) onMobileNavClose?.();
      return;
    }
    if (sectionActive && open && pathname === PKW_NAV.href && !aktion) {
      event.preventDefault();
      setOpen(false);
      if (mobile) onMobileNavClose?.();
      return;
    }
    event.preventDefault();
    setOpen(true);
    if (mobile) return;
    if (!sectionActive || pathname !== PKW_NAV.href || aktion) {
      router.push(PKW_NAV.href);
    }
    onMobileNavClose?.();
  }

  if (visibleChildren.length === 0) return null;

  const showSub = sidebarMenuIsExpanded("pkw", open, submenuOpen, accordion);

  return (
    <div className="sidebarNavGroup">
      <Link
        href={PKW_NAV.href}
        className={`sidebarNavParent${parentActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {PKW_NAV.label}
      </Link>
      {showSub ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => {
            const active = isPkwSubActive(child, pathname, aktion);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={active ? "active" : undefined}
                onClick={() => onMobileNavClose?.()}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNavItems({
  activeHref,
  pathname,
  aktion,
  geraettyp,
  geraetenummer,
  auth,
  submenuOpen,
  meldungenCount,
  mobileMenuOpen,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  aktion: string | null;
  geraettyp: string | null;
  geraetenummer: string | null;
  auth: SidebarAuth;
  submenuOpen: boolean;
  meldungenCount: number;
  mobileMenuOpen: boolean;
  onMobileNavClose?: () => void;
}) {
  const { permissions, groups, username } = auth;

  const showHome = canShowMenuItem(HOME_NAV.permission, permissions, groups, username);
  const showBaumaschinen = canShowMenuItem(
    BAUMASCHINEN_NAV.permission,
    permissions,
    groups,
    username
  );
  const pkwChildren: PkwSubItem[] = PKW_NAV.children.filter((child) =>
    canShowMenuItem(child.permission, permissions, groups, username)
  );
  const showLager = canShowMenuItem(LAGER_NAV.permission, permissions, groups, username);
  const navItems = APP_NAV_ITEMS.filter((item) =>
    canShowMenuItem(item.permission, permissions, groups, username)
  );
  const navItemsBeforeQr = navItems.filter((item) => item.href !== "/qr-code");
  const showQrCodeNav = navItems.some((item) => item.href === "/qr-code");
  const qrCodeNavItem = navItems.find((item) => item.href === "/qr-code");
  const localhostAccordion = isLocalAppEnvironment();
  const [openMenuId, setOpenMenuId] = useState<SidebarMenuId | null>(null);
  const accordion: SidebarAccordionState | undefined = localhostAccordion
    ? { openMenuId, setOpenMenuId }
    : undefined;

  useEffect(() => {
    if (!localhostAccordion) return;
    setOpenMenuId(resolveOpenSidebarMenuId(activeHref, pathname, aktion));
  }, [localhostAccordion, activeHref, pathname, aktion]);

  return (
    <>
      {showHome ? (
        <Link
          href={HOME_NAV.href}
          className={
            activeHref === HOME_NAV.href || pathname === HOME_NAV.href ? "active" : undefined
          }
          onClick={() => onMobileNavClose?.()}
        >
          {HOME_NAV.label}
        </Link>
      ) : null}

      <MeineMenuNavGroup
        activeHref={activeHref}
        pathname={pathname}
        submenuOpen={submenuOpen}
        permissions={permissions}
        groups={groups}
        username={username}
        accordion={accordion}
        onMobileNavClose={onMobileNavClose}
      />

      {showBaumaschinen ? (
        <BaumaschinenNavGroup
          activeHref={activeHref}
          pathname={pathname}
          aktion={aktion}
          geraettyp={geraettyp}
          geraetenummer={geraetenummer}
          submenuOpen={submenuOpen}
          permissions={permissions}
          groups={groups}
          username={username}
          accordion={accordion}
          onMobileNavClose={onMobileNavClose}
        />
      ) : null}

      <PkwNavGroup
        activeHref={activeHref}
        pathname={pathname}
        aktion={aktion}
        visibleChildren={pkwChildren}
        submenuOpen={submenuOpen}
        accordion={accordion}
        onMobileNavClose={onMobileNavClose}
      />

      {showLager ? (
        <LagerNavGroup
          activeHref={activeHref}
          pathname={pathname}
          submenuOpen={submenuOpen}
          meldungenCount={meldungenCount}
          accordion={accordion}
          onMobileNavClose={onMobileNavClose}
        />
      ) : null}

      {navItemsBeforeQr.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isNavActive(item, activeHref, pathname) ? "active" : undefined}
          onClick={() => onMobileNavClose?.()}
        >
          {item.label}
        </Link>
      ))}

      {showQrCodeNav && qrCodeNavItem ? (
        <Link
          href={qrCodeNavItem.href}
          className={
            isNavActive(qrCodeNavItem, activeHref, pathname) ? "active" : undefined
          }
          onClick={() => onMobileNavClose?.()}
        >
          {qrCodeNavItem.label}
        </Link>
      ) : null}

      <EinstellungenNavGroup
        activeHref={activeHref}
        pathname={pathname}
        submenuOpen={submenuOpen}
        permissions={permissions}
        groups={groups}
        username={username}
        accordion={accordion}
        onMobileNavClose={onMobileNavClose}
      />

      {isLocalAppEnvironment() ? (
        <AdminLocalhostNavGroup
          activeHref={activeHref}
          pathname={pathname}
          aktion={aktion}
          submenuOpen={submenuOpen}
          permissions={permissions}
          groups={groups}
          username={username}
          accordion={accordion}
          onMobileNavClose={onMobileNavClose}
        />
      ) : null}
    </>
  );
}

function SidebarNavWithSearchParams({
  activeHref,
  pathname,
  auth,
  meldungenCount,
  mobileMenuOpen,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  auth: SidebarAuth;
  meldungenCount: number;
  mobileMenuOpen: boolean;
  onMobileNavClose?: () => void;
}) {
  const searchParams = useSearchParams();
  const aktion = searchParams.get("aktion");
  const geraettyp = searchParams.get("geraettyp");
  const geraetenummer = searchParams.get("geraetenummer");

  return (
    <SidebarNavItems
      activeHref={activeHref}
      pathname={pathname}
      aktion={aktion}
      geraettyp={geraettyp}
      geraetenummer={geraetenummer}
      auth={auth}
      submenuOpen={false}
      meldungenCount={meldungenCount}
      mobileMenuOpen={mobileMenuOpen}
      onMobileNavClose={onMobileNavClose}
    />
  );
}

function SidebarNavFallback({
  activeHref,
  pathname,
  auth,
  meldungenCount,
  mobileMenuOpen,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  auth: SidebarAuth;
  meldungenCount: number;
  mobileMenuOpen: boolean;
  onMobileNavClose?: () => void;
}) {
  return (
    <SidebarNavItems
      activeHref={activeHref}
      pathname={pathname}
      aktion={null}
      geraettyp={null}
      geraetenummer={null}
      auth={auth}
      submenuOpen
      meldungenCount={meldungenCount}
      mobileMenuOpen={mobileMenuOpen}
      onMobileNavClose={onMobileNavClose}
    />
  );
}

function useLagerMeldungenCount(canLoad: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canLoad) {
      setCount(0);
      return;
    }

    fetch(`/api/lager/meldungen/summary?ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCount(typeof data?.total === "number" ? data.total : 0);
      })
      .catch(() => setCount(0));
  }, [canLoad]);

  return count;
}

export default function AppSidebar({ activeHref, subtitle = "Betrieb" }: Props) {
  const pathname = usePathname();
  const auth = useSidebarAuth();
  const { permissions, groups, username } = auth;
  const showLager = canShowMenuItem(LAGER_NAV.permission, permissions, groups, username);
  const meldungenCount = useLagerMeldungenCount(showLager);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const scrollYRef = useRef(0);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    scrollYRef.current = window.scrollY;

    const onScroll = () => {
      if (Math.abs(window.scrollY - scrollYRef.current) > 6) {
        closeMobileMenu();
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".sidebarNav")) return;
      closeMobileMenu();
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <aside className={`sidebar${mobileMenuOpen ? " sidebarMenuOpen" : ""}`}>
      <div className="sidebarHeader">
        <div className="sidebarMark">B</div>
        <div className="sidebarHeaderText">
          <p className="sidebarTitle">Bocsa</p>
          <p className="sidebarSubtitle">{subtitle}</p>
        </div>
        <button
          type="button"
          className="sidebarMenuToggle"
          aria-expanded={mobileMenuOpen}
          aria-controls="sidebar-main-nav"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMobileMenuOpen((open) => !open);
          }}
        >
          {mobileMenuOpen ? "Schließen" : MEINE_MENU_NAV.label}
        </button>
      </div>
      <nav id="sidebar-main-nav" className="sidebarNav">
        <Suspense
          fallback={
            <SidebarNavFallback
              activeHref={activeHref}
              pathname={pathname}
              auth={auth}
              meldungenCount={meldungenCount}
              mobileMenuOpen={mobileMenuOpen}
              onMobileNavClose={closeMobileMenu}
            />
          }
        >
          <SidebarNavWithSearchParams
            activeHref={activeHref}
            pathname={pathname}
            auth={auth}
            meldungenCount={meldungenCount}
            mobileMenuOpen={mobileMenuOpen}
            onMobileNavClose={closeMobileMenu}
          />
        </Suspense>
      </nav>
      <LogoutButton />
    </aside>
  );
}
