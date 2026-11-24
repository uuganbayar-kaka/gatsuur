import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "gs";
const MAX_AGE = 60 * 60 * 24 * 60;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.VERCEL) throw new Error("SESSION_SECRET тохируулаагүй байна.");
    return new TextEncoder().encode("dev-only-insecure-secret");
  }
  return new TextEncoder().encode(s);
}

export async function setSession(treeId: string) {
  const token = await new SignJWT({ tid: treeId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionTreeId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.tid === "string" ? payload.tid : null;
  } catch {
    return null;
  }
}
