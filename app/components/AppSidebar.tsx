"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
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

export const MEINE_MENU_AUFGABEN_NAV = {
  label: "Aufgaben",
  children: [
    { href: "/meldungen", label: "Meldungen", permission: "menu.machines" },
    { href: "/arbeitsstunden", label: "Arbeitsstunden", permission: "menu.hours" },
  ],
} as const;

export const MEINE_MENU_PERSOENLICH_NAV = {
  label: "Persönliche Sache",
  children: [
    { href: "/filialen", label: "Filialen", permission: "menu.branches" },
    { href: "/qr-code", label: "QR-Code", permission: "menu.qr" },
  ],
} as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/users", label: "Benutzer", permission: "menu.users" },
  { href: "/groups", label: "Gruppen", permission: "menu.groups" },
] as const;

type MeineMenuSubItem =
  | (typeof MEINE_MENU_AUFGABEN_NAV.children)[number]
  | (typeof MEINE_MENU_PERSOENLICH_NAV.children)[number];
type AdminNavItem = (typeof ADMIN_NAV_ITEMS)[number];
type BauSubItem = (typeof BAUMASCHINEN_NAV.children)[number];

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

function isNavActive(item: AdminNavItem, activeHref: string | undefined, pathname: string) {
  return activeHref === item.href || pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isMeineMenuSubActive(
  child: MeineMenuSubItem,
  activeHref: string | undefined,
  pathname: string
) {
  return activeHref === child.href || pathname === child.href || pathname.startsWith(`${child.href}/`);
}

function isAufgabenSectionActive(activeHref: string | undefined, pathname: string) {
  return MEINE_MENU_AUFGABEN_NAV.children.some((child) =>
    isMeineMenuSubActive(child, activeHref, pathname)
  );
}

function isPersoenlichSectionActive(activeHref: string | undefined, pathname: string) {
  return MEINE_MENU_PERSOENLICH_NAV.children.some((child) =>
    isMeineMenuSubActive(child, activeHref, pathname)
  );
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
  nav,
  activeHref,
  pathname,
  sectionActive,
  submenuOpen,
  permissions,
  groups,
  username,
  onMobileNavClose,
}: {
  nav: typeof MEINE_MENU_AUFGABEN_NAV | typeof MEINE_MENU_PERSOENLICH_NAV;
  activeHref: string | undefined;
  pathname: string;
  sectionActive: boolean;
  submenuOpen: boolean;
  permissions: string[];
  groups: string[];
  username?: string;
  onMobileNavClose?: () => void;
}) {
  const visibleChildren = nav.children.filter((child) =>
    canShowMenuItem(child.permission, permissions, groups, username)
  );
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  if (visibleChildren.length === 0) return null;

  const showSub = submenuOpen || open;

  return (
    <div className="sidebarNavGroup sidebarMeineMenuGroup">
      <button
        type="button"
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={() => setOpen((current) => !current)}
      >
        {nav.label}
      </button>
      {showSub ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={
                isMeineMenuSubActive(child, activeHref, pathname) ? "active" : undefined
              }
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
  onMobileNavClose?: () => void;
}) {
  const router = useRouter();
  const sectionActive = isBaumaschinenSectionActive(activeHref, pathname);
  const onListRoot = isBaumaschinenListRoot(pathname, aktion, geraettyp, geraetenummer);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
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

  const showSub = submenuOpen || open;

  return (
    <div className="sidebarNavGroup">
      <Link
        href={BAUMASCHINEN_NAV.href}
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={showSub}
        onClick={handleParentClick}
      >
        {BAUMASCHINEN_NAV.label}
      </Link>
      {showSub ? (
        <div className="sidebarNavSub">
          {BAUMASCHINEN_NAV.children.map((child) => {
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

function LagerNavGroup({
  activeHref,
  pathname,
  submenuOpen,
  meldungenCount,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  submenuOpen: boolean;
  meldungenCount: number;
  onMobileNavClose?: () => void;
}) {
  const router = useRouter();
  const sectionActive = isLagerSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
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

  const showSub = submenuOpen || open;

  return (
    <div className="sidebarNavGroup">
      <Link
        href={LAGER_NAV.href}
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
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
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  aktion: string | null;
  visibleChildren: PkwSubItem[];
  submenuOpen: boolean;
  onMobileNavClose?: () => void;
}) {
  const router = useRouter();
  const sectionActive = isPkwSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(submenuOpen || sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  function handleParentClick(event: MouseEvent<HTMLAnchorElement>) {
    const mobile = isMobileSidebarViewport();
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

  const showSub = submenuOpen || open;

  return (
    <div className="sidebarNavGroup">
      <Link
        href={PKW_NAV.href}
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
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
  const aufgabenActive = isAufgabenSectionActive(activeHref, pathname);
  const persoenlichActive = isPersoenlichSectionActive(activeHref, pathname);
  const adminItems = ADMIN_NAV_ITEMS.filter((item) =>
    canShowMenuItem(item.permission, permissions, groups, username)
  );

  return (
    <>
      <MeineMenuNavGroup
        nav={MEINE_MENU_AUFGABEN_NAV}
        activeHref={activeHref}
        pathname={pathname}
        sectionActive={aufgabenActive}
        submenuOpen={submenuOpen}
        permissions={permissions}
        groups={groups}
        username={username}
        onMobileNavClose={onMobileNavClose}
      />
      <MeineMenuNavGroup
        nav={MEINE_MENU_PERSOENLICH_NAV}
        activeHref={activeHref}
        pathname={pathname}
        sectionActive={persoenlichActive}
        submenuOpen={submenuOpen}
        permissions={permissions}
        groups={groups}
        username={username}
        onMobileNavClose={onMobileNavClose}
      />

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
          onMobileNavClose={onMobileNavClose}
        />
      ) : null}

      <PkwNavGroup
        activeHref={activeHref}
        pathname={pathname}
        aktion={aktion}
        visibleChildren={pkwChildren}
        submenuOpen={submenuOpen}
        onMobileNavClose={onMobileNavClose}
      />

      {showLager ? (
        <LagerNavGroup
          activeHref={activeHref}
          pathname={pathname}
          submenuOpen={submenuOpen}
          meldungenCount={meldungenCount}
          onMobileNavClose={onMobileNavClose}
        />
      ) : null}

      {adminItems.length > 0 ? <div className="sidebarNavDivider" aria-hidden="true" /> : null}

      {adminItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isNavActive(item, activeHref, pathname) ? "active" : undefined}
          onClick={() => onMobileNavClose?.()}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

function SidebarNavWithSearchParams({
  activeHref,
  pathname,
  auth,
  meldungenCount,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  auth: SidebarAuth;
  meldungenCount: number;
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
      onMobileNavClose={onMobileNavClose}
    />
  );
}

function SidebarNavFallback({
  activeHref,
  pathname,
  auth,
  meldungenCount,
  onMobileNavClose,
}: {
  activeHref: string | undefined;
  pathname: string;
  auth: SidebarAuth;
  meldungenCount: number;
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
          {mobileMenuOpen ? "Schließen" : "Meine Menü"}
        </button>
      </div>
      <p className="sidebarMenuLabel">Meine Menü</p>
      <nav id="sidebar-main-nav" className="sidebarNav">
        <Suspense
          fallback={
            <SidebarNavFallback
              activeHref={activeHref}
              pathname={pathname}
              auth={auth}
              meldungenCount={meldungenCount}
              onMobileNavClose={closeMobileMenu}
            />
          }
        >
          <SidebarNavWithSearchParams
            activeHref={activeHref}
            pathname={pathname}
            auth={auth}
            meldungenCount={meldungenCount}
            onMobileNavClose={closeMobileMenu}
          />
        </Suspense>
      </nav>
      <LogoutButton />
    </aside>
  );
}
