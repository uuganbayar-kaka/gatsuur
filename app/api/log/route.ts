import { NextResponse } from "next/server";
import { clientIp } from "@/lib/http";
import { log } from "@/lib/log";
import { clean, rateLimit } from "@/lib/trees";

// Хөтөч талын алдааг (window.onerror, error boundary) хүлээн авч бүртгэнэ.
export async function POST(req: Request) {
  try {
    await rateLimit(`clog:${clientIp(req)}`, 20, 600);
    const b = await req.json().catch(() => ({}));
    await log("error", "client." + clean(b.kind, 30).replace(/[^a-z_]/gi, ""), clean(b.message, 500), {
      stack: clean(b.stack, 2000),
      url: clean(b.url, 300),
      digest: clean(b.digest, 100),
      ua: clean(req.headers.get("user-agent"), 200),
    });
  } catch {
    /* rate limit эсвэл бичих алдаа — чимээгүй */
  }
  return new NextResponse(null, { status: 204 });
}
