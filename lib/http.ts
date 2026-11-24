import { NextResponse } from "next/server";
import { log } from "./log";
import { AppError } from "./trees";

/** Route handler-ийн бүх алдааг барьж, 5xx-ийг логт бүртгэнэ. */
export async function handle(req: Request, fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e: unknown) {
    const url = new URL(req.url);
    if (e instanceof AppError) {
      if (e.status === 429) await log("warn", "rate_limited", e.message, { path: url.pathname });
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const dbDown = e instanceof Error && e.message.startsWith("DB_NOT_CONFIGURED");
    await log("error", dbDown ? "db.not_configured" : "api.unhandled", e, { method: req.method, path: url.pathname });
    return NextResponse.json(
      { error: dbDown ? "Өгөгдлийн сан тохируулаагүй байна." : "Серверийн алдаа гарлаа. Дахин оролдоно уу." },
      { status: 500 },
    );
  }
}

export function baseUrl(req: Request) {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
