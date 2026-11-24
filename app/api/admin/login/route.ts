import { NextResponse } from "next/server";
import { checkAdminCredentials, setAdminSession } from "@/lib/admin";
import { clientIp, handle } from "@/lib/http";
import { log } from "@/lib/log";
import { AppError, clean, rateLimit } from "@/lib/trees";

export async function POST(req: Request) {
  return handle(req, async () => {
    await rateLimit(`admin-login:${clientIp(req)}`, 10, 900);
    const body = await req.json().catch(() => ({}));
    const username = clean(body.username, 60);
    const user = checkAdminCredentials(username, typeof body.password === "string" ? body.password : "");
    if (!user) {
      await log("warn", "admin.login_failed", undefined, { username, ip: clientIp(req) });
      throw new AppError(401, "Нэвтрэх нэр эсвэл нууц үг буруу.");
    }
    await setAdminSession(user);
    await log("info", "admin.login", undefined, { username: user, ip: clientIp(req) });
    return NextResponse.json({ ok: true });
  });
}
