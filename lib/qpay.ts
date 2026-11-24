// QPay QuickQR v2 (quick-qr-postman.json дагуу)
//   POST /v2/auth/token    { terminal_id }          — Basic auth (username:password)
//   POST /v2/auth/refresh                            — Bearer refresh_token
//   POST /v2/invoice       { merchant_id, amount, currency, description, mcc_code, callback_url, bank_accounts }
//   GET  /v2/invoice/:id
//   POST /v2/payment/check { invoice_id }
import { getDB } from "./db";
import { log } from "./log";

const BASE = () => (process.env.QPAY_BASE_URL || "https://quickqr.qpay.mn").replace(/\/$/, "").replace(/\/v2$/, "");
const TOKEN_KEY = "qpay:token";

export const qpayConfigured = () =>
  !!process.env.QPAY_USERNAME && !!process.env.QPAY_PASSWORD && !!process.env.QPAY_TERMINAL_ID && !!process.env.QPAY_MERCHANT_ID;

export const paymentMode = (): "qpay" | "mock" => {
  if (process.env.PAYMENT_MODE === "mock") return "mock";
  return qpayConfigured() ? "qpay" : "mock";
};

type Tok = { access: string; refresh?: string; exp: number; rexp?: number };

/** expires_in нь секунд эсвэл unix timestamp байж болно. */
const toMs = (v: unknown, fallbackSec: number) => {
  const n = Number(v);
  if (!n) return Date.now() + fallbackSec * 1000;
  return n > 1e9 ? n * 1000 : Date.now() + n * 1000;
};

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

async function saveToken(j: Record<string, unknown>): Promise<Tok> {
  const tok: Tok = {
    access: String(j.access_token),
    refresh: j.refresh_token ? String(j.refresh_token) : undefined,
    exp: toMs(j.expires_in, 3600),
    rexp: j.refresh_expires_in ? toMs(j.refresh_expires_in, 86400) : undefined,
  };
  // Serverless инстанс бүрт шинэ токен авахгүйн тулд Redis-д хадгална
  const ttl = Math.max(60, Math.floor(((tok.rexp ?? tok.exp) - Date.now()) / 1000));
  await getDB().set(TOKEN_KEY, tok, { ex: ttl });
  return tok;
}

async function newToken(): Promise<Tok> {
  const basic = Buffer.from(`${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`).toString("base64");
  const r = await call("/v2/auth/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    body: JSON.stringify({ terminal_id: process.env.QPAY_TERMINAL_ID }),
  });
  if (!r.ok || !r.json?.access_token) throw new Error(`QPay token авахад алдаа (${r.status})`);
  await log("info", "qpay.token_new");
  return saveToken(r.json);
}

async function token(force = false): Promise<string> {
  const db = getDB();
  const cached = force ? null : await db.get<Tok>(TOKEN_KEY);
  if (cached && cached.exp > Date.now() + 60_000) return cached.access;
  if (cached?.refresh && (!cached.rexp || cached.rexp > Date.now() + 60_000)) {
    const r = await call("/v2/auth/refresh", { method: "POST", bearer: cached.refresh });
    if (r.ok && r.json?.access_token) return (await saveToken(r.json)).access;
  }
  return (await newToken()).access;
}

/** 401 ирвэл токеноо шинэчилж нэг удаа дахин оролдоно. */
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

export async function createQPayInvoice(opts: { amount: number; description: string; callbackUrl: string }): Promise<QPayInvoice> {
  const body: Record<string, unknown> = {
    merchant_id: process.env.QPAY_MERCHANT_ID,
    amount: opts.amount,
    currency: "MNT",
    description: opts.description,
    mcc_code: process.env.QPAY_MCC_CODE || "5812",
    callback_url: opts.callbackUrl,
  };
  if (process.env.QPAY_ACCOUNT_NUMBER) {
    body.bank_accounts = [
      {
        account_bank_code: process.env.QPAY_BANK_CODE,
        account_number: process.env.QPAY_ACCOUNT_NUMBER,
        account_name: process.env.QPAY_ACCOUNT_NAME,
        is_default: true,
      },
    ];
  }
  const r = await authed("/v2/invoice", { method: "POST", body: JSON.stringify(body) });
  const j = r.json ?? {};
  const id = j.id ?? j.invoice_id;
  if (!r.ok || !id) throw new Error(`QPay нэхэмжлэх үүсгэж чадсангүй (${r.status})`);
  return {
    invoice_id: String(id),
    qr_text: (j.qr_code ?? j.qr_text) as string | undefined,
    qr_image: j.qr_image as string | undefined,
    shortUrl: (j.qPay_shortUrl ?? j.short_url) as string | undefined,
    urls: (Array.isArray(j.urls) ? j.urls : Array.isArray(j.deeplinks) ? j.deeplinks : []) as QPayInvoice["urls"],
  };
}

const PAID = (s: unknown) => typeof s === "string" && s.toUpperCase() === "PAID";

/** Төлбөр төлөгдсөн эсэх. Хариуны хэлбэр өөр байж болох тул бүх боломжит талбарыг шалгана. */
export async function isQPayPaid(invoiceId: string, amount: number): Promise<boolean> {
  const r = await authed("/v2/payment/check", { method: "POST", body: JSON.stringify({ invoice_id: invoiceId }) });
  if (!r.ok || !r.json) return false;
  const j = r.json;
  const rows = (Array.isArray(j.rows) ? j.rows : Array.isArray(j.payments) ? j.payments : []) as Record<string, unknown>[];
  const statusPaid = PAID(j.invoice_status) || PAID(j.payment_status) || PAID(j.status) || rows.some((x) => PAID(x.payment_status) || PAID(x.status));
  const paidAmount = Number(j.paid_amount ?? rows.reduce((s, x) => s + (PAID(x.payment_status) ? Number(x.payment_amount ?? x.amount ?? 0) : 0), 0));
  if (statusPaid && paidAmount && paidAmount < amount) {
    await log("warn", "qpay.underpaid", undefined, { invoiceId, amount, paidAmount });
    return false;
  }
  if (statusPaid) await log("info", "qpay.paid", undefined, { invoiceId, amount, response: j });
  return statusPaid;
}
