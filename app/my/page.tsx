import Link from "next/link";
import { redirect } from "next/navigation";
import Papercut from "@/components/Papercut";
import Snow from "@/components/Snow";
import { formatMnt } from "@/lib/config";
import { getSessionTreeIds } from "@/lib/session";
import { getTreeAmounts, getTreeView } from "@/lib/trees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Миний гацуурууд · Шинэ жилийн гацуур" };

/** Нэвтэрсэн утсанд энгийн + мөнгөтэй гацуур байвал сонгуулна, нэг бол шууд оруулна. */
export default async function My() {
  const ids = await getSessionTreeIds();
  const views = (await Promise.all(ids.map((id) => getTreeView(id)))).filter((v) => !!v);
  if (views.length === 0) redirect("/login");
  if (views.length === 1) redirect(`/t/${views[0].tree.id}`);

  const rows = await Promise.all(
    views.map(async (v) => ({
      id: v.tree.id,
      name: v.tree.name,
      money: v.tree.kind === "money",
      gifts: v.gifts.filter((g) => g.id !== v.topperId).length,
      capacity: v.capacity,
      received: v.tree.kind === "money" ? (await getTreeAmounts(v.tree.id)).amount : 0,
    })),
  );
  const hasMoney = rows.some((r) => r.money);

  return (
    <main className="page">
      <Papercut />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/">← Нүүр</Link>
      </div>
      <header className="head">
        <div className="title">Миний гацуурууд</div>
        <div className="sub">Аль гацуур руугаа орох вэ?</div>
      </header>
      <div className="actions">
        {rows.map((r) => (
          <Link key={r.id} href={`/t/${r.id}`} className={`tree-pick${r.money ? " money" : ""}`}>
            <span className="tree-pick-ico">{r.money ? "💰" : "🎄"}</span>
            <span className="tree-pick-body">
              <b>{r.name}</b>
              <small>
                {r.money ? "Мөнгөтэй гацуур" : "Энгийн гацуур"} · {r.gifts} / {r.capacity} чимэглэл
                {r.money && ` · ${formatMnt(r.received)}`}
              </small>
            </span>
            <span className="tree-pick-go">→</span>
          </Link>
        ))}
        {!hasMoney && (
          <Link className="btn money" href="/money">💰 Мөнгөтэй гацуур үүсгэх · 15,000₮</Link>
        )}
      </div>
    </main>
  );
}
