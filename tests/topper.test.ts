// 20,000₮-ийн оройн чимэглэл: гацуурт ганцхан, багтаамжид тооцогдохгүй (mock төлбөр, санах ойн DB).
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { FREE_CAPACITY } from "../lib/config";
import { getDB } from "../lib/db";
import { AppError, createInvoice, createTree, finalizeInvoice, getTreeAmounts, getTreeView } from "../lib/trees";

before(() => {
  delete process.env.VERCEL;
  process.env.PAYMENT_MODE = "mock";
});

const gift = (treeId: string, ornament: "topper" | "ball") =>
  createInvoice({ kind: "gift", treeId, ornament, from: "A", message: "" }, "http://x");

const rejects409 = (p: Promise<unknown>) => assert.rejects(p, (e) => e instanceof AppError && e.status === 409);

describe("оройн чимэглэл", () => {
  it("төлбөр хүлээгдэж байхад хоёр дахь хүн авч чадахгүй", async () => {
    const tree = await createTree({ name: "Орой", phone: "88220011", password: "1234", template: "lush" });
    const inv = await gift(tree.id, "topper");
    assert.equal(inv.amount, 20000);
    await rejects409(gift(tree.id, "topper"));
  });

  it("төлөгдсөний дараа дахин авах боломжгүй, topperId-д бичигдэж, дүн нэмэгдэнэ", async () => {
    const tree = await createTree({ name: "Орой 2", phone: "88220022", password: "1234", template: "lush" });
    const inv = await gift(tree.id, "topper");
    await finalizeInvoice(inv);
    const v = await getTreeView(tree.id);
    assert.equal(v?.topperId, inv.id);
    assert.equal((await getTreeAmounts(tree.id)).amount, 20000);
    await getDB().del(`tree:${tree.id}:topper_lock`); // түгжээ дууссан ч
    await rejects409(gift(tree.id, "topper"));
  });

  it("багтаамжид тооцогдохгүй: дүүрсэн гацуурт ч оройн чимэглэл өлгөж болно", async () => {
    const tree = await createTree({ name: "Дүүрэн", phone: "88220033", password: "1234", template: "lush" });
    for (let i = 0; i < FREE_CAPACITY; i++) await finalizeInvoice(await gift(tree.id, "ball"));
    await rejects409(gift(tree.id, "ball"));
    await finalizeInvoice(await gift(tree.id, "topper"));
    // Орой нэмэгдсэний дараа ч энгийн чимэглэлийн тоолол өөрчлөгдөхгүй (дүүрсэн хэвээр)
    await rejects409(gift(tree.id, "ball"));
    const v = await getTreeView(tree.id);
    assert.equal(v?.gifts.length, FREE_CAPACITY + 1);
  });
});
