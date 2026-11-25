import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TreeView from "@/components/TreeView";
import { GIFT_OPEN_AT, bankName } from "@/lib/config";
import { paymentMode } from "@/lib/qpay";
import { getSessionTreeId } from "@/lib/session";
import { getTreeAmounts, getTreeView } from "@/lib/trees";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const v = await getTreeView(id).catch(() => null);
  if (!v) return { title: "Гацуур олдсонгүй" };
  return {
    title: `${v.tree.name} · Шинэ жилийн гацуур`,
    description: `${v.tree.name}-ийн гацуурт бэлэг чимэглэл өлгөөрэй 🎄`,
  };
}

export default async function TreePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [v, me] = await Promise.all([getTreeView(id), getSessionTreeId()]);
  if (!v) notFound();
  const isOwner = me === id;
  // Захидал 2027-01-01 хүртэл битүү — эзэнд ч сервер мессежийг илгээхгүй
  const opened = Date.now() >= GIFT_OPEN_AT;
  // Мөнгөтэй гацуур: цугласан дүн, данс зөвхөн эзэнд (дансны сүүлийн 4 орон)
  const isMoney = v.tree.kind === "money";
  const money = isMoney
    ? isOwner
      ? { received: (await getTreeAmounts(id)).amount, payout: `${bankName(v.tree.bank)} ••••${(v.tree.account ?? "").slice(-4)}` }
      : {}
    : null;
  return (
    <TreeView
      tree={{ id: v.tree.id, name: v.tree.name, template: v.tree.template }}
      capacity={v.capacity}
      topperId={v.topperId}
      gifts={v.gifts.map((g) => ({
        id: g.id,
        ornament: g.ornament,
        from: g.from,
        message: isOwner && opened ? g.message : undefined,
      }))}
      isOwner={isOwner}
      opened={opened}
      money={money}
      mock={paymentMode() === "mock"}
    />
  );
}
