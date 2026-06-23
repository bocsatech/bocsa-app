import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  CHALLENGE_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "../../../../lib/auth/constants";
import { verifyChallengeToken } from "../../../../lib/auth/challenge-token";
import {
  computePinResult,
  normalizePinAnswer,
} from "../../../../lib/auth/pin";
import { createSessionToken } from "../../../../lib/auth/session";
import { findUserByUsername, verifyPassword } from "../../../../lib/auth/users";

function authConfigError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SESSION_SECRET")) {
    return NextResponse.json(
      {
        error:
          "Server-Konfiguration: SESSION_SECRET fehlt (Vercel → Settings → Environment Variables).",
      },
      { status: 500 }
    );
  }
  return null;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const pinAnswer = normalizePinAnswer(
      typeof body.pinAnswer === "string"
        ? body.pinAnswer
        : typeof body.answer === "string"
          ? body.answer
          : ""
    );

    if (!username || !password) {
      return NextResponse.json(
        { error: "Benutzername und Passwort sind erforderlich." },
        { status: 400 }
      );
    }

    if (pinAnswer === null) {
      return NextResponse.json(
        { error: "Bitte das Ergebnis eingeben (0–99)." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(CHALLENGE_COOKIE)?.value;
    const challenge = challengeToken ? await verifyChallengeToken(challengeToken) : null;

    if (!challenge) {
      return NextResponse.json(
        { error: "Aufgabe abgelaufen. Bitte Benutzername erneut eingeben." },
        { status: 400 }
      );
    }

    const { user, error } = await findUserByUsername(username);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json(
        { error: "Anmeldung fehlgeschlagen. Benutzername oder Passwort prüfen." },
        { status: 401 }
      );
    }

    if (user.is_active === false) {
      return NextResponse.json(
        { error: "Dieser Benutzer ist deaktiviert. Bitte wenden Sie sich an einen Administrator." },
        { status: 403 }
      );
    }

    if (user.id !== challenge.userId) {
      return NextResponse.json(
        { error: "Aufgabe passt nicht zum Benutzernamen. Bitte Benutzername erneut eingeben." },
        { status: 400 }
      );
    }

    if (user.secret_pin === null || user.secret_pin === undefined) {
      return NextResponse.json(
        { error: "Für diesen Benutzer ist keine Geheimzahl hinterlegt." },
        { status: 400 }
      );
    }

    const expected = computePinResult(user.secret_pin, challenge.value, challenge.operation);
    if (pinAnswer !== expected) {
      return NextResponse.json(
        { error: "Falsches Ergebnis." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({ sub: user.id, username: user.username });
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, username: user.username },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    response.cookies.set({
      name: CHALLENGE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const configResponse = authConfigError(error);
    if (configResponse) return configResponse;
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Anmeldung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
