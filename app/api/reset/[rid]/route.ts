import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { syncReset } from "@/lib/reset";
import { AppError } from "@/lib/trees";

// Хөтөч 3 сек тутам дуудна → verify.mn-ээс төлөв шалгана
export async function GET(req: Request, ctx: { params: Promise<{ rid: string }> }) {
  return handle(req, async () => {
    const { rid } = await ctx.params;
    const rec = await syncReset(rid);
    if (!rec) throw new AppError(404, "Хүсэлт олдсонгүй.");
    return NextResponse.json({ status: rec.status, expiresAt: rec.expiresAt });
  });
}
