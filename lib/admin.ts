import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { secret } from "./session";

/**
 * Админ хэрэглэгч — Vercel-ийн Environment Variables-аас уншина (эх кодонд нууц байхгүй):
 *   ADMIN_USERNAME=admin
 *   ADMIN_PASSWORD=<урт нууц үг>
 * Олон админ бол: ADMIN_USERS="admin:pass1,boldoo:pass2"
 * Аль нь ч тохируулаагүй бол админ хэсэг бүрэн хаалттай.
 */
function adminUsers(): { username: string; password: string }[] {
  const list: { username: string; password: string }[] = [];
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD)
    list.push({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
  for (const pair of (process.env.ADMIN_USERS ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i > 0) list.push({ username: pair.slice(0, i).trim(), password: pair.slice(i + 1).trim() });
  }
  
  return list.filter((u) => u.username && u.password.length >= (process.env.VERCEL ? 10 : 1));
}

export const adminConfigured = () => adminUsers().length > 0;

const COOKIE = "ga";
const MAX_AGE = 60 * 60 * 12;

function eq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkAdminCredentials(username: string, password: string) {
  const u = adminUsers().find((a) => eq(a.username, username));
  return !!u && eq(u.password, password) ? u.username : null;
}

export async function setAdminSession(username: string) {
  const token = await new SignJWT({ adm: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE);
}

/** Нэвтэрсэн админы нэр, эсвэл null. Кодоос хасагдсан админы сешн ч хүчингүй болно. */
export async function getAdmin(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const name = typeof payload.adm === "string" ? payload.adm : null;
    return name && adminUsers().some((a) => a.username === name) ? name : null;
  } catch {
    return null;
  }
}

/** Лог API-д скрипт/curl-ээр хандах нэмэлт арга: ADMIN_TOKEN (заавал биш). */
export function isAdminToken(token: string | null | undefined) {
  const want = process.env.ADMIN_TOKEN;
  return !!want && !!token && eq(token, want);
}
