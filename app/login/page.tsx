"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const name = "Róbert Bocsa";
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [randomNumber, setRandomNumber] = useState(12);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  async function login() {
    const { data, error } = await supabase.rpc("verify_login_challenge", {
      user_name: name,
      operator,
      random_number: randomNumber,
      answer: Number(answer),
    });

    if (error) {
      setError(error.message);
      return;
    }

    const result = data?.[0];

    if (!result?.success) {
      setError("Falsche Antwort");
      return;
    }

    localStorage.setItem("bocsa_user", JSON.stringify(result));
    router.push("/");
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f6f8", color: "#111", display: "flex", alignItems: 
"center", justifyContent: "center", fontFamily: "Arial" }}>
      <div style={{ width: 420, background: "white", color: "#111", padding: 36, borderRadius: 24 }}>
        <h1 style={{ color: "#ff5e00" }}>BOCSA TECH</h1>
        <h2 style={{ color: "#111" }}>Login</h2>

        <p style={{ color: "#111", fontWeight: 700 }}>Benutzer: {name}</p>

        <div style={{ color: "#111", fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
          Deine Nummer {operator} {randomNumber} = ?
        </div>

        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Ergebnis"
          style={{ width: "100%", padding: 14, color: "#111", background: "#fff", border: "1px solid #999" }}
        />

        {error && <p style={{ color: "red", fontWeight: 700 }}>{error}</p>}

        <button onClick={login} style={{ marginTop: 24, width: "100%", padding: 16, background: "#ff5e00", 
color: "white", fontWeight: 700 }}>
          Einloggen
        </button>
      </div>
    </main>
  );
}
