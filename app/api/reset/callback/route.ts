import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { syncReset } from "@/lib/reset";

// verify.mn → GET (body, гарын үсэггүй). Зөвхөн "одоо шалга" дохио: syncReset нь verify.mn-ээс дахин шалгана.
// verify.mn 3 сек хүлээдэг тул хурдан 200 буцаана.
export async function GET(req: Request) {
  const rid = new URL(req.url).searchParams.get("rid");
  if (rid) {
    try {
      await Promise.race([syncReset(rid), new Promise((r) => setTimeout(r, 2000))]);
    } catch (e) {
      await log("error", "reset.callback_failed", e, { rid });
    }
  }
  return NextResponse.json({ ok: true });
}
