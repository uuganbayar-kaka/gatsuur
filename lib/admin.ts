import { timingSafeEqual } from "crypto";

/** ADMIN_TOKEN тохируулаагүй бол админ хэсэг бүрэн хаалттай. */
export function isAdmin(token: string | null | undefined) {
  const want = process.env.ADMIN_TOKEN;
  if (!want || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
