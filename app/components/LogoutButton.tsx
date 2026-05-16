"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className="logoutButton" onClick={logout} disabled={loading}>
      {loading ? "Abmelden..." : "Abmelden"}
    </button>
  );
}
