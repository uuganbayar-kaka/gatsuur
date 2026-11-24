import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { completeReset } from "@/lib/reset";
import { setSession } from "@/lib/session";
import { AppError } from "@/lib/trees";

export async function POST(req: Request, ctx: { params: Promise<{ rid: string }> }) {
  return handle(req, async () => {
    const { rid } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!/^\d{4}$/.test(pin)) throw new AppError(400, "PIN код 4 оронтой тоо байна.");
    const treeId = await completeReset(rid, pin);
    await setSession(treeId); // шинэ PIN тохируулмагц шууд нэвтрүүлнэ
    return NextResponse.json({ id: treeId });
  });
}
