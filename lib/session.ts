import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "gs";
const MAX_AGE = 60 * 60 * 24 * 60;

export function secret() {
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

/**
 * Мөнгөтэй гацуурын төлбөр хүлээгдэж байх үед үүсгэгчийн хөтөчид invoice id-г гарын үсэгтэй хадгална —
 * төлөгдсөний дараа зөвхөн энэ хөтөч л шинэ гацуурт автоматаар нэвтэрнэ.
 */
const PENDING_COOKIE = "gc";

export async function setPendingCreate(invoiceId: string) {
  const token = await new SignJWT({ inv: invoiceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret());
  (await cookies()).set(PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function getPendingCreate(): Promise<string | null> {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.inv === "string" ? payload.inv : null;
  } catch {
    return null;
  }
}

export async function clearPendingCreate() {
  (await cookies()).delete(PENDING_COOKIE);
}
