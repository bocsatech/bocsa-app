"use client";

import { useState } from "react";

export default function AdminUsersPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [role, setRole] = useState("techniker");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 500,
          background: "white",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 5px 30px rgba(0,0,0,0.1)",
        }}
      >
        <h1
          style={{
            color: "#9a3f00",
            fontSize: 36,
            marginBottom: 30,
            textAlign: "center",
          }}
        >
          Benutzerverwaltung
        </h1>

        <input
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Geheime Zahl"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={inputStyle}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={inputStyle}
        >
          <option value="admin">Admin</option>
          <option value="techniker">Techniker</option>
        </select>

        <button
          style={{
            width: "100%",
            padding: 16,
            background: "#9a3f00",
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 18,
            fontWeight: "bold",
            cursor: "pointer",
            marginTop: 20,
          }}
        >
          Benutzer speichern
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 16,
  marginBottom: 20,
  borderRadius: 12,
  border: "1px solid #ccc",
  fontSize: 16,
};
