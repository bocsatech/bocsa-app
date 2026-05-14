"use client";

import { useState } from "react";

export default function AdminUsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("techniker");

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
            <option value="admin">Admin</option>
            <option value="techniker">Techniker</option>
          </select>
        </div>

        <button style={buttonStyle}>Benutzer speichern</button>
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
  padding: 20,
};

const cardStyle = {
  width: 560,
  maxWidth: "95%",
  background: "white",
  borderRadius: 20,
  padding: 40,
  boxShadow: "0 5px 30px rgba(0,0,0,0.1)",
};

const titleStyle = {
  color: "#9a3f00",
  fontSize: 38,
  marginBottom: 35,
  textAlign: "center" as const,
  fontWeight: 800,
};

const fieldStyle = {
  marginBottom: 22,
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#222",
  fontSize: 16,
};

const inputStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #999",
  fontSize: 18,
  color: "black",
  background: "white",
};

const buttonStyle = {
  width: "100%",
  padding: 18,
  background: "#9a3f00",
  color: "white",
  border: "none",
  borderRadius: 12,
  fontSize: 20,
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 15,
};
