"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  username: string;
  password: string;
  basis_nummer: number | null;
  must_set_pin: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [operator, setOperator] = useState<"+" | "-">("+");
  const [randomNumber, setRandomNumber] = useState(1);

  useEffect(() => {
    createChallenge();
  }, []);

  function createChallenge() {
    const op: "+" | "-" = Math.random() > 0.5 ? "+" : "-";
    const num =
      op === "+"
        ? Math.floor(Math.random() * 20) + 1
        : Math.floor(Math.random() * 9) + 1;

    setOperator(op);
    setRandomNumber(num);
    setAnswer("");
  }

  async function login(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!username || !password || !answer) {
      alert("Bitte alle Felder ausfüllen");
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
      createChallenge();
      return;
    }

    const user = data as UserRow;

    if (user.basis_nummer === null) {
      alert("Geheime Zahl fehlt. Bitte Benutzer in der Benutzerverwaltung prüfen.");
      createChallenge();
      return;
    }

    const correctResult =
      operator === "+"
        ? user.basis_nummer + randomNumber
        : user.basis_nummer - randomNumber;

    if (Number(answer) !== correctResult) {
      alert("Falsches Ergebnis");
      createChallenge();
      return;
    }

    localStorage.setItem("bocsa_logged_in", "true");
    localStorage.setItem("bocsa_user", JSON.stringify(user));

    document.cookie =
      "bocsa_logged_in=true; path=/; max-age=86400; SameSite=Lax";

    router.push("/");
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={login} style={loginBoxStyle}>
        <h1 style={logoStyle}>BOCSA TECH</h1>

        <div style={lineStyle} />

        <div style={fieldStyle}>
          <label style={labelStyle}>Benutzername</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Password</label>

          <div style={passwordBoxStyle}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={passwordInputStyle}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}
              tabIndex={-1}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div style={securityTitleRowStyle}>
          <div style={smallLineStyle} />
          <div style={securityTitleStyle}>Sicherheitsprüfung</div>
          <div style={smallLineStyle} />
        </div>

        <div style={challengeBoxStyle}>
          <div style={mathStyle}>
            {operator} {randomNumber} = ?
          </div>

          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, ""))}
            style={answerInputStyle}
            placeholder="Ergebnis eingeben"
          />
        </div>

        <button type="submit" style={buttonStyle}>
          Anmelden
        </button>

        <div style={helpRowStyle}>
          <span style={keyStyle}>↔ Tab</span>
          <span style={helpTextStyle}>Feld wechseln</span>

          <span style={dividerStyle}>|</span>

          <span style={keyStyle}>↵ Enter</span>
          <span style={helpTextStyle}>Anmelden</span>
        </div>
      </form>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#ffffff",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 28,
};

const loginBoxStyle: CSSProperties = {
  width: "100%",
  maxWidth: 1180,
  border: "6px solid #f28c00",
  borderRadius: 28,
  padding: "56px 120px 38px",
  boxSizing: "border-box",
  background: "#ffffff",
};

const logoStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 82,
  fontWeight: 900,
  color: "#f28c00",
  margin: 0,
  marginBottom: 30,
  letterSpacing: 2,
};

const lineStyle: CSSProperties = {
  height: 2,
  background: "#f28c00",
  opacity: 0.7,
  marginBottom: 36,
};

const fieldStyle: CSSProperties = {
  marginBottom: 30,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "#000000",
  fontSize: 28,
  fontWeight: 500,
  marginBottom: 12,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 82,
  border: "2px solid #f28c00",
  borderRadius: 10,
  fontSize: 36,
  color: "#000000",
  paddingLeft: 28,
  paddingRight: 28,
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
};

const passwordBoxStyle: CSSProperties = {
  width: "100%",
  height: 82,
  border: "2px solid #d6d6d6",
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  background: "#ffffff",
  boxSizing: "border-box",
};

const passwordInputStyle: CSSProperties = {
  flex: 1,
  height: "100%",
  border: "none",
  outline: "none",
  fontSize: 36,
  color: "#000000",
  paddingLeft: 28,
  paddingRight: 20,
  boxSizing: "border-box",
  background: "transparent",
};

const eyeButtonStyle: CSSProperties = {
  width: 84,
  height: "100%",
  border: "none",
  background: "transparent",
  fontSize: 30,
  cursor: "pointer",
};

const securityTitleRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 30,
  marginTop: 38,
  marginBottom: 26,
};

const smallLineStyle: CSSProperties = {
  flex: 1,
  height: 2,
  background: "#f28c00",
};

const securityTitleStyle: CSSProperties = {
  color: "#f28c00",
  fontSize: 30,
  fontWeight: 900,
};

const challengeBoxStyle: CSSProperties = {
  width: "100%",
  minHeight: 104,
  border: "2px solid #e1e1e1",
  borderRadius: 12,
  display: "grid",
  gridTemplateColumns: "1.3fr 1fr",
  alignItems: "center",
  gap: 36,
  padding: "18px 26px",
  boxSizing: "border-box",
  marginBottom: 30,
  background: "#ffffff",
};

const mathStyle: CSSProperties = {
  color: "#f28c00",
  fontSize: 56,
  fontWeight: 900,
  textAlign: "center",
  letterSpacing: 18,
};

const answerInputStyle: CSSProperties = {
  height: 72,
  border: "2px solid #d6d6d6",
  borderRadius: 10,
  fontSize: 28,
  color: "#000000",
  paddingLeft: 24,
  paddingRight: 24,
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: 92,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(180deg, #ff9a00 0%, #f26a00 100%)",
  color: "#ffffff",
  fontSize: 38,
  fontWeight: 900,
  cursor: "pointer",
  marginBottom: 34,
};

const helpRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 18,
  color: "#000000",
  fontSize: 28,
};

const keyStyle: CSSProperties = {
  border: "2px solid #f28c00",
  color: "#f28c00",
  borderRadius: 8,
  padding: "8px 14px",
  fontWeight: 700,
};

const helpTextStyle: CSSProperties = {
  color: "#000000",
};

const dividerStyle: CSSProperties = {
  color: "#bdbdbd",
  marginLeft: 22,
  marginRight: 22,
};
