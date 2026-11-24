import { NextResponse } from "next/server";
import { getAdmin, isAdminToken } from "@/lib/admin";
import { listInvoicesForAdmin } from "@/lib/trees";

export const dynamic = "force-dynamic";

// GET /api/admin/invoices?limit=500   (админ сешн, эсвэл Authorization: Bearer <ADMIN_TOKEN>)
// Дуудлага бүрт хүлээгдэж буй сүүлийн 10 нэхэмжлэхийг QPay-с шалгана → админ дээр төлөв live шинэчлэгдэнэ.
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!(await getAdmin()) && !isAdminToken(token)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const limit = Math.min(5000, Number(new URL(req.url).searchParams.get("limit")) || 500);
  const rows = await listInvoicesForAdmin({ limit, syncPending: 10 });
  return NextResponse.json({ rows, t: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
