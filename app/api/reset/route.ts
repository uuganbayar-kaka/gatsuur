import { NextResponse } from "next/server";
import { baseUrl, clientIp, handle } from "@/lib/http";
import { startReset } from "@/lib/reset";
import { AppError, normalizePhone, rateLimit } from "@/lib/trees";

// PIN сэргээх: verify.mn session үүсгэнэ
export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    if (!phone) throw new AppError(400, "Утасны дугаар 8 оронтой байх ёстой.");
    await rateLimit(`reset:${phone}`, 6, 3600);
    await rateLimit(`reset-ip:${clientIp(req)}`, 20, 3600);
    return NextResponse.json(await startReset(phone, baseUrl(req)));
  });
}
