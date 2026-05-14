"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const [user, setUser] = useState<any>(null);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("remember_username");

    if (saved) {
      setUsername(saved);
    }
  }, []);

  async function login() {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Falscher Benutzername oder Passwort");
      return;
    }

    if (data.must_set_pin) {
      setUser(data);
      setNeedsPinSetup(true);
      return;
    }

    if (data.pin !== pin) {
      alert("Falscher PIN");
      return;
    }

    finishLogin(data);
  }

  async function saveNewPin() {
    if (pin.length !== 2) {
      alert("PIN muss 2-stellig sein");
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        pin,
        must_set_pin: false,
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    finishLogin({
      ...user,
      pin,
      must_set_pin: false,
    });
  }

  function finishLogin(userData: any) {
    localStorage.setItem(
      "remember_username",
      username
    );

    localStorage.setItem(
      "bocsa_user",
      JSON.stringify(userData)
    );

    document.cookie =
      "bocsa_logged_in=true; path=/; max-age=86400";

    router.push("/");
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>BOCSA TECH</h1>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            Benutzername
          </label>

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
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
              setPassword(e.target.value)
            }
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            {needsPinSetup
              ? "Neuen 2-stelligen PIN erstellen"
              : "PIN"}
          </label>

          <input
            maxLength={2}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value)
            }
            style={inputStyle}
          />
        </div>

        <button
          onClick={
            needsPinSetup
              ? saveNewPin
              : login
          }
          style={buttonStyle}
        >
          {needsPinSetup
            ? "PIN speichern"
            : "Anmelden"}
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: 520,
  background: "white",
  borderRadius: 24,
  padding: 40,
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
};

const titleStyle = {
  textAlign: "center" as const,
  color: "#9a3f00",
  fontSize: 52,
  fontWeight: 800,
  marginBottom: 40,
};

const fieldStyle = {
  marginBottom: 25,
};

const labelStyle = {
  display: "block",
  marginBottom: 10,
  fontWeight: 700,
  fontSize: 20,
  color: "#222",
};

const inputStyle = {
  width: "100%",
  height: 64,
  borderRadius: 14,
  border: "2px solid #ddd",
  paddingLeft: 20,
  fontSize: 22,
  color: "black",
};

const buttonStyle = {
  width: "100%",
  height: 70,
  borderRadius: 18,
  border: "none",
  background: "#9a3f00",
  color: "white",
  fontSize: 26,
  fontWeight: 800,
  cursor: "pointer",
};
