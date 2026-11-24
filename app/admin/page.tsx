import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLogout from "@/components/AdminLogout";
import { getAdmin } from "@/lib/admin";
import { formatMnt } from "@/lib/config";
import { listTreesForAdmin } from "@/lib/trees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ · Гацуурын жагсаалт", robots: { index: false } };

const fmtDate = (t: number) =>
  new Date(t).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AdminTrees({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const { q = "", sort = "new" } = await searchParams;

  let rows = await listTreesForAdmin();
  const needle = q.trim().toLowerCase();
  if (needle) rows = rows.filter((r) => r.name.toLowerCase().includes(needle) || r.phone.includes(needle));
  if (sort === "amount") rows.sort((a, b) => b.giftAmount - a.giftAmount);
  if (sort === "gifts") rows.sort((a, b) => b.giftCount - a.giftCount);

  const totalGifts = rows.reduce((s, r) => s + r.giftCount, 0);
  const totalAmount = rows.reduce((s, r) => s + r.giftAmount, 0);
  const sortLink = (s: string) => `/admin?${new URLSearchParams({ ...(q ? { q } : {}), sort: s })}`;

  return (
    <main className="admin">
      <div className="admin-bar">
        <b>🎄 Админ</b>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="chip" href="/admin/logs">Лог</Link>
          <span style={{ opacity: 0.7, fontSize: 13 }}>{admin}</span>
          <AdminLogout />
        </span>
      </div>

      <div className="admin-stats">
        <div><small>Гацуур</small><b>{rows.length}</b></div>
        <div><small>Нийт бэлэг</small><b>{totalGifts}</b></div>
        <div><small>Бэлгийн нийт дүн</small><b>{formatMnt(totalAmount)}</b></div>
      </div>

      <form className="admin-search">
        <input name="q" defaultValue={q} placeholder="Нэр эсвэл утасаар хайх…" />
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
              <th className="num"><Link href={sortLink("gifts")}>Бэлэг {sort === "gifts" && "↓"}</Link></th>
              <th className="num"><Link href={sortLink("amount")}>Нийт дүн {sort === "amount" && "↓"}</Link></th>
              <th><Link href={sortLink("new")}>Үүсгэсэн {sort === "new" && "↓"}</Link></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="muted">{i + 1}</td>
                <td><a href={`/t/${r.id}`} target="_blank" rel="noreferrer">{r.name}</a></td>
                <td className="mono">{r.phone}</td>
                <td className="num">{r.giftCount} <span className="muted">/ {r.capacity}</span></td>
                <td className="num"><b>{formatMnt(r.giftAmount)}</b></td>
                <td className="muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 24 }}>Гацуур алга</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
