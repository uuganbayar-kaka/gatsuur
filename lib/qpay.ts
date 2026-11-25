// QPay Merchant v2 (merchant-postman.json дагуу)
//   POST /v2/auth/token      — Basic client_id:client_secret → access_token, expires_in
//   POST /v2/invoice         — Bearer; { invoice_code, sender_invoice_no, invoice_receiver_code, invoice_description, amount, callback_url }
//   POST /v2/payment/check   — Bearer; { object_type: "INVOICE", object_id: <invoice_id>, offset }
import { getDB } from "./db";
import { log } from "./log";

const BASE = () => (process.env.QPAY_BASE_URL || "https://merchant.qpay.mn").replace(/\/$/, "").replace(/\/v2$/, "");
const TOKEN_KEY = "qpay:token";
const REC_TTL = 60 * 60 * 24 * 90;

export const qk = {
  invoice: (id: string) => `qpay:invoice:${id}`, // QPay нэхэмжлэхийн бичлэг
  phone: (p: string) => `qpay:phone:${p}`, // hash: invoice_id → бичлэг (утсаар хайх)
};

export const qpayConfigured = () => !!process.env.QPAY_CLIENT_ID && !!process.env.QPAY_CLIENT_SECRET && !!process.env.QPAY_INVOICE_CODE;

export const paymentMode = (): "qpay" | "mock" => {
  if (process.env.PAYMENT_MODE === "mock") return "mock";
  return qpayConfigured() ? "qpay" : "mock";
};

/**
 * expires_in-ээс кэшийн TTL (сек). QPay заримдаа үргэлжлэх хугацаа биш unix timestamp буцаадаг тул хоёуланг нь дэмжинэ.
 * Дуусахаас 60 сек өмнө шинэчлэгдэхээр хасна.
 */
export function tokenTtl(expiresIn: unknown, now = Date.now()) {
  const n = Number(expiresIn);
  if (!Number.isFinite(n) || n <= 0) return 300;
  const sec = n > 1e9 ? n - Math.floor(now / 1000) : n;
  return Math.max(1, Math.floor(sec) - 60);
}

async function call(path: string, init: RequestInit & { bearer?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  const started = Date.now();
  const res = await fetch(`${BASE()}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* JSON биш хариу */
  }
  if (!res.ok) {
    await log("error", "qpay.http_error", `${init.method ?? "GET"} ${path} → ${res.status}`, {
      status: res.status,
      ms: Date.now() - started,
      body: json ?? text.slice(0, 500),
    });
  }
  return { ok: res.ok, status: res.status, json: json as Record<string, unknown> | null };
}

/** access_token-г Redis-д expires_in-ийг TTL болгон кэшлэнэ (serverless инстанс бүрт шинэ токен авахгүй). */
async function token(force = false): Promise<string> {
  const db = getDB();
  if (!force) {
    const cached = await db.get<string>(TOKEN_KEY);
    if (cached) return cached;
  }
  const basic = Buffer.from(`${process.env.QPAY_CLIENT_ID}:${process.env.QPAY_CLIENT_SECRET}`).toString("base64");
  const r = await call("/v2/auth/token", { method: "POST", headers: { Authorization: `Basic ${basic}` } });
  const access = r.json?.access_token;
  if (!r.ok || typeof access !== "string") throw new Error(`QPay token авахад алдаа (${r.status})`);
  const ttl = tokenTtl(r.json?.expires_in);
  await db.set(TOKEN_KEY, access, { ex: ttl });
  await log("info", "qpay.token_new", undefined, { ttl });
  return access;
}

/** 401 ирвэл токеноо шинээр авч нэг удаа дахин оролдоно. */
async function authed(path: string, init: RequestInit) {
  let r = await call(path, { ...init, bearer: await token() });
  if (r.status === 401) r = await call(path, { ...init, bearer: await token(true) });
  return r;
}

export type QPayInvoice = {
  invoice_id: string;
  qr_text?: string;
  qr_image?: string;
  shortUrl?: string;
  urls: { name: string; description: string; logo: string; link: string }[];
};

/** Redis-д хадгалах QPay нэхэмжлэхийн бичлэг. */
export type QPayRecord = {
  invoice_id: string;
  qr_text?: string;
  status: "PENDING" | "PAID";
  created_date: string;
  phone: string;
  amount: number;
  sender_invoice_no: string;
  paid_date?: string;
  /** "free" — энгийн гацуурын бэлэг/томруулалт, "money" — мөнгөтэй гацуурын мөнгө/үүсгэх төлбөр */
  tree_kind?: "free" | "money";
  /** gift — бэлэг/мөнгөн чимэглэл, expand — томруулалт, create — мөнгөтэй гацуур үүсгэх */
  purpose?: "gift" | "expand" | "create";
  tree_id?: string;
};

export const getQPayRecord = (invoiceId: string) => getDB().get<QPayRecord>(qk.invoice(invoiceId));
export const getQPayRecordsByPhone = (phone: string) => getDB().hgetall<QPayRecord>(qk.phone(phone));

/**
 * QPay нэхэмжлэхийг invoice_id + утсаар олно (утас таарахгүй бол null).
 * tree_kind-оор энгийн гацуурын бэлэг, мөнгөтэй гацуурын мөнгийг ялгана.
 */
export async function findQPayInvoice(invoiceId: string, phone: string) {
  const rec = (await getDB().hget<QPayRecord>(qk.phone(phone), invoiceId)) ?? (await getQPayRecord(invoiceId));
  return rec && rec.phone === phone ? rec : null;
}

async function saveRecord(rec: QPayRecord) {
  const db = getDB();
  await db.set(qk.invoice(rec.invoice_id), rec, { ex: REC_TTL });
  await db.hset(qk.phone(rec.phone), rec.invoice_id, rec);
}

export async function createQPayInvoice(opts: {
  amount: number;
  description: string;
  callbackUrl: string;
  senderInvoiceNo: string;
  phone: string;
  treeKind?: "free" | "money";
  purpose?: "gift" | "expand" | "create";
  treeId?: string;
}): Promise<QPayInvoice> {
  const body = {
    invoice_code: process.env.QPAY_INVOICE_CODE,
    sender_invoice_no: opts.senderInvoiceNo,
    invoice_receiver_code: opts.phone,
    invoice_description: opts.description,
    amount: opts.amount,
    callback_url: opts.callbackUrl,
  };
  const r = await authed("/v2/invoice", { method: "POST", body: JSON.stringify(body) });
  const j = r.json ?? {};
  if (!r.ok || !j.invoice_id) throw new Error(`QPay нэхэмжлэх үүсгэж чадсангүй (${r.status})`);

  const inv: QPayInvoice = {
    invoice_id: String(j.invoice_id),
    qr_text: j.qr_text as string | undefined,
    qr_image: j.qr_image as string | undefined,
    shortUrl: j.qPay_shortUrl as string | undefined,
    urls: (Array.isArray(j.urls) ? j.urls : []) as QPayInvoice["urls"],
  };
  await saveRecord({
    invoice_id: inv.invoice_id,
    qr_text: inv.qr_text,
    status: "PENDING",
    created_date: new Date().toISOString(),
    phone: opts.phone,
    amount: opts.amount,
    sender_invoice_no: opts.senderInvoiceNo,
    tree_kind: opts.treeKind,
    purpose: opts.purpose,
    tree_id: opts.treeId,
  });
  return inv;
}

const PAID = (s: unknown) => typeof s === "string" && s.toUpperCase() === "PAID";

/** invoice_id-г object_id болгон төлбөр шалгана. Төлөгдсөн бол хадгалсан бичлэгийн status-г PAID болгоно. */
export async function isQPayPaid(invoiceId: string, amount: number): Promise<boolean> {
  const r = await authed("/v2/payment/check", {
    method: "POST",
    body: JSON.stringify({ object_type: "INVOICE", object_id: invoiceId, offset: { page_number: 1, page_limit: 100 } }),
  });
  if (!r.ok || !r.json) return false;
  const j = r.json;
  const rows = (Array.isArray(j.rows) ? j.rows : []) as Record<string, unknown>[];
  const paidRows = rows.filter((x) => PAID(x.payment_status));
  if (!paidRows.length) return false;
  const paidAmount = Number(j.paid_amount ?? paidRows.reduce((s, x) => s + Number(x.payment_amount ?? 0), 0));
  if (paidAmount < amount) {
    await log("warn", "qpay.underpaid", undefined, { invoiceId, amount, paidAmount });
    return false;
  }
  await log("info", "qpay.paid", undefined, { invoiceId, amount, paidAmount, paymentIds: paidRows.map((x) => x.payment_id) });

  const rec = await getQPayRecord(invoiceId);
  if (rec && rec.status !== "PAID") await saveRecord({ ...rec, status: "PAID", paid_date: new Date().toISOString() });
  return true;
}
