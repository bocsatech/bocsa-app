import { NextResponse } from "next/server";
import { CHALLENGE_COOKIE, CHALLENGE_MAX_AGE } from "../../../../lib/auth/constants";
import { createChallengeToken } from "../../../../lib/auth/challenge-token";
import {
  compactChallengeLabel,
  createChallengeForPin,
  normalizeSecretPin,
} from "../../../../lib/auth/pin";
import { findUserByUsername } from "../../../../lib/auth/users";
import { authConfigErrorResponse } from "../../../../lib/auth/config-error.mjs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!username) {
      return NextResponse.json(
        { error: "Bitte zuerst den Benutzernamen eingeben." },
        { status: 400 }
      );
    }

    const { user, error } = await findUserByUsername(username);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Benutzer nicht gefunden. Prüfen Sie .env.local: NEXT_PUBLIC_SUPABASE_URL=https://duvzbcxsfzeqjnvohifm.supabase.co und den anon key aus Supabase → Settings → API.",
        },
        { status: 404 }
      );
    }

    const secretPin = normalizeSecretPin(user.secret_pin);
    if (secretPin === null) {
      return NextResponse.json(
        {
          error:
            "Für diesen Benutzer ist keine Geheimzahl hinterlegt. Bitte supabase/users-secret-pin.sql im Supabase SQL Editor ausführen.",
        },
        { status: 400 }
      );
    }

    const { operation, value } = createChallengeForPin(secretPin);
    const token = await createChallengeToken({
      userId: user.id,
      operation,
      value,
    });

    const response = NextResponse.json({
      operation,
      value,
      compact: compactChallengeLabel(operation, value),
    });

    response.cookies.set({
      name: CHALLENGE_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CHALLENGE_MAX_AGE,
    });

    return response;
  } catch (error) {
    const configResponse = authConfigErrorResponse(error);
    if (configResponse) {
      return NextResponse.json(
        { error: configResponse.error },
        { status: configResponse.status }
      );
    }
    console.error("[auth/challenge]", error);
    return NextResponse.json(
      { error: "Aufgabe konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
