"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [name, setName] = useState("Róbert Bocsa");
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [randomNumber, setRandomNumber] = useState(12);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  function newChallenge() {
    const op = Math.random() > 0.5 ? "+" : "-";
    const num = Math.floor(Math.random() * 90) + 10;

    setOperator(op);
    setRandomNumber(num);
    setAnswer("");
    setError("");
  }

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
      newChallenge();
      return;
    }

    localStorage.setItem(
      "bocsa_user",
      JSON.stringify({
        id: result.user_id,
        name: result.name,
        role: result.role,
      })
    );

    router.push("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          width: 420,
          background: "white",
          padding: 36,
          borderRadius: 24,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ color: "#ff5e00" }}>BOCSA TECH</h1>
        <h2>Login</h2>

        <label style={{ fontWeight: 700 }}>Benutzer</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 6,
            marginBottom: 20,
            borderRadius: 10,
            border: "1px solid #bbb",
          }}
        />

        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
          Deine Nummer {operator} {randomNumber} = ?
        </div>

        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Ergebnis"
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 10,
            border: "1px solid #bbb",
            fontSize: 18,
          }}
        />

        {error && (
          <p style={{ color: "red", fontWeight: 700 }}>
            {error}
          </p>
        )}

        <button
          onClick={login}
          style={{
            marginTop: 24,
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "none",
            background: "#ff5e00",
            color: "white",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          Einloggen
        </button>

        <button
          onClick={newChallenge}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #ccc",
            background: "white",
          }}
        >
          Neue Aufgabe
        </button>
      </div>
    </main>
  );
}
