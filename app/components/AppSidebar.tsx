"use client";

import { Suspense, useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "./LogoutButton";

export const MASCHINEN_NAV = {
  href: "/maschinen",
  label: "Maschinen",
  children: [
    { href: "/maschinen?aktion=hinzufuegen", label: "Maschine hinzufügen", aktion: "hinzufuegen" },
    { href: "/maschinen?aktion=qr", label: "QR-Code scannen", aktion: "qr" },
  ],
} as const;

export const HOME_NAV = { href: "/", label: "Home" } as const;

export const APP_NAV_ITEMS = [
  { href: "/meldungen", label: "Meldungen" },
  { href: "/arbeitsauftrag", label: "Arbeitsauftrag" },
  { href: "/pruefprotokoll", label: "Prüfprotokoll" },
  { href: "/lager", label: "Lager" },
  { href: "/arbeitsstunden", label: "Arbeitsstunden" },
  { href: "/filialen", label: "Filialen" },
  { href: "/users", label: "Users" },
  { href: "/groups", label: "Gruppen" },
  { href: "/qr-code", label: "QR Code" },
] as const;

type NavItem = (typeof APP_NAV_ITEMS)[number];

type Props = {
  activeHref?: string;
  subtitle?: string;
};

function isNavActive(item: NavItem, activeHref: string | undefined, pathname: string) {
  if (item.href === "/arbeitsauftrag") {
    return activeHref === "/arbeitsauftrag" && !pathname.includes("machineId=");
  }
  return activeHref === item.href || pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isMaschinenSectionActive(
  activeHref: string | undefined,
  pathname: string
) {
  return (
    activeHref === MASCHINEN_NAV.href ||
    pathname === MASCHINEN_NAV.href ||
    pathname.startsWith("/maschinen/")
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
    if (sectionActive) {
      setOpen(true);
    }
  }, [sectionActive]);

  function handleMaschinenClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      sectionActive &&
      open &&
      pathname === MASCHINEN_NAV.href &&
      !aktion
    ) {
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
                pathname.startsWith("/maschinen") && aktion === child.aktion
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
        <Link
          href={HOME_NAV.href}
          className={
            activeHref === HOME_NAV.href || pathname === HOME_NAV.href
              ? "active"
              : undefined
          }
        >
          {HOME_NAV.label}
        </Link>
        <Suspense
          fallback={
            <Link href={MASCHINEN_NAV.href} className="active">
              {MASCHINEN_NAV.label}
            </Link>
          }
        >
          <MaschinenNavGroup activeHref={activeHref} pathname={pathname} />
        </Suspense>
        {APP_NAV_ITEMS.map((item) => {
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
      </nav>
      <LogoutButton />
    </aside>
  );
}
