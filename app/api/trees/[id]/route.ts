import { NextResponse } from "next/server";
import { isTemplate } from "@/lib/config";
import { handle } from "@/lib/http";
import { getSessionTreeId } from "@/lib/session";
import { AppError, setTemplate } from "@/lib/trees";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await ctx.params;
    if ((await getSessionTreeId()) !== id) throw new AppError(403, "Зөвхөн эзэн нь өөрчилнө.");
    const body = await req.json().catch(() => ({}));
    if (!isTemplate(body.template)) throw new AppError(400, "Загвар буруу байна.");
    await setTemplate(id, body.template);
    return NextResponse.json({ ok: true });
  });
}
