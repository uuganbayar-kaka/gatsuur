import { NextResponse } from "next/server";
import { getAdmin, isAdminToken } from "@/lib/admin";
import { readLogs, type LogLevel } from "@/lib/log";

export const dynamic = "force-dynamic";

// GET /api/admin/logs?level=error&limit=200   (админ сешн, эсвэл Authorization: Bearer <ADMIN_TOKEN>)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!(await getAdmin()) && !isAdminToken(token)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const level = url.searchParams.get("level") as LogLevel | null;
  const limit = Math.min(2000, Number(url.searchParams.get("limit")) || 200);
  return NextResponse.json(await readLogs(limit, level ?? undefined));
}
