"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Techniker");

  async function saveUser() {
    if (!username || !password) {
      alert("Bitte Benutzername und Passwort ausfüllen");
      return;
    }

    const temporaryPin = Math.floor(10 + Math.random() * 90).toString();

    const { error } = await supabase.from("users").insert([
      {
        username,
        password,
        role,
        pin: temporaryPin,
        must_set_pin: true,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Benutzer wurde gespeichert");

    setUsername("");
    setPassword("");
    setRole("Techniker");
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Benutzerverwaltung</h1>

        <div style={fieldStyle}>
          <label style={labelStyle}>Benutzername</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Rolle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle}
          >
            <option value="Techniker">Techniker</option>
            <option value="Admin">Admin</option>
            <option value="Service">Service</option>
          </select>
        </div>

        <button onClick={saveUser} style={buttonStyle}>
          Benutzer speichern
        </button>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f4f4f4",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const cardStyle = {
  width: 600,
  background: "white",
  padding: 50,
  borderRadius: 30,
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
};

const titleStyle = {
  textAlign: "center" as const,
  fontSize: 52,
  fontWeight: 800,
  marginBottom: 40,
  color: "#9a3f00",
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
  background: "white",
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
