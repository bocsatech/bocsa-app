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
  Car,
} from "lucide-react";

export default function DashboardPage() {
  useEffect(() => {
    const loggedIn = localStorage.getItem("bocsa_logged_in");
    if (loggedIn !== "true") window.location.href = "/login";
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
            <div style={techStyle}>— TECH —</div>
          </div>

          <nav style={menuStyle}>
            <MenuItem icon={<ClipboardList size={18} />} text="Arbeitsprotokol" />
            <MenuItem icon={<Package size={18} />} text="Lager" />
            <MenuItem icon={<Wrench size={18} />} text="Ersatzteile" />
            <MenuItem icon={<Clock3 size={18} />} text="Arbeitsstunden" />
            <MenuItem icon={<Building2 size={18} />} text="Filiale" />
            <MenuItem icon={<ShieldCheck size={18} />} text="Prüfprotokol" />
          </nav>
        </div>

        <button onClick={logout} style={logoutButtonStyle}>
          <LogOut size={20} />
        </button>
      </aside>

      <section style={contentStyle}>
        <div style={contentCardStyle}>
          <h1 style={welcomeStyle}>WILLKOMMEN</h1>
          <p style={subtitleStyle}>Wählen Sie eine Kategorie aus</p>

          <div style={gridStyle}>
            <CategoryCard title="Kleingeräte" icon="🪚" />
            <CategoryCard title="Großgeräte" icon="🚜" />
            <CategoryCard title="Elektrogeräte 230" icon="🔌" />
            <CategoryCard title="Elektrogeräte 400" icon="🔌" />
            <CategoryCard title="PKW" icon={<Car size={82} strokeWidth={2.4} />} />
          </div>

          <button style={uploadButtonStyle}>↥</button>
        </div>
      </section>
    </main>
  );
}

function MenuItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div style={menuItemStyle}>
      <span style={menuIconStyle}>{icon}</span>
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
  minHeight: "100vh",
  background: "#f7f7f7",
  display: "flex",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const sidebarStyle: CSSProperties = {
  width: 150,
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ff7a00 0%, #f05a00 100%)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxShadow: "8px 0 26px rgba(0,0,0,0.15)",
};

const logoBoxStyle: CSSProperties = {
  paddingTop: 26,
  paddingBottom: 24,
  textAlign: "center",
};

const logoStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: 3,
};

const techStyle: CSSProperties = {
  marginTop: 8,
  fontSize: 11,
  letterSpacing: 4,
  fontWeight: 700,
};

const menuStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const menuItemStyle: CSSProperties = {
  height: 50,
  display: "flex",
  alignItems: "center",
  gap: 11,
  paddingLeft: 18,
  fontSize: 12,
  fontWeight: 700,
  borderTop: "1px solid rgba(255,255,255,0.08)",
};

const menuIconStyle: CSSProperties = {
  color: "#111",
  width: 22,
  display: "flex",
};

const logoutButtonStyle: CSSProperties = {
  width: 44,
  height: 44,
  marginLeft: 18,
  marginBottom: 28,
  border: "none",
  background: "transparent",
  color: "#111",
  cursor: "pointer",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: "26px 28px",
};

const contentCardStyle: CSSProperties = {
  position: "relative",
  minHeight: "calc(100vh - 52px)",
  maxWidth: 760,
  background: "#fff",
  padding: "32px 34px 44px",
  boxSizing: "border-box",
  boxShadow: "0 12px 34px rgba(0,0,0,0.10)",
};

const welcomeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 32,
  fontWeight: 900,
  color: "#111",
  margin: 0,
  letterSpacing: 1,
};

const subtitleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  color: "#888",
  marginTop: 8,
  marginBottom: 26,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 170px)",
  gap: 18,
  justifyContent: "center",
};

const categoryCardStyle: CSSProperties = {
  height: 168,
  borderRadius: 8,
  background: "#fff",
  border: "1px solid #eee",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const categoryTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#111",
  marginBottom: 18,
  textAlign: "center",
};

const categoryIconStyle: CSSProperties = {
  color: "#f05a00",
  fontSize: 78,
  lineHeight: 1,
};

const uploadButtonStyle: CSSProperties = {
  position: "absolute",
  right: 24,
  bottom: 24,
  width: 48,
  height: 48,
  borderRadius: "50%",
  border: "none",
  background: "#fff",
  color: "#111",
  boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
  fontSize: 30,
  fontWeight: 900,
  cursor: "pointer",
};
