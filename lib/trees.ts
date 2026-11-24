import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getDB } from "./db";
import { EXPAND_PLANS, FREE_CAPACITY, ORNAMENTS, type OrnamentId, type PlanId, type TemplateId } from "./config";
import { log } from "./log";
import { createQPayInvoice, isQPayPaid, paymentMode, type QPayInvoice } from "./qpay";

export type Tree = {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  template: TemplateId;
  createdAt: number;
};

export type Gift = {
  id: string;
  ornament: OrnamentId;
  from: string;
  message: string;
  amount?: number; // төлсөн дүн (хуучин бичлэгт байхгүй бол чимэглэлийн үнээр тооцно)
  createdAt: number;
};

export type Invoice = {
  id: string;
  kind: "gift" | "expand";
  treeId: string;
  phone?: string; // гацуурын эзний утас — төлөгдөхөд энэ утсаар гацуурыг олж дүнг нэмнэ
  amount: number;
  status: "pending" | "paid";
  gift?: { ornament: OrnamentId; from: string; message: string };
  plan?: PlanId;
  qpay?: QPayInvoice;
  createdAt: number;
  paidAt?: number;
};

const k = {
  index: "trees:index", // hash: tree id → createdAt (админ жагсаалтад)
  tree: (id: string) => `tree:${id}`,
  // Hash-ууд: field = invoice id → давхар төлбөр баталгаажсан ч нэг л удаа бичигдэнэ (idempotent)
  expands: (id: string) => `tree:${id}:expands`,
  gifts: (id: string) => `tree:${id}:gifts`,
  amount: (id: string) => `tree:${id}:amount`, // төлөгдсөн бэлгийн нийт дүн (INCRBY)
  updateAmount: (id: string) => `tree:${id}:update_amount`, // төлөгдсөн томруулалтын нийт дүн (INCRBY)
  credited: (invId: string) => `inv:${invId}:credited`, // дүн нэмэгдсэн тэмдэг (SET NX — нэг л удаа)
  phone: (p: string) => `phone:${p}`,
  inv: (id: string) => `inv:${id}`,
  invIndex: "invoices:index", // list: шинэ нэхэмжлэх эхэнд (админ жагсаалтад, сүүлийн 5000)
  rl: (s: string) => `rl:${s}`,
};

const INV_TTL = 60 * 60 * 24 * 90;
const INV_INDEX_MAX = 5000;

const ALPHA = "abcdefghijkmnpqrstuvwxyz23456789";
export function randomId(len = 8) {
  const b = randomBytes(len);
  return Array.from(b, (x) => ALPHA[x % ALPHA.length]).join("");
}

export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("976")) d = d.slice(3);
  return /^[5-9]\d{7}$/.test(d) ? d : null;
}

export const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+$/g, "").trim().slice(0, max) : "";

export async function rateLimit(key: string, max: number, windowSec: number) {
  const db = getDB();
  await db.set(k.rl(key), 0, { nx: true, ex: windowSec });
  const n = await db.incrby(k.rl(key), 1);
  if (n > max) throw new AppError(429, "Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.");
}

export async function createTree(input: { name: string; phone: string; password: string; template: TemplateId }) {
  const db = getDB();
  const id = randomId();
  const ok = await db.set(k.phone(input.phone), id, { nx: true });
  if (!ok) throw new AppError(409, "Энэ утасны дугаараар гацуур үүссэн байна. Нэвтэрч орно уу.");
  const tree: Tree = {
    id,
    name: input.name,
    phone: input.phone,
    passwordHash: await bcrypt.hash(input.password, 10),
    template: input.template,
    createdAt: Date.now(),
  };
  try {
    await db.set(k.tree(id), tree);
    await db.hset(k.index, id, tree.createdAt);
  } catch (e) {
    // Гацуур бичигдээгүй бол утасны дугаарыг чөлөөлнө — эс тэгвэл дахин бүртгүүлэх боломжгүй болно
    await db.del(k.phone(input.phone)).catch(() => {});
    throw e;
  }
  await log("info", "tree.created", undefined, { id, template: input.template });
  return tree;
}

export async function login(phone: string, password: string) {
  const db = getDB();
  const id = await db.get<string>(k.phone(phone));
  const tree = id ? await getTree(id) : null;
  if (!tree || !(await bcrypt.compare(password, tree.passwordHash)))
    throw new AppError(401, "Утасны дугаар эсвэл PIN код буруу байна.");
  return tree;
}

export const getTree = (id: string) => getDB().get<Tree>(k.tree(id));

export const getTreeIdByPhone = (phone: string) => getDB().get<string>(k.phone(phone));

/** PIN-г шинэчилнэ (утас баталгаажсаны дараа л дуудна). */
export async function setPin(id: string, pin: string) {
  const tree = await getTree(id);
  if (!tree) throw new AppError(404, "Гацуур олдсонгүй.");
  tree.passwordHash = await bcrypt.hash(pin, 10);
  await getDB().set(k.tree(id), tree);
  await log("info", "tree.pin_reset", undefined, { id });
}

export async function setTemplate(id: string, template: TemplateId) {
  const tree = await getTree(id);
  if (!tree) throw new AppError(404, "Гацуур олдсонгүй.");
  tree.template = template;
  await getDB().set(k.tree(id), tree);
}

export async function getCapacity(id: string) {
  const ex = await getDB().hgetall<number>(k.expands(id));
  return FREE_CAPACITY + Object.values(ex).reduce((s, n) => s + Number(n || 0), 0);
}

export async function getGifts(id: string) {
  const all = await getDB().hgetall<Gift>(k.gifts(id));
  return Object.values(all).sort((a, b) => a.createdAt - b.createdAt);
}

export async function getTreeView(id: string) {
  const tree = await getTree(id);
  if (!tree) return null;
  const [capacity, gifts] = await Promise.all([getCapacity(id), getGifts(id)]);
  return { tree, capacity, gifts };
}

export async function createInvoice(
  input: { kind: "gift"; treeId: string; ornament: OrnamentId; from: string; message: string } | { kind: "expand"; treeId: string; plan: PlanId },
  baseUrl: string,
) {
  const db = getDB();
  const tree = await getTree(input.treeId);
  if (!tree) throw new AppError(404, "Гацуур олдсонгүй.");

  const inv: Invoice = {
    id: randomId(12),
    kind: input.kind,
    treeId: input.treeId,
    phone: tree.phone,
    amount: 0,
    status: "pending",
    createdAt: Date.now(),
  };
  let description: string;

  if (input.kind === "gift") {
    const orn = ORNAMENTS.find((o) => o.id === input.ornament);
    if (!orn) throw new AppError(400, "Чимэглэл буруу байна.");
    const [cap, count] = await Promise.all([getCapacity(tree.id), db.hlen(k.gifts(tree.id))]);
    if (count >= cap) throw new AppError(409, "Энэ гацуур дүүрсэн байна. Эзэн нь томруулсны дараа өлгөх боломжтой.");
    inv.amount = orn.price;
    inv.gift = { ornament: orn.id, from: input.from, message: input.message };
    description = `Гацуурт бэлэг: ${orn.name}`;
  } else {
    const plan = EXPAND_PLANS.find((p) => p.id === input.plan);
    if (!plan) throw new AppError(400, "Багц буруу байна.");
    inv.amount = plan.price;
    inv.plan = plan.id;
    description = `Гацуур томруулах +${plan.slots} бэлэг`;
  }

  if (paymentMode() === "qpay") {
    inv.qpay = await createQPayInvoice({
      amount: inv.amount,
      description,
      callbackUrl: `${baseUrl}/api/qpay/callback?inv=${inv.id}`,
      senderInvoiceNo: inv.id,
      phone: tree.phone,
    });
  }

  await db.set(k.inv(inv.id), inv, { ex: INV_TTL });
  await db.lpush(k.invIndex, inv.id);
  await db.ltrim(k.invIndex, 0, INV_INDEX_MAX - 1);
  await log("info", "invoice.created", undefined, { id: inv.id, kind: inv.kind, treeId: inv.treeId, amount: inv.amount, qpayId: inv.qpay?.invoice_id });
  return inv;
}

export const getInvoice = (id: string) => getDB().get<Invoice>(k.inv(id));

/**
 * Төлбөр төлөгдсөн бол бэлэг/томруулалтыг хэрэгжүүлнэ.
 * HSET нь invoice id-р бичдэг тул callback, polling зэрэг давхар дуудлагад ч нэг л удаа нөлөөлнө.
 * Бичилт дундуур тасарвал дараагийн шалгалтаар дахин бүрэн бичигдэнэ.
 */
export async function finalizeInvoice(inv: Invoice): Promise<Invoice> {
  if (inv.status === "paid") return inv;
  const db = getDB();
  if (inv.kind === "gift" && inv.gift) {
    const gift: Gift = { id: inv.id, ...inv.gift, amount: inv.amount, createdAt: inv.createdAt };
    // Дүнг эхэлж нэмнэ: бэлэг бичихээс өмнө тасарвал дараагийн шалгалтаар бэлэг бичигдэж, дүн давхар нэмэгдэхгүй
    await creditTreeAmount(inv);
    await db.hset(k.gifts(inv.treeId), inv.id, gift);
  } else if (inv.kind === "expand" && inv.plan) {
    const plan = EXPAND_PLANS.find((p) => p.id === inv.plan)!;
    await creditTreeAmount(inv);
    await db.hset(k.expands(inv.treeId), inv.id, plan.slots);
  }
  inv.status = "paid";
  inv.paidAt = Date.now();
  await db.set(k.inv(inv.id), inv, { ex: INV_TTL });
  await log("info", "invoice.paid", undefined, { id: inv.id, kind: inv.kind, treeId: inv.treeId, amount: inv.amount, mode: paymentMode() });
  return inv;
}

/**
 * Төлөгдсөн дүнг гацуурт нэмнэ: бэлэг → `amount`, томруулалт → `update_amount` (тусдаа харагдана).
 * 1 утас = 1 гацуур тул invoice-ийн утсаар гацуурыг олно.
 * `inv:<id>:credited` SET NX — callback, polling давхар ирсэн ч нэг л удаа нэмэгдэнэ.
 */
async function creditTreeAmount(inv: Invoice) {
  const db = getDB();
  const phone = inv.phone ?? (await getTree(inv.treeId))?.phone;
  const treeId = phone ? await getTreeIdByPhone(phone) : null;
  if (!treeId) {
    await log("error", "tree.amount_no_tree", undefined, { invoice: inv.id, phone });
    return;
  }
  if (treeId !== inv.treeId) await log("warn", "tree.amount_tree_mismatch", undefined, { invoice: inv.id, treeId, invTreeId: inv.treeId });
  const counter = inv.kind === "gift" ? "amount" : "update_amount";
  await ensureCounters(treeId, inv.id);
  if (!(await db.set(k.credited(inv.id), 1, { nx: true, ex: INV_TTL }))) return;
  const total = await db.incrby(counter === "amount" ? k.amount(treeId) : k.updateAmount(treeId), inv.amount);
  await log("info", "tree.amount_added", undefined, { treeId, invoice: inv.id, counter, added: inv.amount, total });
}

/**
 * Энэ өөрчлөлтөөс өмнөх гацуурт тоолуур байхгүй бол одоо байгаа бэлэг/томруулалтаас (энэ invoice-оос бусад) эхлүүлнэ.
 * Томруулалтын hash-д зөвхөн зайн тоо байдаг тул багцын үнээр тооцно.
 */
async function ensureCounters(treeId: string, exceptInvoice?: string) {
  const db = getDB();
  const [amount, updateAmount] = await Promise.all([db.get<number>(k.amount(treeId)), db.get<number>(k.updateAmount(treeId))]);
  if (amount === null) {
    const gifts = Object.values(await db.hgetall<Gift>(k.gifts(treeId)));
    const sum = gifts.filter((g) => g.id !== exceptInvoice).reduce((s, g) => s + giftAmount(g), 0);
    await db.set(k.amount(treeId), sum, { nx: true });
  }
  if (updateAmount === null) {
    const expands = Object.entries(await db.hgetall<number>(k.expands(treeId)));
    const sum = expands
      .filter(([id]) => id !== exceptInvoice)
      .reduce((s, [, slots]) => s + (EXPAND_PLANS.find((p) => p.slots === Number(slots))?.price ?? 0), 0);
    await db.set(k.updateAmount(treeId), sum, { nx: true });
  }
}

/** Гацуурын төлөгдсөн дүн: бэлэг (`amount`), томруулалт (`update_amount`). */
export async function getTreeAmounts(treeId: string) {
  await ensureCounters(treeId);
  const db = getDB();
  const [amount, updateAmount] = await Promise.all([db.get<number>(k.amount(treeId)), db.get<number>(k.updateAmount(treeId))]);
  return { amount: Number(amount ?? 0), update_amount: Number(updateAmount ?? 0) };
}

/** QPay-с төлбөрийн төлөвийг шалгаж, төлөгдсөн бол хэрэгжүүлнэ. */
export async function syncInvoice(inv: Invoice): Promise<Invoice> {
  if (inv.status === "paid" || paymentMode() !== "qpay" || !inv.qpay) return inv;
  try {
    if (await isQPayPaid(inv.qpay.invoice_id, inv.amount)) return await finalizeInvoice(inv);
  } catch (e) {
    await log("error", "invoice.sync_failed", e, { id: inv.id, qpayId: inv.qpay.invoice_id });
  }
  return inv;
}

export function publicInvoice(inv: Invoice) {
  return {
    id: inv.id,
    kind: inv.kind,
    amount: inv.amount,
    status: inv.status,
    treeId: inv.treeId,
    qr_image: inv.qpay?.qr_image,
    shortUrl: inv.qpay?.shortUrl,
    urls: inv.qpay?.urls ?? [],
    mock: paymentMode() === "mock",
  };
}

export const giftAmount = (g: Gift) => g.amount ?? ORNAMENTS.find((o) => o.id === g.ornament)?.price ?? 0;

export type AdminTreeRow = {
  id: string;
  name: string;
  phone: string;
  createdAt: number;
  giftCount: number;
  giftAmount: number;
  updateAmount: number;
  capacity: number;
};

/** Админ: бүх гацуур + бэлгийн тоо, нийт дүн. Redis-ийг хэт ачаалахгүйн тулд 25-аар багцалж уншина. */
export async function listTreesForAdmin(): Promise<AdminTreeRow[]> {
  const ids = Object.keys(await getDB().hgetall<number>(k.index));
  const rows: AdminTreeRow[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    const batch = await Promise.all(
      ids.slice(i, i + 25).map(async (id) => {
        const v = await getTreeView(id);
        if (!v) return null;
        const amounts = await getTreeAmounts(id);
        return {
          id,
          name: v.tree.name,
          phone: v.tree.phone,
          createdAt: v.tree.createdAt,
          giftCount: v.gifts.length,
          giftAmount: amounts.amount,
          updateAmount: amounts.update_amount,
          capacity: v.capacity,
        };
      }),
    );
    rows.push(...batch.filter((r): r is AdminTreeRow => !!r));
  }
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export type AdminInvoiceRow = {
  id: string;
  kind: Invoice["kind"];
  status: Invoice["status"];
  amount: number;
  treeId: string;
  treeName: string;
  phone: string;
  item: string;
  from?: string;
  qpayId?: string;
  createdAt: number;
  paidAt?: number;
};

/**
 * Админы нэхэмжлэхийн жагсаалт (шинэ нь эхэндээ).
 * `syncPending` > 0 бол сүүлийн 24 цагийн хүлээгдэж буй нэхэмжлэхүүдээс тэр тоогоор QPay-с шалгаж төлвийг шинэчилнэ
 * — callback ирээгүй ч админ дээр live шинэчлэгдэнэ.
 */
export async function listInvoicesForAdmin(opts: { limit?: number; syncPending?: number } = {}): Promise<AdminInvoiceRow[]> {
  const db = getDB();
  const ids = await db.lrange<string>(k.invIndex, 0, (opts.limit ?? 500) - 1);
  const invs: Invoice[] = [];
  for (let i = 0; i < ids.length; i += 25) {
    const batch = await Promise.all(ids.slice(i, i + 25).map((id) => getInvoice(id)));
    invs.push(...batch.filter((x): x is Invoice => !!x));
  }

  if (opts.syncPending && paymentMode() === "qpay") {
    const recent = invs.filter((x) => x.status === "pending" && x.qpay && Date.now() - x.createdAt < 86_400_000).slice(0, opts.syncPending);
    const synced = await Promise.all(recent.map((x) => syncInvoice(x)));
    for (const s of synced) {
      const i = invs.findIndex((x) => x.id === s.id);
      if (i >= 0) invs[i] = s;
    }
  }

  const treeIds = [...new Set(invs.map((x) => x.treeId))];
  const trees = new Map<string, Tree | null>();
  for (let i = 0; i < treeIds.length; i += 25) {
    const batch = treeIds.slice(i, i + 25);
    const got = await Promise.all(batch.map((id) => getTree(id)));
    batch.forEach((id, j) => trees.set(id, got[j]));
  }

  return invs.map((x) => {
    const t = trees.get(x.treeId);
    const item =
      x.kind === "gift"
        ? (ORNAMENTS.find((o) => o.id === x.gift?.ornament)?.name ?? "Бэлэг")
        : `Томруулалт +${EXPAND_PLANS.find((p) => p.id === x.plan)?.slots ?? "?"}`;
    return {
      id: x.id,
      kind: x.kind,
      status: x.status,
      amount: x.amount,
      treeId: x.treeId,
      treeName: t?.name ?? "—",
      phone: t?.phone ?? "—",
      item,
      from: x.gift?.from,
      qpayId: x.qpay?.invoice_id,
      createdAt: x.createdAt,
      paidAt: x.paidAt,
    };
  });
}
