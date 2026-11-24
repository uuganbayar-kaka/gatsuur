import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { paymentMode } from "@/lib/qpay";
import { AppError, finalizeInvoice, getInvoice, publicInvoice } from "@/lib/trees";

// Зөвхөн туршилтын горимд: QPay-гүйгээр төлбөрийг баталгаажуулна.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    if (paymentMode() !== "mock") throw new AppError(403, "Туршилтын горим идэвхгүй.");
    const { id } = await ctx.params;
    const inv = await getInvoice(id);
    if (!inv) throw new AppError(404, "Нэхэмжлэх олдсонгүй.");
    return NextResponse.json(publicInvoice(await finalizeInvoice(inv)));
  });
}
