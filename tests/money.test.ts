// Мөнгөтэй гацуур: 15,000₮ төлсний дараа үүснэ, мөнгөн чимэглэл + хүссэн дүн (mock төлбөр, санах ойн DB).
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getDB } from "../lib/db";
import {
  AppError, createInvoice, createMoneyTreeInvoice, createTree, finalizeInvoice, getTree, getTreeAmounts, getTreeIdByPhone, listTreesForAdmin, login,
} from "../lib/trees";

before(() => {
  delete process.env.VERCEL;
  process.env.PAYMENT_MODE = "mock";
});

const status = (code: number) => (e: unknown) => e instanceof AppError && e.status === code;
const input = (phone: string) => ({ name: "Мөнгөн", phone, pin: "4321", template: "lush" as const, bank: "khan" as const, account: "5000123456" });

describe("мөнгөтэй гацуур", () => {
  it("төлбөр орохоос өмнө гацуур үүсэхгүй, утас 15 минут түгжигдэнэ", async () => {
    const inv = await createMoneyTreeInvoice(input("88330011"), "http://x");
    assert.equal(inv.amount, 15000);
    assert.equal(await getTree(inv.treeId), null);
    assert.equal(await getTreeIdByPhone("88330011"), null, "түгжээ нь гацуурын id биш");
    // Мөнгөтэй гацуурын түгжээ энгийн гацуур үүсгэхэд саад болохгүй (1 утас = 1 энгийн + 1 мөнгөтэй)
    await createTree({ name: "x", phone: "88330011", password: "1111", template: "lush" });
    await assert.rejects(createMoneyTreeInvoice(input("88330011"), "http://x"), status(409));
    await assert.rejects(login("88330011", "4321"), status(401), "мөнгөтэй гацуур төлөгдөөгүй");
  });

  it("төлөгдөхөд банк, данстай мөнгөтэй гацуур үүсч, PIN-ээр нэвтэрнэ (давхар дуудлагад нэг л удаа)", async () => {
    const inv = await createMoneyTreeInvoice(input("88330022"), "http://x");
    await finalizeInvoice(inv);
    await finalizeInvoice({ ...inv, status: "pending" });
    const tree = await getTree(inv.treeId);
    assert.equal(tree?.kind, "money");
    assert.equal(tree?.bank, "khan");
    assert.equal(tree?.account, "5000123456");
    assert.equal(tree?.createFee, 15000);
    assert.equal(await getTreeIdByPhone("88330022", "money"), inv.treeId);
    assert.equal(await getTreeIdByPhone("88330022"), null, "энгийн гацуур байхгүй");
    assert.equal((await login("88330022", "4321")).id, inv.treeId);
    const row = (await listTreesForAdmin()).find((r) => r.id === inv.treeId);
    assert.equal(row?.kind, "money");
    assert.equal((await getTreeAmounts(inv.treeId)).amount, 0, "үүсгэх төлбөр цугласан дүнд орохгүй");
  });

  it("зөвхөн мөнгөн чимэглэл, хүссэн дүнг шалгаж, дүнг нэмнэ", async () => {
    const inv = await createMoneyTreeInvoice(input("88330033"), "http://x");
    await finalizeInvoice(inv);
    const treeId = inv.treeId;
    const gift = (ornament: string, amount?: number) =>
      createInvoice({ kind: "gift", treeId, ornament: ornament as "coin", from: "A", message: "", amount }, "http://x");

    await assert.rejects(gift("ball"), status(400), "энгийн чимэглэл мөнгөтэй гацуурт болохгүй");
    await assert.rejects(gift("topper"), status(400));
    await assert.rejects(gift("custom"), status(400));
    await assert.rejects(gift("custom", 500), status(400));
    await assert.rejects(gift("custom", 2_000_000), status(400));

    await finalizeInvoice(await gift("moneybag"));
    await finalizeInvoice(await gift("custom", 77000));
    assert.equal((await getTreeAmounts(treeId)).amount, 97000);
  });

  it("энгийн гацуурт мөнгөн чимэглэл өлгөхгүй", async () => {
    const tree = await createTree({ name: "Энгийн", phone: "88330044", password: "1234", template: "lush" });
    await assert.rejects(createInvoice({ kind: "gift", treeId: tree.id, ornament: "coin", from: "A", message: "" }, "http://x"), status(400));
  });

  it("түгжээ дууссаны дараа өөр хүн мөнгөтэй гацуурыг авсан бол гацуур үүсч, алдаа логлогдоно", async () => {
    const inv = await createMoneyTreeInvoice(input("88330055"), "http://x");
    await getDB().del("phone:money:88330055"); // 15 минут өнгөрсөн
    const other = await createMoneyTreeInvoice({ ...input("88330055"), name: "Өөр" }, "http://x");
    await finalizeInvoice(other);
    await finalizeInvoice(inv);
    assert.equal(await getTreeIdByPhone("88330055", "money"), other.treeId, "эхний эзний дугаарыг булаахгүй");
    assert.equal((await getTree(inv.treeId))?.kind, "money");
  });
});

describe("мөнгөтэй гацуурын загвар", async () => {
  const { templateFits, MONEY_TEMPLATES } = await import("../lib/config");
  const { MELODIES } = await import("../lib/melodies");
  it("мөнгөтэй гацуурт зөвхөн 4 мөнгөтэй загвар, энгийнд зөвхөн үнэгүй загвар", () => {
    assert.equal(MONEY_TEMPLATES.length, 4);
    for (const t of MONEY_TEMPLATES) {
      assert.ok(templateFits("money", t.id));
      assert.ok(!templateFits("free", t.id));
      assert.ok(MELODIES[t.melody].notes.length > 10, `${t.id} аялгуутай`);
    }
    assert.ok(!templateFits("money", "lush"));
    assert.ok(templateFits(undefined, "lush"));
  });
});
