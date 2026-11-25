import { NextResponse } from "next/server";
import { isTemplate } from "@/lib/config";
import { clientIp, handle } from "@/lib/http";
import { addSessionTree } from "@/lib/session";
import { AppError, clean, createTree, normalizePhone, rateLimit, treePhone } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const name = clean(body.name, 40);
    const phone = normalizePhone(body.phone);
    const pin = typeof body.pin === "string" ? body.pin : "";
    const template = isTemplate(body.template) ? body.template : "lush";
    if (!name) throw new AppError(400, "Гацуурын нэрээ оруулна уу.");
    if (!phone) throw new AppError(400, "Утасны дугаар 8 оронтой байх ёстой.");
    if (!/^\d{4}$/.test(pin)) throw new AppError(400, "PIN код 4 оронтой тоо байна.");
    await rateLimit(`create:${clientIp(req)}`, 10, 3600);
    const tree = await createTree({ name, phone, password: pin, template });
    await addSessionTree(tree.id, treePhone);
    return NextResponse.json({ id: tree.id });
  });
}
