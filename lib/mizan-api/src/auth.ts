import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "mizan_session";
const SESSION_AGE_SECONDS = 7 * 24 * 60 * 60;

function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return null;
}

export async function issueSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("mizan-ai")
    .setExpirationTime("7d")
    .sign(signingKey());
}

export async function getSessionUserId(
  request: Request,
): Promise<{ userId: string | null; invalid: boolean }> {
  const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
  if (!token) return { userId: null, invalid: false };

  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: "mizan-ai" });
    return {
      userId: typeof payload.sub === "string" ? payload.sub : null,
      invalid: typeof payload.sub !== "string",
    };
  } catch {
    return { userId: null, invalid: true };
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/api; Max-Age=${SESSION_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearedSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}
