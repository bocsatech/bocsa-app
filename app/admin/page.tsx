"use client";

import Link from "next/link";
import AppPageShell from "../components/AppPageShell";
import { ADMIN_LOCALHOST_NAV } from "../components/AppSidebar";
import { isLocalAppEnvironment } from "../../lib/local-host";

export default function AdminPage() {
  if (!isLocalAppEnvironment()) {
    return (
      <AppPageShell subtitle="Betrieb">
        <div className="welcomeCard">
          <h1>Admin</h1>
          <p>Diese Seite ist nur in der lokalen Entwicklungsumgebung verfügbar.</p>
        </div>
      </AppPageShell>
    );
  }

  const links = ADMIN_LOCALHOST_NAV.children.filter((item) => item.href !== "/admin");

  return (
    <AppPageShell activeHref="/admin" subtitle="Admin" title="Admin">
      <div className="welcomeCard">
        <h1>Admin</h1>
        <p className="subtitle">Verwaltung und Entwickler-Tools — nur localhost.</p>
        <div className="detailTopActions" style={{ marginTop: 16 }}>
          {links.map((item) => (
            <Link key={item.href} className="pillButton outline" href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
