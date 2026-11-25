import "server-only";
import { getDB } from "./db";
import { log } from "./log";
import { AppError, getTreeIdsByPhone, randomId, setPin } from "./trees";
import { createVerifySession, expiresMs, getVerifySession, VerifyError } from "./verify";

/**
 * PIN сэргээх хүсэлт. verify.mn-ийн sessionId-г утас, гацуурттай холбож хадгална.
 *   reset:<rid>        — хүсэлт (20 мин)
 *   reset:<rid>:used   — PIN нэг л удаа солигдоно (SET NX)
 */
export type ResetRecord = {
  id: string;
  phone: string;
  treeId: string;
  /** Утсанд бүртгэлтэй бүх гацуур (энгийн + мөнгөтэй) — PIN бүгдэд нь солигдоно */
  treeIds?: string[];
  sessionId: string;
  expiresAt: number;
  status: "PENDING" | "VERIFIED" | "EXPIRED";
  verifiedAt?: number;
  createdAt: number;
};

const TTL = 60 * 20;
const PIN_WINDOW_MS = 10 * 60_000; // баталгаажсанаас хойш 10 минутын дотор шинэ PIN тохируулна
const key = (rid: string) => `reset:${rid}`;

export async function startReset(phone: string, baseUrl: string) {
  const treeIds = await getTreeIdsByPhone(phone);
  const treeId = treeIds[0];
  if (!treeId) throw new AppError(404, "Энэ дугаараар гацуур бүртгэлгүй байна.");
  const rid = randomId(16);
  let session;
  try {
    session = await createVerifySession(phone, { callback: `${baseUrl}/api/reset/callback?rid=${rid}` });
  } catch (e) {
    throw new AppError(e instanceof VerifyError && e.status === 400 ? 400 : 502, "Баталгаажуулалт эхлүүлж чадсангүй. Дахин оролдоно уу.");
  }
  const rec: ResetRecord = {
    id: rid,
    phone,
    treeId,
    treeIds,
    sessionId: session.sessionId,
    expiresAt: expiresMs(session.expiresAt),
    status: "PENDING",
    createdAt: Date.now(),
  };
  await getDB().set(key(rid), rec, { ex: TTL });
  await log("info", "reset.started", undefined, { rid, treeId, sessionId: session.sessionId });
  return {
    rid,
    // Хэрэглэгчид ҮГ ҮСГИЙГ НЬ ӨӨРЧЛӨХГҮЙ харуулна — аль дугаараас илгээхийг заадаг
    displayInstruction: session.displayInstruction,
    smsUri: session.smsUri,
    shortcode: session.shortcode,
    text: session.text,
    expiresAt: rec.expiresAt,
  };
}

/** verify.mn-ээс төлөвийг шалгаж, баталгаажсан бол тэмдэглэнэ. Callback болон polling хоёул үүнийг дуудна. */
export async function syncReset(rid: string): Promise<ResetRecord | null> {
  const db = getDB();
  const rec = await db.get<ResetRecord>(key(rid));
  if (!rec || rec.status !== "PENDING") return rec;
  try {
    const s = await getVerifySession(rec.sessionId);
    if (s.sessionStatus === "VERIFIED") {
      rec.status = "VERIFIED";
      rec.verifiedAt = Date.now();
      await log("info", "reset.verified", undefined, { rid, treeId: rec.treeId });
    } else if (s.sessionStatus === "EXPIRED") {
      rec.status = "EXPIRED";
    }
  } catch (e) {
    if (e instanceof VerifyError && e.status === 404) rec.status = "EXPIRED";
  }
  if (rec.status === "PENDING" && Date.now() > rec.expiresAt + 5000) rec.status = "EXPIRED";
  if (rec.status !== "PENDING") await db.set(key(rid), rec, { ex: TTL });
  return rec;
}

export async function completeReset(rid: string, pin: string) {
  const db = getDB();
  const rec = await syncReset(rid);
  if (!rec) throw new AppError(404, "Хүсэлтийн хугацаа дууссан. Дахин эхлүүлнэ үү.");
  if (rec.status !== "VERIFIED") throw new AppError(403, "Утас баталгаажаагүй байна.");
  if (Date.now() - (rec.verifiedAt ?? 0) > PIN_WINDOW_MS) throw new AppError(410, "Хугацаа дууссан. Дахин эхлүүлнэ үү.");
  if (!(await db.set(`${key(rid)}:used`, 1, { nx: true, ex: TTL }))) throw new AppError(409, "PIN аль хэдийн солигдсон.");
  const ids = rec.treeIds ?? [rec.treeId];
  for (const id of ids) await setPin(id, pin);
  return ids;
}
