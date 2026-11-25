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

/**
 * Сешн: эзэмшдэг гацуурын id-ууд (1 утас = 1 энгийн + 1 мөнгөтэй гацуур байж болно).
 * Хуучин сешн ({ tid }) ч уншигдана.
 */
export async function setSession(treeIds: string | string[]) {
  const tids = [...new Set(Array.isArray(treeIds) ? treeIds : [treeIds])];
  const token = await new SignJWT({ tids })
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

/**
 * Одоогийн сешн дээр гацуур нэмнэ (энгийн гацууртай хүн мөнгөтэй гацуур үүсгэхэд).
 * Зөвхөн ижил утасны гацуурууд үлдэнэ — нэг хөтөч дээр өөр хүний гацуур холилдохгүй.
 */
export async function addSessionTree(treeId: string, phoneOf: (id: string) => Promise<string | null | undefined>) {
  const phone = await phoneOf(treeId);
  const prev = await getSessionTreeIds();
  const keep = [];
  for (const id of prev) if (id !== treeId && phone && (await phoneOf(id)) === phone) keep.push(id);
  await setSession([...keep, treeId]);
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionTreeIds(): Promise<string[]> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, secret());
    if (Array.isArray(payload.tids)) return payload.tids.filter((x): x is string => typeof x === "string");
    return typeof payload.tid === "string" ? [payload.tid] : [];
  } catch {
    return [];
  }
}

/** Эхний (үндсэн) гацуур — нэг л гацуур хэрэгтэй газар. */
export async function getSessionTreeId(): Promise<string | null> {
  return (await getSessionTreeIds())[0] ?? null;
}

/** Энэ гацуурын эзэн мөн эсэх. */
export async function isTreeOwner(treeId: string) {
  return (await getSessionTreeIds()).includes(treeId);
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
