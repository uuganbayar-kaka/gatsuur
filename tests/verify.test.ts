// verify.mn интеграцийн тест — fetch-г mock хийж бодит API руу хандахгүй.
// Ажиллуулах: npm test
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { readLogs } from "../lib/log";
import { createVerifySession, getVerifySession, randomCode, verifyPhone, VerifyError } from "../lib/verify";

const KEY = "vrf_test_secret_key_123";
const realFetch = globalThis.fetch;
type Call = { url: string; init?: RequestInit };
let calls: Call[];

/** Дарааллаар хариу буцаах fetch mock. */
function mockFetch(handler: (url: string, init: RequestInit | undefined, n: number) => { status: number; body: unknown }) {
  let n = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const r = handler(url, init, n++);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const session = (over: Record<string, unknown> = {}) => ({
  sessionId: "sess_1",
  phone: "99112233",
  shortcode: "144773",
  text: "482916",
  smsUri: "sms:144773?body=482916",
  displayInstruction: "99112233 дугаараасаа 144773 руу 482916 гэж илгээнэ үү",
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
  ...over,
});

beforeEach(() => {
  calls = [];
  process.env.VERIFY_MN_API_KEY = KEY;
  delete process.env.VERCEL;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("verify.mn", () => {
  it("PENDING → VERIFIED үед true буцаана", async () => {
    let statusCalls = 0;
    mockFetch((url, init) => {
      if (init?.method === "POST") return { status: 200, body: session() };
      statusCalls++;
      return { status: 200, body: { sessionId: "sess_1", sessionStatus: statusCalls < 3 ? "PENDING" : "VERIFIED", expiresAt: session().expiresAt } };
    });
    let shown = "";
    const ok = await verifyPhone("99112233", { pollMs: 5, onSession: (s) => (shown = s.displayInstruction) });

    assert.equal(ok, true);
    assert.equal(statusCalls, 3);
    assert.equal(shown, session().displayInstruction, "displayInstruction-ийг өөрчлөхгүй дамжуулна");
    const post = calls[0];
    assert.equal(post.url, "https://api.verify.mn/sessions");
    assert.equal((post.init!.headers as Record<string, string>).Authorization, `Bearer ${KEY}`);
    const body = JSON.parse(String(post.init!.body));
    assert.equal(body.phone, "99112233");
    assert.match(body.text, /^\d{6}$/, "6 оронтой тоон код");
    assert.equal(body.callback, undefined, "callback өгөөгүй бол илгээхгүй");
    assert.ok(calls.slice(1).every((c) => c.url === "https://api.verify.mn/sessions/sess_1" && !c.init?.method));
    // GET /sessions/{id} auth шаарддаггүй — key илгээхгүй
    assert.ok(calls.slice(1).every((c) => !(c.init?.headers as Record<string, string> | undefined)?.Authorization));
  });

  it("EXPIRED төлөв ирвэл false буцаана", async () => {
    mockFetch((_u, init) =>
      init?.method === "POST"
        ? { status: 200, body: session() }
        : { status: 200, body: { sessionId: "sess_1", sessionStatus: "EXPIRED", expiresAt: session().expiresAt } },
    );
    assert.equal(await verifyPhone("99112233", { pollMs: 5 }), false);
  });

  it("expiresAt өнгөрөөд VERIFIED болоогүй бол false (timeout)", async () => {
    mockFetch((_u, init) =>
      init?.method === "POST"
        ? { status: 200, body: session({ expiresAt: new Date(Date.now() + 40).toISOString() }) }
        : { status: 200, body: { sessionId: "sess_1", sessionStatus: "PENDING", expiresAt: "" } },
    );
    const t = Date.now();
    assert.equal(await verifyPhone("99112233", { pollMs: 10 }), false);
    assert.ok(Date.now() - t < 1000, "хугацаа дуусмагц зогсоно");
  });

  it("hard timeout хэтэрвэл false", async () => {
    mockFetch((_u, init) =>
      init?.method === "POST"
        ? { status: 200, body: session() }
        : { status: 200, body: { sessionId: "sess_1", sessionStatus: "PENDING", expiresAt: session().expiresAt } },
    );
    assert.equal(await verifyPhone("99112233", { pollMs: 5, timeoutMs: 50 }), false);
  });

  it("API key буруу бол 401 VerifyError шиднэ, key-г логлохгүй", async () => {
    mockFetch(() => ({ status: 401, body: { message: "Invalid API key" } }));
    await assert.rejects(verifyPhone("99112233"), (e: unknown) => e instanceof VerifyError && e.status === 401);
    const logs = JSON.stringify(await readLogs(50));
    assert.ok(logs.includes("verify.create_failed"));
    assert.ok(!logs.includes(KEY), "API key логт орох ёсгүй");
  });

  it("VERIFY_MN_API_KEY байхгүй бол шууд алдаа", async () => {
    delete process.env.VERIFY_MN_API_KEY;
    mockFetch(() => ({ status: 200, body: session() }));
    await assert.rejects(createVerifySession("99112233"), /VERIFY_MN_API_KEY/);
    assert.equal(calls.length, 0);
  });

  it("зөвхөн https callback илгээнэ", async () => {
    mockFetch(() => ({ status: 200, body: session() }));
    await createVerifySession("99112233", { callback: "http://localhost:3000/cb" });
    await createVerifySession("99112233", { callback: "https://gatsuur.mn/api/reset/callback?rid=x" });
    assert.equal(JSON.parse(String(calls[0].init!.body)).callback, undefined);
    assert.equal(JSON.parse(String(calls[1].init!.body)).callback, "https://gatsuur.mn/api/reset/callback?rid=x");
  });

  it("404 session олдохгүй бол VerifyError", async () => {
    mockFetch(() => ({ status: 404, body: { message: "not found" } }));
    await assert.rejects(getVerifySession("nope"), (e: unknown) => e instanceof VerifyError && e.status === 404);
  });

  it("код бүр 6 оронтой, давтагдахгүй", () => {
    const codes = new Set(Array.from({ length: 200 }, randomCode));
    assert.ok([...codes].every((c) => /^\d{6}$/.test(c)));
    assert.ok(codes.size > 190);
  });
});
