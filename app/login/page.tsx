"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CSSProperties } from "react";

type UserType = {
  id: string;
  username: string;
  password: string;
  basis_nummer: number | null;
  must_set_pin: boolean;
};

type StepType =
  | "login"
  | "set-secret"
  | "challenge";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] =
    useState<StepType>("login");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [secretNumber, setSecretNumber] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [user, setUser] =
    useState<UserType | null>(null);

  const [operator, setOperator] =
    useState<"+" | "-">("+");

  const [randomNumber, setRandomNumber] =
    useState(1);

  async function handleLogin() {
    const { data, error } =
      await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

    if (error || !data) {
      alert("Falsche Login Daten");
      return;
    }

    const foundUser = data as UserType;

    setUser(foundUser);

    if (
      foundUser.must_set_pin === true ||
      foundUser.basis_nummer === null
    ) {
      setStep("set-secret");
      return;
    }

    createChallenge();

    setStep("challenge");
  }

  function createChallenge() {
    const op =
      Math.random() > 0.5 ? "+" : "-";

    const number =
      op === "+"
        ? Math.floor(Math.random() * 20) + 1
        : Math.floor(Math.random() * 9) + 1;

    setOperator(op);

    setRandomNumber(number);
  }

  async function saveSecret() {
    if (!/^\d{2}$/.test(secretNumber)) {
      alert(
        "Bitte 2-stellige Zahl eingeben"
      );
      return;
    }

    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        basis_nummer:
          Number(secretNumber),
        must_set_pin: false,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    const updatedUser = {
      ...user,
      basis_nummer:
        Number(secretNumber),
      must_set_pin: false,
    };

    setUser(updatedUser);

    createChallenge();

    setStep("challenge");
  }

  function finishLogin() {
    if (!user) return;

    const secret =
      user.basis_nummer || 0;

    const correctResult =
      operator === "+"
        ? secret + randomNumber
        : secret - randomNumber;

    if (
      Number(answer) !== correctResult
    ) {
      alert("Falsches Ergebnis");
      return;
    }

    localStorage.setItem(
      "bocsa_logged_in",
      "true"
    );

    document.cookie =
      "bocsa_logged_in=true; path=/;";

    router.push("/");
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={logoStyle}>
          BOCSA
        </h1>

        <div style={techStyle}>
          TECH
        </div>

        {step === "login" && (
          <>
            <h2 style={titleStyle}>
              Anmeldung
            </h2>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Benutzername
              </label>

              <input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Passwort
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleLogin}
              style={buttonStyle}
            >
              Weiter
            </button>
          </>
        )}

        {step === "set-secret" && (
          <>
            <h2 style={titleStyle}>
              Eigene geheime Zahl
            </h2>

            <p style={infoStyle}>
              Bitte eigene 2-stellige
              Zahl festlegen
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Geheime Zahl
              </label>

              <input
                value={secretNumber}
                onChange={(e) =>
                  setSecretNumber(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 2)
                  )
                }
                maxLength={2}
                style={inputStyle}
              />
            </div>

            <button
              onClick={saveSecret}
              style={buttonStyle}
            >
              Speichern
            </button>
          </>
        )}

        {step === "challenge" && (
          <>
            <h2 style={titleStyle}>
              Sicherheitsprüfung
            </h2>

            <div style={challengeStyle}>
              {user?.basis_nummer}{" "}
              {operator}{" "}
              {randomNumber} = ?
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Ergebnis
              </label>

              <input
                value={answer}
                onChange={(e) =>
                  setAnswer(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                style={inputStyle}
              />
            </div>

            <button
              onClick={finishLogin}
              style={buttonStyle}
            >
              Anmelden
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f5f5f5",
};

const cardStyle: CSSProperties = {
  width: 520,
  maxWidth: "95%",
  background: "white",
  borderRadius: 30,
  padding: 50,
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.1)",
};

const logoStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 58,
  fontWeight: 900,
  color: "#ff6a00",
  margin: 0,
};

const techStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 24,
  letterSpacing: 8,
  marginBottom: 40,
};

const titleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 34,
  marginBottom: 20,
};

const fieldStyle: CSSProperties = {
  marginBottom: 24,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 10,
  fontWeight: 700,
  fontSize: 20,
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 68,
  borderRadius: 18,
  border: "2px solid #ddd",
  paddingLeft: 20,
  fontSize: 24,
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: 70,
  border: "none",
  borderRadius: 18,
  background: "#ff6a00",
  color: "white",
  fontSize: 26,
  fontWeight: 800,
  cursor: "pointer",
};

const infoStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 20,
  marginBottom: 30,
};

const challengeStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 42,
  fontWeight: 900,
  marginBottom: 30,
};
