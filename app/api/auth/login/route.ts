import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { setSession } from "@/lib/session";
import { AppError, login, normalizePhone, rateLimit } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    if (!phone || !password) throw new AppError(400, "Утасны дугаар, нууц үгээ оруулна уу.");
    await rateLimit(`login:${phone}`, 10, 900);
    const tree = await login(phone, password);
    await setSession(tree.id);
    return NextResponse.json({ id: tree.id });
  });
}
