"use client";

import { Suspense, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "./LogoutButton";

export const MASCHINEN_NAV = {
  href: "/maschinen",
  label: "Maschinen",
  permission: "menu.machines",
  children: [
    { href: "/maschinen?aktion=hinzufuegen", label: "Maschine hinzufügen", aktion: "hinzufuegen" },
    {
      href: "/maschinen?aktion=geraetenummer-codes",
      label: "Nummern-Codes",
      aktion: "geraetenummer-codes",
    },
    { href: "/maschinen?aktion=qr", label: "QR-Code scannen", aktion: "qr" },
  ],
} as const;

export const PKW_NAV = {
  label: "PKW",
  children: [
    { href: "/kunden", label: "Kunden", permission: "menu.kunden" },
    { href: "/pkw-service", label: "PKW-Service", permission: "menu.pkw_service" },
  ],
} as const;

export const HOME_NAV = { href: "/", label: "Home", permission: "menu.dashboard" } as const;

export const APP_NAV_ITEMS = [
  { href: "/meldungen", label: "Meldungen", permission: "menu.machines" },
  { href: "/arbeitsauftrag", label: "Arbeitsauftrag", permission: "menu.machines" },
  { href: "/pruefprotokoll", label: "Prüfprotokoll", permission: "menu.machines" },
  { href: "/lager", label: "Lager", permission: "menu.warehouse" },
  { href: "/arbeitsstunden", label: "Arbeitsstunden", permission: "menu.hours" },
  { href: "/filialen", label: "Filialen", permission: "menu.branches" },
  { href: "/qr-code", label: "QR-Code", permission: "menu.qr" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: "/users", label: "Benutzer", permission: "menu.users" },
  { href: "/groups", label: "Gruppen", permission: "menu.groups" },
] as const;

type NavItem = (typeof APP_NAV_ITEMS)[number];
type AdminNavItem = (typeof ADMIN_NAV_ITEMS)[number];

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

function isNavActive(item: NavItem | AdminNavItem, activeHref: string | undefined, pathname: string) {
  if (item.href === "/arbeitsauftrag") {
    return activeHref === "/arbeitsauftrag" && !pathname.includes("machineId=");
  }
  return activeHref === item.href || pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isMaschinenSectionActive(activeHref: string | undefined, pathname: string) {
  return (
    activeHref === MASCHINEN_NAV.href ||
    pathname === MASCHINEN_NAV.href ||
    pathname.startsWith("/maschinen/")
  );
}

function isPkwSectionActive(activeHref: string | undefined, pathname: string) {
  return (
    activeHref === "/kunden" ||
    activeHref === "/pkw-service" ||
    pathname === "/kunden" ||
    pathname.startsWith("/kunden/") ||
    pathname === "/pkw-service" ||
    pathname.startsWith("/pkw-service/") ||
    pathname.startsWith("/pkw/")
  );
}

function MaschinenNavGroup({
  activeHref,
  pathname,
}: {
  activeHref: string | undefined;
  pathname: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aktion = searchParams.get("aktion");
  const sectionActive = isMaschinenSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  function handleMaschinenClick(event: MouseEvent<HTMLAnchorElement>) {
    if (sectionActive && open && pathname === MASCHINEN_NAV.href && !aktion) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!sectionActive || pathname !== MASCHINEN_NAV.href || aktion) {
      event.preventDefault();
      router.push(MASCHINEN_NAV.href);
    }
  }

  return (
    <div className="sidebarNavGroup">
      <Link
        href={MASCHINEN_NAV.href}
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={open}
        onClick={handleMaschinenClick}
      >
        {MASCHINEN_NAV.label}
      </Link>
      {open ? (
        <div className="sidebarNavSub">
          {MASCHINEN_NAV.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={
                pathname.startsWith("/maschinen") && aktion === child.aktion ? "active" : undefined
              }
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PkwNavGroup({
  activeHref,
  pathname,
  visibleChildren,
}: {
  activeHref: string | undefined;
  pathname: string;
  visibleChildren: typeof PKW_NAV.children;
}) {
  const sectionActive = isPkwSectionActive(activeHref, pathname);
  const [open, setOpen] = useState(sectionActive);

  useEffect(() => {
    if (sectionActive) setOpen(true);
  }, [sectionActive]);

  if (visibleChildren.length === 0) return null;

  return (
    <div className="sidebarNavGroup">
      <button
        type="button"
        className={`sidebarNavParent${sectionActive ? " active" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {PKW_NAV.label}
      </button>
      {open ? (
        <div className="sidebarNavSub">
          {visibleChildren.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={
                pathname === child.href || pathname.startsWith(`${child.href}/`)
                  ? "active"
                  : undefined
              }
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AppSidebar({ activeHref, subtitle = "Betrieb" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        setPermissions(result.permissions ?? []);
        setGroups(result.groups ?? []);
        setUsername(result.username ?? result.user?.username);
      })
      .catch(() => {
        setPermissions([]);
        setGroups([]);
      });
  }, []);

  const showHome = canShowMenuItem(HOME_NAV.permission, permissions, groups, username);
  const showMaschinen = canShowMenuItem(MASCHINEN_NAV.permission, permissions, groups, username);
  const pkwChildren = PKW_NAV.children.filter((child) =>
    canShowMenuItem(child.permission, permissions, groups, username)
  );
  const navItems = APP_NAV_ITEMS.filter((item) =>
    canShowMenuItem(item.permission, permissions, groups, username)
  );
  const adminItems = ADMIN_NAV_ITEMS.filter((item) =>
    canShowMenuItem(item.permission, permissions, groups, username)
  );

  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <div className="sidebarMark">B</div>
        <div>
          <p className="sidebarTitle">Bocsa</p>
          <p className="sidebarSubtitle">{subtitle}</p>
        </div>
      </div>
      <nav className="sidebarNav">
        {showHome ? (
          <Link
            href={HOME_NAV.href}
            className={
              activeHref === HOME_NAV.href || pathname === HOME_NAV.href ? "active" : undefined
            }
          >
            {HOME_NAV.label}
          </Link>
        ) : null}

        {showMaschinen ? (
          <Suspense
            fallback={
              <Link href={MASCHINEN_NAV.href} className="active">
                {MASCHINEN_NAV.label}
              </Link>
            }
          >
            <MaschinenNavGroup activeHref={activeHref} pathname={pathname} />
          </Suspense>
        ) : null}

        {navItems.map((item) => {
          const active = isNavActive(item, activeHref, pathname);

          if (item.href === "/arbeitsauftrag") {
            return (
              <a
                key={item.href}
                href="/arbeitsauftrag"
                className={active ? "active" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  router.replace("/arbeitsauftrag");
                }}
              >
                {item.label}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
            >
              {item.label}
            </Link>
          );
        })}

        <PkwNavGroup
          activeHref={activeHref}
          pathname={pathname}
          visibleChildren={pkwChildren}
        />

        {adminItems.length > 0 ? <div className="sidebarNavDivider" aria-hidden="true" /> : null}

        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isNavActive(item, activeHref, pathname) ? "active" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <LogoutButton />
    </aside>
  );
}
