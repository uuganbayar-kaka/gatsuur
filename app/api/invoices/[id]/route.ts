import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { AppError, getInvoice, publicInvoice, syncInvoice } from "@/lib/trees";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await ctx.params;
    const inv = await getInvoice(id);
    if (!inv) throw new AppError(404, "Нэхэмжлэх олдсонгүй.");
    return NextResponse.json(publicInvoice(await syncInvoice(inv)));
  });
}
