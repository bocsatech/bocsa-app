"use client";

import type { CSSProperties } from "react";
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
  function logout() {
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
            <h1 style={logoStyle}>BOCSA</h1>

            <div style={techStyle}>TECH</div>
          </div>

          <nav style={menuStyle}>
            <MenuItem
              icon={<ClipboardList size={28} />}
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
              icon={<Building2 size={28} />}
              text="Filiale"
            />

            <MenuItem
              icon={<ShieldCheck size={28} />}
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
            Wählen Sie eine Kategorie aus
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
              icon={<PlugZap size={120} />}
            />

            <CategoryCard
              title="Elektrogeräte 400"
              icon={<PlugZap size={120} />}
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
  icon: React.ReactNode;
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
  icon: React.ReactNode;
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
    "linear-gradient(180deg, #ff6a00 0%, #c84b00 100%)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  paddingTop: 40,
  paddingBottom: 40,
  color: "white",
  boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
};

const logoBoxStyle: CSSProperties = {
  textAlign: "center",
  marginBottom: 50,
};

const logoStyle: CSSProperties = {
  fontSize: 72,
  fontWeight: 900,
  letterSpacing: 2,
  margin: 0,
};

const techStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 300,
  letterSpacing: 10,
};

const menuStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const menuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  height: 80,
  paddingLeft: 34,
  fontSize: 28,
  fontWeight: 700,
  cursor: "pointer",
};

const logoutButtonStyle: CSSProperties = {
  height: 82,
  marginLeft: 24,
  marginRight: 24,
  borderRadius: 18,
  border: "2px solid rgba(255,255,255,0.3)",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  fontSize: 28,
  fontWeight: 800,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 16,
  cursor: "pointer",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: 40,
};

const contentCardStyle: CSSProperties = {
  width: "100%",
  minHeight: "calc(100vh - 80px)",
  background: "white",
  borderRadius: 36,
  padding: 50,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
};

const welcomeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 84,
  fontWeight: 900,
  marginBottom: 10,
  color: "#111",
};

const subtitleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 34,
  color: "#777",
  marginBottom: 60,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 34,
};

const categoryCardStyle: CSSProperties = {
  height: 320,
  borderRadius: 30,
  background: "#fafafa",
  border: "1px solid #ececec",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  cursor: "pointer",
};

const categoryTitleStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "black",
  marginBottom: 30,
};

const categoryIconStyle: CSSProperties = {
  color: "#e45a00",
};
