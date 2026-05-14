"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Techniker");

  async function saveUser() {
    if (!username || !password) {
      alert("Bitte alle Felder ausfüllen");
      return;
    }

    const temporaryPin = "00";

    const { error } = await supabase
      .from("users")
      .insert([
        {
          name: username,
          username: username,
          password: password,
          role: role,
          basis_nummer: 1,
          pin: temporaryPin,
          must_set_pin: true,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Benutzer erfolgreich erstellt");

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
            placeholder="Benutzername eingeben"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Passwort</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="Passwort eingeben"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Rolle</label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={inputStyle}
          >
            <option>Techniker</option>
            <option>Admin</option>
            <option>Werkstatt</option>
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
  width: "100%",
  minHeight: "100vh",
  background: "#f5f5f5",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 30,
};

const cardStyle = {
  width: 700,
  background: "white",
  borderRadius: 30,
  padding: 50,
  boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
};

const titleStyle = {
  fontSize: 64,
  fontWeight: 900,
  color: "#7a1f00",
  marginBottom: 50,
};

const fieldStyle = {
  marginBottom: 35,
};

const labelStyle = {
  display: "block",
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 28,
  color: "#222",
};

const inputStyle = {
  width: "100%",
  height: 75,
  borderRadius: 18,
  border: "2px solid #ddd",
  paddingLeft: 24,
  fontSize: 24,
  color: "black",
};

const buttonStyle = {
  width: "100%",
  height: 80,
  borderRadius: 20,
  border: "none",
  background: "#9a3f00",
  color: "white",
  fontSize: 30,
  fontWeight: 800,
  cursor: "pointer",
};
