import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { getInvoice, syncInvoice } from "@/lib/trees";

// QPay төлбөр орсны дараа энэ хаяг руу хандана. Callback-д итгэлгүйгээр QPay-с дахин шалгаж баталгаажуулна.
async function callback(req: Request) {
  const id = new URL(req.url).searchParams.get("inv");
  try {
    const inv = id ? await getInvoice(id) : null;
    await log(inv ? "info" : "warn", "qpay.callback", inv ? undefined : "invoice олдсонгүй", { inv: id, method: req.method });
    if (inv) await syncInvoice(inv);
  } catch (e) {
    await log("error", "qpay.callback_failed", e, { inv: id });
  }
  return NextResponse.json({ ok: true });
}

export const GET = callback;
export const POST = callback;
