"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  username: string;
  password: string;
  pin: string | null;
  role: string;
  name: string;
  must_set_pin: boolean;
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [user, setUser] = useState<UserRow | null>(null);
  const [mustSetPin, setMustSetPin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedUsername = window.localStorage.getItem("remember_username");
    if (savedUsername) setUsername(savedUsername);
  }, []);

  async function handleLogin() {
    if (!username || !password) {
      alert("Bitte Benutzername und Passwort eingeben");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Falscher Benutzername oder falsches Passwort");
      return;
    }

    const foundUser = data as UserRow;

    if (foundUser.must_set_pin) {
      setUser(foundUser);
      setMustSetPin(true);
      return;
    }

    if (!pin || pin.length !== 2) {
      alert("Bitte 2-stelligen PIN eingeben");
      return;
    }

    if (foundUser.pin !== pin) {
      alert("Falscher PIN");
      return;
    }

    finishLogin(foundUser);
  }

  async function saveNewPin() {
    if (!newPin || newPin.length !== 2) {
      alert("Der PIN muss 2-stellig sein");
      return;
    }

    if (!user) {
      alert("Benutzer nicht gefunden");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("users")
      .update({
        pin: newPin,
        basis_nummer: Number(newPin),
        must_set_pin: false,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    finishLogin({
      ...user,
      pin: newPin,
      basis_nummer: Number(newPin),
      must_set_pin: false,
    } as UserRow);
  }

  function finishLogin(userData: UserRow) {
    if (remember) {
      window.localStorage.setItem("remember_username", username);
    } else {
      window.localStorage.removeItem("remember_username");
    }

    window.localStorage.setItem("bocsa_user", JSON.stringify(userData));
    document.cookie = "bocsa_logged_in=true; path=/; max-age=86400";

    router.push("/");
  }

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>BOCSA TECH</h1>

        <div style={fieldStyle}>
          <label style={labelStyle}>Benutzername</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            disabled={mustSetPin}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            disabled={mustSetPin}
          />
        </div>

        {!mustSetPin && (
          <div style={fieldStyle}>
            <label style={labelStyle}>PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 2))}
              style={inputStyle}
              maxLength={2}
            />
          </div>
        )}

        {mustSetPin && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Neuen 2-stelligen PIN erstellen</label>
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 2))}
              style={inputStyle}
              maxLength={2}
            />
          </div>
        )}

        {!mustSetPin && (
          <label style={rememberStyle}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Benutzername merken
          </label>
        )}

        <button
          onClick={mustSetPin ? saveNewPin : handleLogin}
          disabled={loading}
          style={buttonStyle}
        >
          {loading
            ? "Bitte warten..."
            : mustSetPin
            ? "PIN speichern"
            : "Anmelden"}
        </button>
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle: CSSProperties = {
  width: 560,
  maxWidth: "95%",
  background: "white",
  borderRadius: 26,
  padding: 46,
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
};

const titleStyle: CSSProperties = {
  textAlign: "center",
  fontSize: 52,
  fontWeight: 900,
  color: "#9a3f00",
  marginBottom: 42,
  whiteSpace: "nowrap",
};

const fieldStyle: CSSProperties = {
  marginBottom: 24,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 10,
  fontSize: 22,
  fontWeight: 800,
  color: "#222",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 66,
  borderRadius: 16,
  border: "2px solid #ddd",
  paddingLeft: 20,
  fontSize: 24,
  color: "black",
  background: "white",
};

const rememberStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginBottom: 28,
  fontSize: 18,
  color: "black",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: 74,
  borderRadius: 18,
  border: "none",
  background: "#9a3f00",
  color: "white",
  fontSize: 28,
  fontWeight: 900,
  cursor: "pointer",
};
