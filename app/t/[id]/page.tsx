import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TreeView from "@/components/TreeView";
import { paymentMode } from "@/lib/qpay";
import { getSessionTreeId } from "@/lib/session";
import { getTreeView } from "@/lib/trees";

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
  return (
    <TreeView
      tree={{ id: v.tree.id, name: v.tree.name, template: v.tree.template }}
      capacity={v.capacity}
      gifts={v.gifts.map((g) => ({
        id: g.id,
        ornament: g.ornament,
        from: g.from,
        message: isOwner ? g.message : undefined,
      }))}
      isOwner={isOwner}
      mock={paymentMode() === "mock"}
    />
  );
}
