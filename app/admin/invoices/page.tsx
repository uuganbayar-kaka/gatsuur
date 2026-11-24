import { redirect } from "next/navigation";
import AdminInvoices from "@/components/AdminInvoices";
import AdminNav from "@/components/AdminNav";
import { getAdmin } from "@/lib/admin";
import { listInvoicesForAdmin } from "@/lib/trees";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ · Нэхэмжлэх", robots: { index: false } };

export default async function AdminInvoicesPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const rows = await listInvoicesForAdmin();
  return (
    <main className="admin">
      <AdminNav admin={admin} active="/admin/invoices" />
      <AdminInvoices initial={rows} />
    </main>
  );
}
