import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { adminConfigured } from "@/lib/admin";
import { paymentMode, qpayConfigured } from "@/lib/qpay";

export const dynamic = "force-dynamic";

// Deploy хийсний дараа /api/health-ээр DB, төлбөрийн тохиргоог шалгана.
export async function GET() {
  const out: Record<string, unknown> = {
    paymentMode: paymentMode(),
    qpayConfigured: qpayConfigured(),
    sessionSecret: !!process.env.SESSION_SECRET,
    adminConfigured: adminConfigured(),
  };
  try {
    const db = getDB();
    const t = Date.now();
    out.db = { kind: db.kind, ok: await db.ping(), ms: Date.now() - t };
  } catch (e) {
    out.db = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const ok = (out.db as { ok: boolean }).ok && !!out.sessionSecret;
  return NextResponse.json({ ok, ...out }, { status: ok ? 200 : 503 });
}
