// Төлбөр төлөгдөхөд гацуурын дүн утсаар олдож нэмэгдэхийг шалгана (mock төлбөр, санах ойн DB).
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getDB } from "../lib/db";
import { createInvoice, createTree, finalizeInvoice, getInvoice, getTreeAmounts } from "../lib/trees";

before(() => {
  delete process.env.VERCEL;
  process.env.PAYMENT_MODE = "mock";
});

describe("гацуурын дүн", () => {
  it("paid болоход invoice-ийн утсаар гацуурыг олж дүнг нэмнэ, давхар дуудлагад нэг л удаа", async () => {
    const tree = await createTree({ name: "Дүн тест", phone: "88112233", password: "1234", template: "lush" });
    assert.equal((await getTreeAmounts(tree.id)).amount, 0);

    const inv = await createInvoice({ kind: "gift", treeId: tree.id, ornament: "star", from: "Бат", message: "" }, "http://x");
    assert.equal(inv.phone, "88112233");
    assert.equal((await getTreeAmounts(tree.id)).amount, 0, "төлөгдөөгүй бол нэмэгдэхгүй");

    await finalizeInvoice(inv);
    assert.equal((await getTreeAmounts(tree.id)).amount, 5000);
    // callback + polling давхар ирсэн (хуучин pending хуулбараар)
    await finalizeInvoice({ ...inv, status: "pending" });
    assert.equal((await getTreeAmounts(tree.id)).amount, 5000);

    const inv2 = await createInvoice({ kind: "gift", treeId: tree.id, ornament: "ball", from: "Сараа", message: "" }, "http://x");
    await finalizeInvoice((await getInvoice(inv2.id))!);
    assert.equal((await getTreeAmounts(tree.id)).amount, 6000);
  });

  it("томруулалтын төлбөр update_amount-д тусдаа нэмэгдэж, бэлгийн дүнд орохгүй", async () => {
    const tree = await createTree({ name: "Томруулах", phone: "88112244", password: "1234", template: "lush" });
    const inv = await createInvoice({ kind: "expand", treeId: tree.id, plan: "m" }, "http://x");
    await finalizeInvoice(inv);
    await finalizeInvoice({ ...inv, status: "pending" }); // давхар дуудлага
    const gift = await createInvoice({ kind: "gift", treeId: tree.id, ornament: "ball", from: "A", message: "" }, "http://x");
    await finalizeInvoice(gift);
    assert.deepEqual(await getTreeAmounts(tree.id), { amount: 1000, update_amount: 10000 });
  });

  it("тоолуургүй хуучин гацуурт томруулалтын дүнг багцын үнээр эхлүүлнэ", async () => {
    const tree = await createTree({ name: "Хуучин томруулалт", phone: "88112266", password: "1234", template: "lush" });
    await finalizeInvoice(await createInvoice({ kind: "expand", treeId: tree.id, plan: "m" }, "http://x"));
    await getDB().del(`tree:${tree.id}:update_amount`);
    assert.equal((await getTreeAmounts(tree.id)).update_amount, 10000);
    await finalizeInvoice(await createInvoice({ kind: "expand", treeId: tree.id, plan: "s" }, "http://x"));
    assert.equal((await getTreeAmounts(tree.id)).update_amount, 15000);
  });

  it("тоолуургүй хуучин гацуурт одоо байгаа бэлгүүдээс эхлүүлнэ", async () => {
    const tree = await createTree({ name: "Хуучин", phone: "88112255", password: "1234", template: "lush" });
    const inv = await createInvoice({ kind: "gift", treeId: tree.id, ornament: "bell", from: "A", message: "" }, "http://x");
    await finalizeInvoice(inv);
    await getDB().del(`tree:${tree.id}:amount`); // өмнөх хувилбарын өгөгдлийг дуурайна
    assert.equal((await getTreeAmounts(tree.id)).amount, 2000);
    const inv2 = await createInvoice({ kind: "gift", treeId: tree.id, ornament: "ball", from: "B", message: "" }, "http://x");
    await finalizeInvoice(inv2);
    assert.equal((await getTreeAmounts(tree.id)).amount, 3000);
  });

  it("хуучин багцаар хадгалагдсан томруулалтыг (5/10/20 зай) зөв үнээр тооцно", async () => {
    const tree = await createTree({ name: "Legacy", phone: "88112277", password: "1234", template: "lush" });
    await getDB().hset(`tree:${tree.id}:expands`, "old1", 20);
    await getDB().hset(`tree:${tree.id}:expands`, "old2", 5);
    assert.equal((await getTreeAmounts(tree.id)).update_amount, 25000);
  });
});
