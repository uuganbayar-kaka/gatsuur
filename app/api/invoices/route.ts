import { NextResponse } from "next/server";
import { ORNAMENTS, EXPAND_PLANS } from "@/lib/config";
import { baseUrl, clientIp, handle } from "@/lib/http";
import { getSessionTreeId } from "@/lib/session";
import { AppError, clean, createInvoice, publicInvoice, rateLimit } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const treeId = clean(body.treeId, 20);
    await rateLimit(`inv:${clientIp(req)}`, 40, 600);

    if (body.kind === "gift") {
      const orn = ORNAMENTS.find((o) => o.id === body.ornament);
      const from = clean(body.from, 40);
      const message = clean(body.message, 300);
      if (!orn) throw new AppError(400, "Чимэглэлээ сонгоно уу.");
      if (!from) throw new AppError(400, "Нэрээ оруулна уу.");
      const inv = await createInvoice({ kind: "gift", treeId, ornament: orn.id, from, message }, baseUrl(req));
      return NextResponse.json(publicInvoice(inv));
    }

    if (body.kind === "expand") {
      if ((await getSessionTreeId()) !== treeId) throw new AppError(403, "Зөвхөн эзэн нь гацуураа томруулна.");
      const plan = EXPAND_PLANS.find((p) => p.id === body.plan);
      if (!plan) throw new AppError(400, "Багцаа сонгоно уу.");
      const inv = await createInvoice({ kind: "expand", treeId, plan: plan.id }, baseUrl(req));
      return NextResponse.json(publicInvoice(inv));
    }

    throw new AppError(400, "Буруу хүсэлт.");
  });
}
