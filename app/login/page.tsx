"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type Step = "login" | "set-secret" | "challenge";

type UserRow = {
  id: string;
  username: string;
  password: string;
  role: string;
  basis_nummer: number | null;
  must_set_pin: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretNumber, setSecretNumber] = useState("");
  const [answer, setAnswer] = useState("");
  const [user, setUser] = useState<UserRow | null>(null);

  const [operator, setOperator] = useState<"+" | "-">("+");
  const [randomNumber, setRandomNumber] = useState(1);

  function createChallenge() {
    const op: "+" | "-" = Math.random() > 0.5 ? "+" : "-";
    const num = op === "+" ? Math.floor(Math.random() * 20) + 1 : Math.floor(Math.random() * 9) + 1;

    setOperator(op);
    setRandomNumber(num);
    setAnswer("");
  }

  async function checkLogin() {
    if (!username || !password) {
      alert("Bitte Benutzername und Passwort eingeben");
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    if (error || !data) {
      alert("Falscher Benutzername oder falsches Passwort");
      return;
    }

    const foundUser = data as UserRow;
    setUser(foundUser);

    if (foundUser.must_set_pin === true || foundUser.basis_nummer === null) {
      setStep("set-secret");
      return;
    }

    createChallenge();
    setStep("challenge");
  }

  async function saveSecretNumber() {
    if (!/^\d{2}$/.test(secretNumber)) {
      alert("Die geheime Zahl muss 2-stellig sein");
      return;
    }

    if (!user) {
      alert("Benutzer nicht gefunden");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        basis_nummer: Number(secretNumber),
        must_set_pin: false,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    setUser({
      ...user,
      basis_nummer: Number(secretNumber),
      must_set_pin: false,
    });

    createChallenge();
    setStep("challenge");
  }

  function checkChallenge() {
    if (!user || user.basis_nummer === null) {
      alert("Benutzerfehler");
      return;
    }

    const correct =
      operator === "+"
        ? user.basis_nummer + randomNumber
        : user.basis_nummer - randomNumber;

    if (Number(answer) !== correct) {
      alert("Falsches Ergebnis");
      createChallenge();
      return;
    }

    localStorage.setItem("bocsa_logged_in", "true");
    localStorage.setItem("bocsa_user", JSON.stringify(user));

    document.cookie = "bocsa_logged_in=true; path=/; max-age=86400; SameSite=Lax";

    router.push("/");
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1 style={logoStyle}>BOCSA TECH</h1>

        {step === "login" && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Benutzername</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Passwort</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
style={inputStyle} />
            </div>

            <button onClick={checkLogin} style={buttonStyle}>Weiter</button>
          </>
        )}

        {step === "set-secret" && (
          <>
            <p style={infoStyle}>Bitte eigene 2-stellige geheime Zahl festlegen.</p>

            <div style={fieldStyle}>
              <label style={labelStyle}>Geheime Zahl</label>
              <input
                value={secretNumber}
                onChange={(e) => setSecretNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
                maxLength={2}
                style={inputStyle}
              />
            </div>

            <button onClick={saveSecretNumber} style={buttonStyle}>Speichern</button>
          </>
        )}

        {step === "challenge" && (
          <>
            <p style={infoStyle}>Sicherheitsprüfung</p>

            <div style={challengeStyle}>
              {operator} {randomNumber} = ?
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Ergebnis</label>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))}
                style={inputStyle}
              />
            </div>

            <button onClick={checkChallenge} style={buttonStyle}>Anmelden</button>
          </>
        )}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 24,
};

const cardStyle: CSSProperties = {
  width: 560,
  maxWidth: "95%",
  background: "white",
  borderRadius: 30,
  padding: 50,
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
};

const logoStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 58,
  fontWeight: 900,
  color: "#9a3f00",
  marginBottom: 45,
};

const fieldStyle: CSSProperties = {
  marginBottom: 25,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 10,
  fontSize: 22,
  fontWeight: 800,
  color: "#000",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 68,
  borderRadius: 18,
  border: "2px solid #ddd",
  paddingLeft: 20,
  paddingRight: 20,
  fontSize: 24,
  color: "#000",
  background: "white",
  boxSizing: "border-box",
};

const infoStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 24,
  fontWeight: 800,
  color: "#000",
  marginBottom: 30,
};

const challengeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 52,
  fontWeight: 900,
  color: "#000",
  marginBottom: 35,
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: 74,
  borderRadius: 20,
  border: "none",
  background: "#9a3f00",
  color: "white",
  fontSize: 28,
  fontWeight: 900,
  cursor: "pointer",
};
