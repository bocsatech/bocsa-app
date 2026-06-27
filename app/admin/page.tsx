"use client";

import Link from "next/link";
import AppPageShell from "../components/AppPageShell";
import { ADMIN_LOCALHOST_NAV } from "../components/AppSidebar";

export default function AdminPage() {
  const links = ADMIN_LOCALHOST_NAV.children.filter((item) => item.href !== "/admin");

  return (
    <AppPageShell activeHref="/admin" subtitle="Admin" title="Admin">
      <div className="welcomeCard">
        <h1>Admin</h1>
        <p className="subtitle">Verwaltung — Baugerät und PKW.</p>
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
