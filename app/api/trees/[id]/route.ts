import { NextResponse } from "next/server";
import { templateFits } from "@/lib/config";
import { handle } from "@/lib/http";
import { getSessionTreeId } from "@/lib/session";
import { AppError, getTree, setTemplate } from "@/lib/trees";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await ctx.params;
    if ((await getSessionTreeId()) !== id) throw new AppError(403, "Зөвхөн эзэн нь өөрчилнө.");
    const body = await req.json().catch(() => ({}));
    const tree = await getTree(id);
    if (!tree) throw new AppError(404, "Гацуур олдсонгүй.");
    // Мөнгөтэй гацуурт зөвхөн мөнгөтэй загвар, энгийнд зөвхөн үнэгүй загвар
    if (!templateFits(tree.kind, body.template)) throw new AppError(400, "Загвар буруу байна.");
    await setTemplate(id, body.template);
    return NextResponse.json({ ok: true });
  });
}
