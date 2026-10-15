import { SignJWT, jwtVerify } from "jose";
import type { NextFunction, Request, Response } from "express";

const COOKIE_NAME = "mizan_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function issueSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("mizan-ai")
    .setExpirationTime("7d")
    .sign(signingKey());
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
  });
}

export async function requireAuth(
  req: Request,
  res: Response<unknown, { userId: string }>,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "تسجيل الدخول مطلوب" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, signingKey(), { issuer: "mizan-ai" });
    if (typeof payload.sub !== "string") {
      res.status(401).json({ error: "انتهت صلاحية الجلسة" });
      return;
    }
    res.locals.userId = payload.sub;
    next();
  } catch {
    clearSessionCookie(res);
    res.status(401).json({ error: "انتهت صلاحية الجلسة" });
  }
}

export function userIdFrom(res: Response<unknown, { userId: string }>): string {
  return res.locals.userId;
}
