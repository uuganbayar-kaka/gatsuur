// 1 утас = 1 энгийн + 1 мөнгөтэй гацуур: нэвтрэх, дүн зөв гацуурт орох, QPay нэхэмжлэхийг invoice_id + утсаар ялгах.
import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";
import { getDB } from "../lib/db";
import { findQPayInvoice } from "../lib/qpay";
import {
  AppError, createInvoice, createMoneyTreeInvoice, createTree, finalizeInvoice, getTree, getTreeAmounts, getTreeIdByPhone, getTreeIdsByPhone, loginTrees,
} from "../lib/trees";

const realFetch = globalThis.fetch;
before(() => {
  delete process.env.VERCEL;
  process.env.PAYMENT_MODE = "mock";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.PAYMENT_MODE = "mock";
});

const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const money = (phone: string, pin = "1234") => ({ name: "Мөнгөн", phone, pin, template: "gold" as const, bank: "khan" as const, account: "5000123456" });

async function both(phone: string, freePin = "1234", moneyPin = "1234") {
  const free = await createTree({ name: "Энгийн", phone, password: freePin, template: "lush" });
  const inv = await createMoneyTreeInvoice(money(phone, moneyPin), "http://x");
  await finalizeInvoice(inv);
  return { free, moneyId: inv.treeId };
}

describe("1 утас = 1 энгийн + 1 мөнгөтэй гацуур", () => {
  it("энгийн гацууртай хүн мөнгөтэй гацуур үүсгэнэ, хоёр дахь мөнгөтэй/энгийн гацуур болохгүй", async () => {
    const { free, moneyId } = await both("88440011");
    assert.deepEqual(await getTreeIdsByPhone("88440011"), [free.id, moneyId]);
    await assert.rejects(createTree({ name: "2", phone: "88440011", password: "1", template: "lush" }), status(409));
    await assert.rejects(createMoneyTreeInvoice(money("88440011"), "http://x"), status(409));
  });

  it("ижил PIN бол хоёуланд нь нэвтэрнэ, өөр PIN бол зөвхөн таарсанд нь", async () => {
    const a = await both("88440022");
    assert.deepEqual((await loginTrees("88440022", "1234")).map((t) => t.id), [a.free.id, a.moneyId]);

    const b = await both("88440033", "1111", "2222");
    assert.deepEqual((await loginTrees("88440033", "1111")).map((t) => t.id), [b.free.id]);
    assert.deepEqual((await loginTrees("88440033", "2222")).map((t) => t.id), [b.moneyId]);
    await assert.rejects(loginTrees("88440033", "9999"), status(401));
  });

  it("бэлгийн дүн энгийн гацуурт, мөнгө мөнгөтэй гацуурт тус тусдаа орно", async () => {
    const { free, moneyId } = await both("88440044");
    await finalizeInvoice(await createInvoice({ kind: "gift", treeId: free.id, ornament: "star", from: "A", message: "" }, "http://x"));
    await finalizeInvoice(await createInvoice({ kind: "gift", treeId: moneyId, ornament: "custom", amount: 30000, from: "B", message: "" }, "http://x"));
    assert.equal((await getTreeAmounts(free.id)).amount, 5000);
    assert.equal((await getTreeAmounts(moneyId)).amount, 30000);
  });

  it("хуучин мөнгөтэй гацуур (энгийн түлхүүрт) байхад энгийн гацуур үүсгэхэд тусад нь шилжинэ", async () => {
    const inv = await createMoneyTreeInvoice(money("88440055"), "http://x");
    await finalizeInvoice(inv);
    // Өмнөх хувилбарын өгөгдлийг дуурайна: мөнгөтэй гацуур phone:<p>-д
    await getDB().del("phone:money:88440055");
    await getDB().set("phone:88440055", inv.treeId);
    assert.equal(await getTreeIdByPhone("88440055", "money"), inv.treeId);
    assert.equal(await getTreeIdByPhone("88440055", "free"), null);
    const free = await createTree({ name: "Шинэ", phone: "88440055", password: "1234", template: "lush" });
    assert.equal(await getTreeIdByPhone("88440055", "free"), free.id);
    assert.equal(await getTreeIdByPhone("88440055", "money"), inv.treeId);
    assert.equal((await getTree(inv.treeId))?.kind, "money");
  });
});

describe("QPay нэхэмжлэхийг invoice_id + утсаар олох", () => {
  it("энгийн гацуурын бэлэг, мөнгөтэй гацуурын мөнгийг tree_kind-аар ялгана", async () => {
    process.env.PAYMENT_MODE = "qpay";
    process.env.QPAY_CLIENT_ID = "c";
    process.env.QPAY_CLIENT_SECRET = "s";
    process.env.QPAY_INVOICE_CODE = "CODE";
    let n = 0;
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const path = new URL(String(url)).pathname;
      const body = path === "/v2/auth/token" ? { access_token: "t", expires_in: 3600 } : { invoice_id: `qp_${++n}`, qr_text: "q", urls: [] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;

    process.env.PAYMENT_MODE = "mock";
    const { free, moneyId } = await both("88440066");
    process.env.PAYMENT_MODE = "qpay";
    const g = await createInvoice({ kind: "gift", treeId: free.id, ornament: "ball", from: "A", message: "" }, "http://x");
    const m = await createInvoice({ kind: "gift", treeId: moneyId, ornament: "coin", from: "B", message: "" }, "http://x");

    const fg = await findQPayInvoice(g.qpay!.invoice_id, "88440066");
    const fm = await findQPayInvoice(m.qpay!.invoice_id, "88440066");
    assert.equal(fg?.tree_kind, "free");
    assert.equal(fg?.purpose, "gift");
    assert.equal(fg?.tree_id, free.id);
    assert.equal(fm?.tree_kind, "money");
    assert.equal(fm?.tree_id, moneyId);
    assert.equal(await findQPayInvoice(g.qpay!.invoice_id, "99999999"), null, "утас таарахгүй бол олдохгүй");
  });
});
