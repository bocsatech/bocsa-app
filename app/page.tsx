"use client";

import { useEffect } from "react";
import type {
  CSSProperties,
  ReactNode,
} from "react";

import {
  ClipboardList,
  Package,
  Wrench,
  Clock3,
  Building2,
  ShieldCheck,
  LogOut,
  Hammer,
  Truck,
  PlugZap,
  Car,
} from "lucide-react";

export default function DashboardPage() {
  useEffect(() => {
    const loggedIn =
      localStorage.getItem(
        "bocsa_logged_in"
      );

    if (loggedIn !== "true") {
      window.location.href =
        "/login";
    }
  }, []);

  function logout() {
    localStorage.removeItem(
      "bocsa_logged_in"
    );

    document.cookie =
      "bocsa_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    window.location.href =
      "/login";
  }

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <div>
          <div style={logoBoxStyle}>
            <h1 style={logoStyle}>
              BOCSA
            </h1>

            <div style={techStyle}>
              TECH
            </div>
          </div>

          <nav style={menuStyle}>
            <MenuItem
              icon={
                <ClipboardList size={28} />
              }
              text="Arbeitsprotokol"
            />

            <MenuItem
              icon={<Package size={28} />}
              text="Lager"
            />

            <MenuItem
              icon={<Wrench size={28} />}
              text="Ersatzteile"
            />

            <MenuItem
              icon={<Clock3 size={28} />}
              text="Arbeitsstunden"
            />

            <MenuItem
              icon={
                <Building2 size={28} />
              }
              text="Filiale"
            />

            <MenuItem
              icon={
                <ShieldCheck size={28} />
              }
              text="Prüfprotokol"
            />
          </nav>
        </div>

        <button
          onClick={logout}
          style={logoutButtonStyle}
        >
          <LogOut size={28} />

          Ausloggen
        </button>
      </aside>

      <section style={contentStyle}>
        <div style={contentCardStyle}>
          <h1 style={welcomeStyle}>
            WILLKOMMEN
          </h1>

          <p style={subtitleStyle}>
            Wählen Sie eine Kategorie
            aus
          </p>

          <div style={gridStyle}>
            <CategoryCard
              title="Kleingeräte"
              icon={<Hammer size={120} />}
            />

            <CategoryCard
              title="Großgeräte"
              icon={<Truck size={120} />}
            />

            <CategoryCard
              title="Elektrogeräte 230"
              icon={
                <PlugZap size={120} />
              }
            />

            <CategoryCard
              title="Elektrogeräte 400"
              icon={
                <PlugZap size={120} />
              }
            />

            <CategoryCard
              title="PKW"
              icon={<Car size={120} />}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function MenuItem({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div style={menuItemStyle}>
      {icon}

      <span>{text}</span>
    </div>
  );
}

function CategoryCard({
  title,
  icon,
}: {
  title: string;
  icon: ReactNode;
}) {
  return (
    <div style={categoryCardStyle}>
      <div style={categoryTitleStyle}>
        {title}
      </div>

      <div style={categoryIconStyle}>
        {icon}
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background: "#f3f3f3",
  display: "flex",
};

const sidebarStyle: CSSProperties = {
  width: 320,
  background:
    "linear-gradient(180deg,#ff6a00,#c84b00)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  paddingTop: 40,
  paddingBottom: 40,
  color: "white",
};

const logoBoxStyle: CSSProperties = {
  textAlign: "center",
  marginBottom: 50,
};

const logoStyle: CSSProperties = {
  fontSize: 72,
  fontWeight: 900,
  margin: 0,
};

const techStyle: CSSProperties = {
  fontSize: 28,
  letterSpacing: 8,
};

const menuStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const menuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  height: 78,
  paddingLeft: 30,
  fontSize: 28,
  fontWeight: 700,
};

const logoutButtonStyle: CSSProperties = {
  height: 80,
  marginLeft: 24,
  marginRight: 24,
  borderRadius: 18,
  border: "none",
  background:
    "rgba(255,255,255,0.15)",
  color: "white",
  fontSize: 28,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  cursor: "pointer",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: 40,
};

const contentCardStyle: CSSProperties = {
  background: "white",
  minHeight: "100%",
  borderRadius: 36,
  padding: 50,
};

const welcomeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 82,
  fontWeight: 900,
  marginBottom: 10,
};

const subtitleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 32,
  color: "#666",
  marginBottom: 60,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(320px,1fr))",
  gap: 34,
};

const categoryCardStyle: CSSProperties = {
  height: 320,
  borderRadius: 30,
  background: "#fafafa",
  border: "1px solid #eee",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const categoryTitleStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  marginBottom: 30,
};

const categoryIconStyle: CSSProperties = {
  color: "#ff6a00",
};
