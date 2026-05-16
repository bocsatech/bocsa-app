// app/login/page.tsx

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Hiba a bejelentkezéskor: " + error.message);
    } else {
      localStorage.setItem("bocsa_logged_in", "true");
      window.location.href = "/";
    }
  };

  return (
    <div style={styles.container}>
      <h1>Bejelentkezés</h1>
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Bejelentkezés</button>
      </form>
    </div>
  );
}

// Stílusok
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#f9f9f9",
    padding: "20px",
    boxSizing: "border-box",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "400px",
  },
  input: {
    margin: "10px 0",
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px",
    fontSize: "1rem",
    borderRadius: "5px",
    border: "none",
    background: "#0070f3",
    color: "#fff",
    cursor: "pointer",
    transition: "background 0.2s",
  },
};
