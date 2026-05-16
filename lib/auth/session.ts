import { SignJWT, jwtVerify } from "jose";
import { SESSION_MAX_AGE } from "./constants";
import { getSessionSecret } from "./secret";

export type SessionPayload = {
  sub: string;
  username: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const userId = payload.sub;
    const username = payload.username;

    if (!userId || typeof username !== "string") {
      return null;
    }

    return { userId, username };
  } catch {
    return null;
  }
}
