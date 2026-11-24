import { NextResponse } from "next/server";
import { isTemplate } from "@/lib/config";
import { clientIp, handle } from "@/lib/http";
import { setSession } from "@/lib/session";
import { AppError, clean, createTree, normalizePhone, rateLimit } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const name = clean(body.name, 40);
    const phone = normalizePhone(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    const template = isTemplate(body.template) ? body.template : "lush";
    if (!name) throw new AppError(400, "Гацуурын нэрээ оруулна уу.");
    if (!phone) throw new AppError(400, "Утасны дугаар 8 оронтой байх ёстой.");
    if (password.length < 6 || password.length > 72) throw new AppError(400, "Нууц үг дор хаяж 6 тэмдэгт байна.");
    await rateLimit(`create:${clientIp(req)}`, 10, 3600);
    const tree = await createTree({ name, phone, password, template });
    await setSession(tree.id);
    return NextResponse.json({ id: tree.id });
  });
}
