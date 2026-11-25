import { redirect } from "next/navigation";
import AdminInvoices from "@/components/AdminInvoices";
import AdminNav from "@/components/AdminNav";
import { getAdmin } from "@/lib/admin";
import { formatMnt } from "@/lib/config";
import { findQPayInvoice } from "@/lib/qpay";
import { listInvoicesForAdmin, normalizePhone } from "@/lib/trees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ · Нэхэмжлэх", robots: { index: false } };

const PURPOSE = { gift: "Бэлэг / мөнгөн чимэглэл", expand: "Томруулалт", create: "Мөнгөтэй гацуур үүсгэх" } as const;

export default async function AdminInvoicesPage({ searchParams }: { searchParams: Promise<{ qid?: string; phone?: string }> }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const { qid = "", phone = "" } = await searchParams;
  const p = normalizePhone(phone);
  // QPay нэхэмжлэхийг invoice_id + утсаар олно → энгийн гацуурын бэлэг уу, мөнгөтэй гацуурын мөнгө үү
  const found = qid && p ? await findQPayInvoice(qid.trim(), p) : null;
  const rows = await listInvoicesForAdmin();
  return (
    <main className="admin">
      <AdminNav admin={admin} active="/admin/invoices" />

      <form className="qpay-find">
        <input name="qid" defaultValue={qid} placeholder="QPay invoice_id" />
        <input name="phone" defaultValue={phone} placeholder="Утас" inputMode="numeric" />
        <button>QPay нэхэмжлэх хайх</button>
      </form>
      {qid && p && !found && <p className="muted" style={{ marginTop: -4 }}>Энэ invoice_id + утсаар QPay нэхэмжлэх олдсонгүй.</p>}
      {found && (
        <dl className="qpay-result">
          <dt>Гацуур</dt>
          <dd>
            <span className={`badge ${found.tree_kind === "money" ? "money" : "free"}`}>
              {found.tree_kind === "money" ? "💰 Мөнгөтэй гацуур (мөнгө)" : found.tree_kind === "free" ? "🎄 Энгийн гацуур (бэлэг)" : "Тодорхойгүй (хуучин)"}
            </span>{" "}
            {found.tree_id && <a href={`/t/${found.tree_id}`} target="_blank" rel="noreferrer">{found.tree_id}</a>}
          </dd>
          <dt>Зориулалт</dt>
          <dd>{found.purpose ? PURPOSE[found.purpose] : "—"}</dd>
          <dt>Төлөв</dt>
          <dd><span className={`badge ${found.status === "PAID" ? "paid" : "pending"}`}>{found.status}</span> {found.paid_date ?? ""}</dd>
          <dt>Дүн</dt>
          <dd>{formatMnt(found.amount)}</dd>
          <dt>invoice_id</dt>
          <dd className="mono">{found.invoice_id}</dd>
          <dt>Манай дугаар</dt>
          <dd className="mono">{found.sender_invoice_no}</dd>
          <dt>Утас</dt>
          <dd className="mono">{found.phone}</dd>
          <dt>Үүссэн</dt>
          <dd>{found.created_date}</dd>
        </dl>
      )}

      <AdminInvoices initial={rows} />
    </main>
  );
}
