"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  ClipboardList,
  Package,
  Wrench,
  Clock3,
  Building2,
  ShieldCheck,
  LogOut,
  Search,
  QrCode,
  Monitor,
  Hammer,
  Truck,
  Plug,
  Car,
} from "lucide-react";

export default function DashboardPage() {
  useEffect(() => {
    const loggedIn = localStorage.getItem("bocsa_logged_in");

    if (loggedIn !== "true") {
      window.location.href = "/login";
    }
  }, []);

  function logout() {
    localStorage.removeItem("bocsa_logged_in");
    localStorage.removeItem("bocsa_user");

    document.cookie =
      "bocsa_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    window.location.href = "/login";
  }

  return (
    <main style={pageStyle}>
      <aside style={sidebarStyle}>
        <div>
          <div style={logoBoxStyle}>
            <div style={logoStyle}>BOCSA</div>
            <div style={techStyle}>TECH</div>
          </div>

          <nav style={menuStyle}>
            <MenuItem icon={<ClipboardList size={30} />} text="Arbeitsprotokol" />
            <MenuItem icon={<Package size={30} />} text="Lager" />
            <MenuItem icon={<Wrench size={30} />} text="Ersatzteile" />
            <MenuItem icon={<Clock3 size={30} />} text="Arbeitsstunden" />
            <MenuItem icon={<Building2 size={30} />} text="Filiale" />
            <MenuItem icon={<ShieldCheck size={30} />} text="Prüfprotokol" />

            <div style={dividerStyle} />

            <MenuItem icon={<Monitor size={30} />} text="All Geräten" />
            <MenuItem icon={<Search size={30} />} text="Suchen" />
            <MenuItem icon={<QrCode size={30} />} text="QR Scannen" />
          </nav>
        </div>

        <button onClick={logout} style={logoutButtonStyle}>
          <LogOut size={32} />
          Abmelden
        </button>
      </aside>

      <section style={contentStyle}>
        <div style={contentCardStyle}>
          <h1 style={welcomeStyle}>WILLKOMMEN</h1>
          <p style={subtitleStyle}>Wählen Sie eine Kategorie aus</p>

          <div style={gridStyle}>
            <CategoryCard title="Kleingeräte" icon={<Hammer size={130} />} />
            <CategoryCard title="Großgeräte" icon={<Truck size={130} />} />
            <CategoryCard title="Elektrogeräte 230" icon={<Plug size={130} />} />
            <CategoryCard title="Elektrogeräte 400" icon={<Plug size={130} />} />
            <CategoryCard title="PKW" icon={<Car size={130} />} />
            <CategoryCard title="Arbeitsprotokol" icon={<ClipboardList size={130} />} />
            <CategoryCard title="All Geräten" icon={<Monitor size={130} />} />
            <CategoryCard title="Suchen" icon={<Search size={130} />} />
            <CategoryCard title="QR Scannen" icon={<QrCode size={130} />} />
          </div>
        </div>
      </section>
    </main>
  );
}

function MenuItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div style={menuItemStyle}>
      <div style={menuIconStyle}>{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function CategoryCard({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div style={categoryCardStyle}>
      <div style={categoryTitleStyle}>{title}</div>
      <div style={categoryIconStyle}>{icon}</div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  background: "#ffffff",
  display: "flex",
  border: "4px solid #f26a00",
  boxSizing: "border-box",
};

const sidebarStyle: CSSProperties = {
  width: 330,
  background: "linear-gradient(180deg, #ff7a00 0%, #f25a00 100%)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "4px 0 20px rgba(0,0,0,0.12)",
};

const logoBoxStyle: CSSProperties = {
  textAlign: "center",
  paddingTop: 42,
  paddingBottom: 34,
};

const logoStyle: CSSProperties = {
  fontSize: 64,
  fontWeight: 900,
  letterSpacing: 4,
};

const techStyle: CSSProperties = {
  fontSize: 26,
  letterSpacing: 10,
  fontWeight: 600,
};

const menuStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const menuItemStyle: CSSProperties = {
  height: 72,
  display: "flex",
  alignItems: "center",
  gap: 20,
  paddingLeft: 40,
  fontSize: 24,
  fontWeight: 800,
  color: "white",
};

const menuIconStyle: CSSProperties = {
  color: "black",
  width: 38,
  display: "flex",
  alignItems: "center",
};

const dividerStyle: CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.4)",
  margin: "22px 28px",
};

const logoutButtonStyle: CSSProperties = {
  height: 78,
  margin: 28,
  borderRadius: 16,
  border: "none",
  background: "rgba(0,0,0,0.12)",
  color: "white",
  fontSize: 25,
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  cursor: "pointer",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: 44,
};

const contentCardStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 88px)",
  background: "#ffffff",
  borderRadius: 34,
  padding: 44,
  boxSizing: "border-box",
};

const welcomeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 76,
  fontWeight: 900,
  color: "#000000",
  margin: 0,
  marginBottom: 10,
};

const subtitleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 30,
  color: "#666666",
  marginBottom: 52,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
  gap: 34,
};

const categoryCardStyle: CSSProperties = {
  height: 270,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid #eeeeee",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const categoryTitleStyle: CSSProperties = {
  fontSize: 27,
  fontWeight: 900,
  color: "#000000",
  marginBottom: 28,
  textAlign: "center",
};

const categoryIconStyle: CSSProperties = {
  color: "#f26a00",
};
