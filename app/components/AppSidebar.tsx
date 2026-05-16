"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";

export const APP_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/maschinen", label: "Maschinen" },
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
