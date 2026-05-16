// app/page.tsx

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
  useEffect(() => {
    const loggedIn = localStorage.getItem("bocsa_logged_in");
    if (loggedIn !== "true") {
      router.push("/login");
    }
  }, [router]);

  return (
    <div style={styles.container}>
      <h1 style={styles.welcomeTitle}>Üdvözöljük a BOCSA TECH oldalon</h1>
      <p style={styles.subtitle}>Válasszon egy kategóriát az alábbiak közül:</p>
      <div style={styles.grid}>
        <CategoryCard title="Kleingeräte" />
        <CategoryCard title="Großgeräte" />
        <CategoryCard title="Elektrogeräte 230" />
        <CategoryCard title="Elektrogeräte 400" />
        <CategoryCard title="PKW" />
        <CategoryCard title="Arbeitsprotokol" />
        <CategoryCard title="Alle Geräte" />
        <CategoryCard title="QR Scannen" />
      </div>
      <div style={styles.loginLink}>
        <Link href="/login">Bejelentkezés</Link>
      </div>
    </div>
  );
}

// Kategória kártya komponens
function CategoryCard({ title }: { title: string }) {
  return (
    <div style={styles.categoryCard}>
      <h2 style={styles.categoryTitle}>{title}</h2>
    </div>
  );
}

// Stílusok
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f9f9f9",
    padding: "20px",
    boxSizing: "border-box",
  },
  welcomeTitle: {
    fontSize: "2.5rem",
    marginBottom: "20px",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "30px",
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    width: "100%",
    maxWidth: "800px",
  },
  categoryCard: {
    background: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  categoryTitle: {
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  loginLink: {
    marginTop: "40px",
    fontSize: "1rem",
  },
};
