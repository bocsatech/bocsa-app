"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type ChallengeState = {
  compact: string;
  operation: "add" | "subtract";
  value: number;
  ready: boolean;
  loading: boolean;
};

const EMPTY_CHALLENGE: ChallengeState = {
  compact: "",
  operation: "add",
  value: 0,
  ready: false,
  loading: false,
};

function challengeTaskText(operation: "add" | "subtract", value: number) {
  if (operation === "add") {
    return `Addieren Sie ${value} zu Ihrer Geheimzahl.`;
  }
  return `Subtrahieren Sie ${value} von Ihrer Geheimzahl.`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pinAnswer, setPinAnswer] = useState("");
  const [challenge, setChallenge] = useState<ChallengeState>(EMPTY_CHALLENGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const loadChallenge = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setChallenge(EMPTY_CHALLENGE);
      return;
    }

    const seq = ++loadSeq.current;
    setChallenge((current) => ({ ...current, loading: true, ready: false }));
    setError(null);
    setPinAnswer("");

    const response = await fetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ username: trimmed }),
    });

    const result = await response.json().catch(() => ({}));
    if (seq !== loadSeq.current) return;

    if (!response.ok) {
      setChallenge(EMPTY_CHALLENGE);
      setError(result.error || "Aufgabe konnte nicht erstellt werden.");
      return;
    }

    setChallenge({
      compact: String(result.compact ?? ""),
      operation: result.operation === "subtract" ? "subtract" : "add",
      value: Number(result.value) || 0,
      ready: true,
      loading: false,
    });
  }, []);

  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed) {
      loadSeq.current += 1;
      setChallenge(EMPTY_CHALLENGE);
      setPinAnswer("");
      return;
    }

    const timer = window.setTimeout(() => {
      loadChallenge(trimmed);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [username, loadChallenge]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!challenge.ready) {
      setError("Bitte warten, bis die Aufgabe geladen ist.");
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ username, password, pinAnswer }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Anmeldung fehlgeschlagen.");
      setLoading(false);
      return;
    }

    window.location.assign(next);
  }

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="loginBrand">
          <span className="sidebarMark">B</span>
          <div>
            <h1>Bocsa</h1>
            <p>Anmeldung</p>
          </div>
        </div>

        <form className="loginForm" onSubmit={handleSubmit}>
          <label>
            <span>Benutzername</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </label>

          <label>
            <span>Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <div className="challengeBox">
            <p className="challengeTitle">Geheimzahl-Aufgabe</p>
            <p className="challengeHint">
              Rechnen Sie mit Ihrer persönlichen Geheimzahl (0–99). Nur das Ergebnis eingeben —
              die Geheimzahl selbst bleibt verborgen.
            </p>
            {challenge.ready && !challenge.loading ? (
              <p className="loginChallengeTask">
                {challengeTaskText(challenge.operation, challenge.value)}
              </p>
            ) : null}
            <div
              className={`loginChallengeMath ${challenge.operation === "subtract" ? "isSubtract" : "isAdd"}`}
              aria-live="polite"
              aria-hidden={!challenge.compact}
            >
              {challenge.loading ? (
                <span className="loginChallengeLoading">…</span>
              ) : challenge.compact ? (
                <span className="loginChallengeCompact">{challenge.compact}</span>
              ) : (
                <span className="loginChallengePlaceholder">—</span>
              )}
            </div>
          </div>

          <label>
            <span>Ergebnis (0–99)</span>
            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              pattern="[0-9]{1,2}"
              maxLength={2}
              value={pinAnswer}
              onChange={(event) =>
                setPinAnswer(event.target.value.replace(/\D/g, "").slice(0, 2))
              }
              placeholder="0–99"
              autoComplete="one-time-code"
              required
              disabled={!challenge.ready}
              className="loginPinInput"
            />
          </label>

          {error ? <p className="loginError">{error}</p> : null}

          <button
            type="submit"
            className="pillButton primary loginSubmit"
            disabled={loading || !challenge.ready}
          >
            {loading ? "Anmeldung…" : "Anmelden"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="loginPage" />}>
      <LoginForm />
    </Suspense>
  );
}
