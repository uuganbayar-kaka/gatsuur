import { getDB } from "./db";

export type LogLevel = "error" | "warn" | "info";

export type LogEntry = {
  t: number;
  level: LogLevel;
  event: string;
  msg?: string;
  data?: Record<string, unknown>;
  stack?: string;
};

const KEY = "logs";
const MAX = 2000;
const SECRET = /(password|secret|token|authorization|access_token|refresh_token)/i;

function scrub(v: unknown, depth = 0): unknown {
  if (depth > 4 || v == null) return v;
  if (typeof v === "string") return v.length > 2000 ? v.slice(0, 2000) + "…" : v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => scrub(x, depth + 1));
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === "qr_image") out[k] = "[base64]";
      else out[k] = SECRET.test(k) ? "***" : scrub(x, depth + 1);
    }
    return out;
  }
  return v;
}

/**
 * Vercel-ийн Runtime Logs руу (console) болон Redis-д (сүүлийн 2000) бүртгэнэ.
 * Лог бичихэд алдаа гарсан ч үндсэн хүсэлтийг хэзээ ч унагахгүй.
 */
export async function log(level: LogLevel, event: string, err?: unknown, data?: Record<string, unknown>) {
  const e: LogEntry = { t: Date.now(), level, event };
  if (err instanceof Error) {
    e.msg = err.message;
    e.stack = err.stack?.split("\n").slice(0, 8).join("\n");
  } else if (typeof err === "string") e.msg = err;
  if (data) e.data = scrub(data) as Record<string, unknown>;

  const line = JSON.stringify(e);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  try {
    const db = getDB();
    await db.lpush(KEY, e);
    await db.ltrim(KEY, 0, MAX - 1);
  } catch (x) {
    console.error(JSON.stringify({ level: "error", event: "log.write_failed", msg: String(x) }));
  }
}

export async function readLogs(limit = 200, level?: LogLevel): Promise<LogEntry[]> {
  const rows = await getDB().lrange<LogEntry>(KEY, 0, MAX - 1);
  return (level ? rows.filter((r) => r.level === level) : rows).slice(0, limit);
}
