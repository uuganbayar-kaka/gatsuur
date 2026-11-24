import { NextResponse } from "next/server";
import { clientIp, handle } from "@/lib/http";
import { setSession } from "@/lib/session";
import { AppError, login, normalizePhone, rateLimit } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!phone || !pin) throw new AppError(400, "Утасны дугаар, PIN кодоо оруулна уу.");
    // 4 оронтой PIN-д таах оролдлогыг хатуу хязгаарлана: утас бүрт 15 минутад 5, IP бүрт 30
    await rateLimit(`login:${phone}`, 5, 900);
    await rateLimit(`login-ip:${clientIp(req)}`, 30, 900);
    const tree = await login(phone, pin);
    await setSession(tree.id);
    return NextResponse.json({ id: tree.id });
  });
}
