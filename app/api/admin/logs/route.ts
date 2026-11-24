import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { readLogs, type LogLevel } from "@/lib/log";

export const dynamic = "force-dynamic";

// GET /api/admin/logs?level=error&limit=200   (Authorization: Bearer <ADMIN_TOKEN>)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("token");
  if (!isAdmin(token)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const level = url.searchParams.get("level") as LogLevel | null;
  const limit = Math.min(2000, Number(url.searchParams.get("limit")) || 200);
  return NextResponse.json(await readLogs(limit, level ?? undefined));
}
