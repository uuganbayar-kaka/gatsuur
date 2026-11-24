import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { secret } from "./session";

/**
 * Админ хэрэглэгчид — эх кодонд шууд бичигдсэн.
 * Солих бол энд өөрчлөөд дахин deploy хийнэ.
 * ⚠️ Repo-г public болгож болохгүй: код харсан хэн ч нэвтэрч чадна.
 */
const ADMIN_USERS: { username: string; password: string }[] = [
  { username: "admin", password: "zgvznwZywRsg5BF3" },
];

const COOKIE = "ga";
const MAX_AGE = 60 * 60 * 12;

function eq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkAdminCredentials(username: string, password: string) {
  const u = ADMIN_USERS.find((a) => eq(a.username, username));
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
    return name && ADMIN_USERS.some((a) => a.username === name) ? name : null;
  } catch {
    return null;
  }
}

/** Лог API-д скрипт/curl-ээр хандах нэмэлт арга: ADMIN_TOKEN (заавал биш). */
export function isAdminToken(token: string | null | undefined) {
  const want = process.env.ADMIN_TOKEN;
  return !!want && !!token && eq(token, want);
}
