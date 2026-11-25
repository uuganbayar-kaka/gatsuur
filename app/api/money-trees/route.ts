import { NextResponse } from "next/server";
import { isBank, isTemplate, normalizeAccount } from "@/lib/config";
import { baseUrl, clientIp, handle } from "@/lib/http";
import { getPendingCreate, setPendingCreate } from "@/lib/session";
import { AppError, clean, createMoneyTreeInvoice, getInvoice, normalizePhone, publicInvoice, rateLimit } from "@/lib/trees";

// Мөнгөтэй гацуур: 15,000₮-ийн нэхэмжлэх үүсгэнэ → төлөгдсөний дараа гацуур үүснэ.
export async function POST(req: Request) {
  return handle(req, async () => {
    const body = await req.json().catch(() => ({}));
    const name = clean(body.name, 40);
    const phone = normalizePhone(body.phone);
    const pin = typeof body.pin === "string" ? body.pin : "";
    const template = isTemplate(body.template) ? body.template : "lush";
    const account = normalizeAccount(body.account);
    if (!name) throw new AppError(400, "Гацуурын нэрээ оруулна уу.");
    if (!phone) throw new AppError(400, "Утасны дугаар 8 оронтой байх ёстой.");
    if (!/^\d{4}$/.test(pin)) throw new AppError(400, "PIN код 4 оронтой тоо байна.");
    if (!isBank(body.bank)) throw new AppError(400, "Банкаа сонгоно уу.");
    if (!account) throw new AppError(400, "Дансны дугаар буруу байна (6–20 оронтой тоо).");
    // Цонхоо хаагаад дахин илгээсэн бол (утас 15 минут түгжээтэй) хүлээгдэж буй нэхэмжлэхээ буцааж авна
    const prevId = await getPendingCreate();
    const prev = prevId ? await getInvoice(prevId) : null;
    if (prev?.kind === "create" && prev.status === "pending" && prev.create?.phone === phone && Date.now() - prev.createdAt < 14 * 60_000)
      return NextResponse.json(publicInvoice(prev));
    await rateLimit(`create:${clientIp(req)}`, 10, 3600);
    const inv = await createMoneyTreeInvoice({ name, phone, pin, template, bank: body.bank, account }, baseUrl(req));
    await setPendingCreate(inv.id);
    return NextResponse.json(publicInvoice(inv));
  });
}
