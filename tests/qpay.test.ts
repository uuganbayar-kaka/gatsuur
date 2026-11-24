// QPay Merchant v2 интеграцийн тест — fetch-г mock хийж бодит API руу хандахгүй.
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { getDB } from "../lib/db";
import { createQPayInvoice, getQPayRecord, getQPayRecordsByPhone, isQPayPaid, tokenTtl } from "../lib/qpay";

const realFetch = globalThis.fetch;
type Call = { url: string; init?: RequestInit; body: Record<string, unknown> | null };
let calls: Call[];
let tokens: number;

function mockFetch(handler: (path: string, c: Call) => { status: number; body: unknown }) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const c: Call = { url, init, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(c);
    const r = handler(new URL(url).pathname, c);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const auth = (c: Call) => (c.init?.headers as Record<string, string>).Authorization;

/** Энгийн QPay сервер: token → access_N, invoice, payment/check. */
function qpay(opts: { paid?: boolean; paidAmount?: number; expiresIn?: number } = {}) {
  mockFetch((path, c) => {
    if (path === "/v2/auth/token") {
      tokens++;
      return { status: 200, body: { access_token: `access_${tokens}`, expires_in: opts.expiresIn ?? 3600, refresh_token: "r" } };
    }
    if (path === "/v2/invoice")
      return { status: 200, body: { invoice_id: "qp_inv_1", qr_text: "0002010102...", qr_image: "iVBOR", qPay_shortUrl: "https://s.qpay.mn/x", urls: [] } };
    if (path === "/v2/payment/check") {
      const rows = opts.paid
        ? [{ payment_id: "pay_1", payment_status: "PAID", payment_amount: opts.paidAmount ?? 10000 }]
        : [];
      return { status: 200, body: { count: rows.length, paid_amount: rows.length ? (opts.paidAmount ?? 10000) : 0, rows } };
    }
    return { status: 404, body: {} };
  });
}

beforeEach(async () => {
  calls = [];
  tokens = 0;
  delete process.env.VERCEL;
  process.env.QPAY_BASE_URL = "https://merchant-sandbox.qpay.mn";
  process.env.QPAY_CLIENT_ID = "cid";
  process.env.QPAY_CLIENT_SECRET = "csecret";
  process.env.QPAY_INVOICE_CODE = "TEST_INVOICE";
  await getDB().del("qpay:token");
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

const create = () =>
  createQPayInvoice({ amount: 10000, description: "Гацуурт бэлэг", callbackUrl: "https://x.mn/api/qpay/callback?inv=a1", senderInvoiceNo: "a1", phone: "99112233" });

describe("tokenTtl", () => {
  it("expires_in секунд бол түүнийг TTL болгоно (60 сек нөөцтэй)", () => assert.equal(tokenTtl(3600), 3540));
  it("expires_in unix timestamp бол үлдсэн хугацааг TTL болгоно", () => {
    const now = 1_700_000_000_000;
    assert.equal(tokenTtl(1_700_000_000 + 86400, now), 86340);
  });
});

describe("QPay merchant", () => {
  it("token-г Basic client_id:client_secret-ээр авч, expires_in TTL-тэй кэшлэнэ", async () => {
    qpay({ expiresIn: 120 });
    await create();
    await create();
    const tokenCalls = calls.filter((c) => c.url.endsWith("/v2/auth/token"));
    assert.equal(tokenCalls.length, 1, "токен кэшээс ашиглагдах ёстой");
    assert.equal(auth(tokenCalls[0]), `Basic ${Buffer.from("cid:csecret").toString("base64")}`);
    assert.equal(await getDB().get("qpay:token"), "access_1");
  });

  it("invoice-г access_token-оор үүсгэж, invoice_id/qr_text/status/created_date/phone-тойгоор хадгална", async () => {
    qpay();
    const inv = await create();
    const call = calls.find((c) => c.url.endsWith("/v2/invoice"))!;
    assert.equal(auth(call), "Bearer access_1");
    assert.deepEqual(call.body, {
      invoice_code: "TEST_INVOICE",
      sender_invoice_no: "a1",
      invoice_receiver_code: "99112233",
      invoice_description: "Гацуурт бэлэг",
      amount: 10000,
      callback_url: "https://x.mn/api/qpay/callback?inv=a1",
    });
    assert.equal(inv.invoice_id, "qp_inv_1");
    assert.equal(inv.qr_text, "0002010102...");

    const rec = await getQPayRecord("qp_inv_1");
    assert.equal(rec?.invoice_id, "qp_inv_1");
    assert.equal(rec?.qr_text, "0002010102...");
    assert.equal(rec?.status, "PENDING");
    assert.equal(rec?.phone, "99112233");
    assert.ok(rec?.created_date && !Number.isNaN(Date.parse(rec.created_date)));
    assert.ok((await getQPayRecordsByPhone("99112233"))["qp_inv_1"]);
  });

  it("payment/check-д invoice_id-г object_id болгон илгээж, PAID бол status шинэчилнэ", async () => {
    qpay({ paid: true });
    await create();
    assert.equal(await isQPayPaid("qp_inv_1", 10000), true);
    const call = calls.find((c) => c.url.endsWith("/v2/payment/check"))!;
    assert.equal(call.body?.object_type, "INVOICE");
    assert.equal(call.body?.object_id, "qp_inv_1");
    assert.equal(auth(call), "Bearer access_1");
    assert.equal((await getQPayRecord("qp_inv_1"))?.status, "PAID");
    assert.equal((await getQPayRecordsByPhone("99112233"))["qp_inv_1"].status, "PAID");
  });

  it("төлөгдөөгүй эсвэл дутуу төлсөн бол false", async () => {
    qpay();
    await create();
    assert.equal(await isQPayPaid("qp_inv_1", 10000), false);
    qpay({ paid: true, paidAmount: 5000 });
    assert.equal(await isQPayPaid("qp_inv_1", 10000), false);
    assert.equal((await getQPayRecord("qp_inv_1"))?.status, "PENDING");
  });

  it("401 ирвэл шинэ токен авч нэг удаа дахин оролдоно", async () => {
    await getDB().set("qpay:token", "stale");
    mockFetch((path, c) => {
      if (path === "/v2/auth/token") return { status: 200, body: { access_token: "fresh", expires_in: 3600 } };
      if (auth(c) === "Bearer stale") return { status: 401, body: {} };
      return { status: 200, body: { invoice_id: "qp_inv_2", qr_text: "q", urls: [] } };
    });
    const inv = await create();
    assert.equal(inv.invoice_id, "qp_inv_2");
    assert.equal(await getDB().get("qpay:token"), "fresh");
  });
});
