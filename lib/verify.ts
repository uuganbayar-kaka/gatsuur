// verify.mn — Монголын MO SMS утас баталгаажуулалт.
// Хэрэглэгч өөрийн утаснаас 144773 руу код илгээнэ → verify.mn тухайн дугаараас ирснийг баталгаажуулна.
//   POST /sessions          (Bearer VERIFY_MN_API_KEY) → sessionId, smsUri, displayInstruction, expiresAt
//   GET  /sessions/{id}     (auth шаардлагагүй)        → sessionStatus: PENDING | VERIFIED | EXPIRED
// Callback (GET, body/гарын үсэггүй) нь зөвхөн "одоо шалга" дохио — үргэлж GET /sessions/{id}-ээр дахин шалгана.
import { randomInt } from "crypto";
import { log } from "./log";

const BASE = () => (process.env.VERIFY_MN_BASE_URL || "https://api.verify.mn").replace(/\/$/, "");

export class VerifyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type VerifySession = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

export type VerifyStatus = {
  sessionId: string;
  sessionStatus: "PENDING" | "VERIFIED" | "EXPIRED";
  callbackStatus?: "PENDING" | "SENT" | "FAILED";
  verifiedAt?: string | null;
  expiresAt: string;
};

function apiKey() {
  const key = process.env.VERIFY_MN_API_KEY;
  if (!key) throw new VerifyError(500, "VERIFY_MN_API_KEY тохируулаагүй байна.");
  return key;
}

export const verifyConfigured = () => !!process.env.VERIFY_MN_API_KEY;

/** Session бүрт шинэ, санамсаргүй 6 оронтой код (дахин ашиглахгүй). */
export const randomCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** expiresAt нь ISO мөр эсвэл unix (сек/мс) байж болно. */
export function expiresMs(v: string | number) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : Date.now() + 300_000;
}

export async function createVerifySession(phone: string, opts: { callback?: string; text?: string } = {}): Promise<VerifySession> {
  const body: Record<string, string> = { phone, text: opts.text ?? randomCode() };
  // Callback зөвхөн жинхэнэ https хаяг байвал — хуурамч хаяг бүртгэвэл verify.mn дахин дахин оролдоно
  if (opts.callback?.startsWith("https://")) body.callback = opts.callback;

  const res = await fetch(`${BASE()}/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => null)) as (VerifySession & { message?: string; error?: string }) | null;
  if (!res.ok || !j?.sessionId) {
    // API key-г хэзээ ч логлохгүй — зөвхөн статус, хариуны мессеж
    await log("error", "verify.create_failed", `POST /sessions → ${res.status}`, { status: res.status, error: j?.message ?? j?.error });
    throw new VerifyError(res.status, res.status === 401 ? "verify.mn API key буруу байна." : "Баталгаажуулалт эхлүүлж чадсангүй.");
  }
  await log("info", "verify.session_created", undefined, { sessionId: j.sessionId, expiresAt: j.expiresAt });
  return j;
}

export async function getVerifySession(sessionId: string): Promise<VerifyStatus> {
  const res = await fetch(`${BASE()}/sessions/${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => null)) as VerifyStatus | null;
  if (!res.ok || !j?.sessionStatus) {
    await log("warn", "verify.status_failed", `GET /sessions/${sessionId} → ${res.status}`, { status: res.status });
    throw new VerifyError(res.status, "Баталгаажуулалтын төлөв авч чадсангүй.");
  }
  return j;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

/**
 * Утсыг бүрэн баталгаажуулна: session үүсгэж, VERIFIED болтол 3 сек тутам шалгана.
 * `onSession`-оор displayInstruction / smsUri-г хэрэглэгчид харуулна.
 * VERIFIED → true; EXPIRED, хугацаа дууссан, hard timeout → false. API key буруу бол VerifyError шиднэ.
 *
 * Анхаар: Vercel-ийн serverless функц 5 минут хүлээж чадахгүй тул вэб урсгал (PIN сэргээх)
 * createVerifySession + getVerifySession-ийг тусад нь ашиглаж, хөтөч талаас polling хийдэг.
 */
export async function verifyPhone(
  phone: string,
  opts: { onSession?: (s: VerifySession) => void; pollMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<boolean> {
  const { pollMs = 3000, timeoutMs = 330_000 } = opts;
  const session = await createVerifySession(phone);
  opts.onSession?.(session);
  const deadline = Math.min(Date.now() + timeoutMs, expiresMs(session.expiresAt) + pollMs);

  while (Date.now() < deadline) {
    try {
      const s = await getVerifySession(session.sessionId);
      if (s.sessionStatus === "VERIFIED") {
        await log("info", "verify.verified", undefined, { sessionId: session.sessionId });
        return true;
      }
      if (s.sessionStatus === "EXPIRED") break;
    } catch (e) {
      if (e instanceof VerifyError && e.status === 404) break;
      // Түр зуурын алдаа (5xx, сүлжээ) — дараагийн удаа дахин оролдоно
    }
    await sleep(pollMs, opts.signal);
  }
  await log("info", "verify.expired", undefined, { sessionId: session.sessionId });
  return false;
}
