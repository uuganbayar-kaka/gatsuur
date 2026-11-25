import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getAdmin } from "@/lib/admin";
import { MONEY_PAYOUT_DATE, bankName, formatMnt } from "@/lib/config";
import { listTreesForAdmin } from "@/lib/trees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ · Мөнгөтэй гацуур", robots: { index: false } };

const fmtDate = (t: number) =>
  new Date(t).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AdminMoneyTrees({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const { q = "", sort = "new" } = await searchParams;

  let rows = (await listTreesForAdmin()).filter((r) => r.kind === "money");
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || r.phone.includes(needle) || (r.account ?? "").includes(needle));
  if (sort === "amount") rows.sort((a, b) => b.giftAmount - a.giftAmount);
  if (sort === "gifts") rows.sort((a, b) => b.giftCount - a.giftCount);

  const totalAmount = rows.reduce((s, r) => s + r.giftAmount, 0);
  const totalFees = rows.reduce((s, r) => s + (r.createFee ?? 0), 0);
  const totalGifts = rows.reduce((s, r) => s + r.giftCount, 0);
  const sortLink = (s: string) => `/admin/money?${new URLSearchParams({ ...(q ? { q } : {}), sort: s })}`;

  return (
    <main className="admin">
      <AdminNav admin={admin} active="/admin/money" />

      <div className="admin-stats">
        <div><small>Мөнгөтэй гацуур</small><b>{rows.length}</b></div>
        <div><small>Мөнгөн чимэглэл</small><b>{totalGifts}</b></div>
        <div><small>Цугласан дүн ({MONEY_PAYOUT_DATE}-нд шилжүүлэх)</small><b>{formatMnt(totalAmount)}</b></div>
        <div><small>Үүсгэх төлбөр</small><b>{formatMnt(totalFees)}</b></div>
      </div>

      <form className="admin-search">
        <input name="q" defaultValue={q} placeholder="Нэр, утас, дансаар хайх…" />
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        <button>Хайх</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Гацуурын нэр</th>
              <th>Утас</th>
              <th>Банк</th>
              <th>Дансны дугаар</th>
              <th className="num"><Link href={sortLink("gifts")}>Чимэглэл {sort === "gifts" && "↓"}</Link></th>
              <th className="num"><Link href={sortLink("amount")}>Цугласан дүн {sort === "amount" && "↓"}</Link></th>
              <th className="num">Үүсгэх төлбөр</th>
              <th><Link href={sortLink("new")}>Үүсгэсэн {sort === "new" && "↓"}</Link></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="muted">{i + 1}</td>
                <td><a href={`/t/${r.id}`} target="_blank" rel="noreferrer">{r.name}</a></td>
                <td className="mono">{r.phone}</td>
                <td>{bankName(r.bank)}</td>
                <td className="mono">{r.account ?? "—"}</td>
                <td className="num">{r.giftCount} <span className="muted">/ {r.capacity}</span></td>
                <td className="num"><b>{formatMnt(r.giftAmount)}</b></td>
                <td className="num">{formatMnt(r.createFee ?? 0)}</td>
                <td className="muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>Мөнгөтэй гацуур алга</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
