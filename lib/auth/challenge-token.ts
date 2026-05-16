import { SignJWT, jwtVerify } from "jose";
import { CHALLENGE_MAX_AGE } from "./constants";
import type { PinOperation } from "./pin";
import { getSessionSecret } from "./secret";

export type ChallengePayload = {
  value: number;
  operation: PinOperation;
  userId: string;
};

export async function createChallengeToken(payload: ChallengePayload) {
  return new SignJWT({
    value: payload.value,
    operation: payload.operation,
    userId: payload.userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_MAX_AGE}s`)
    .sign(getSessionSecret());
}

export async function verifyChallengeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const value = payload.value;
    const operation = payload.operation;
    const userId = payload.userId;

    if (
      typeof value !== "number" ||
      value < 0 ||
      value > 99 ||
      (operation !== "add" && operation !== "subtract") ||
      typeof userId !== "string"
    ) {
      return null;
    }

    return {
      value,
      operation: operation as PinOperation,
      userId,
    };
  } catch {
    return null;
  }
}
