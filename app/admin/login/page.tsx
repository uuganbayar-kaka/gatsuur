import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/AdminLoginForm";
import { getAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Админ · Нэвтрэх", robots: { index: false } };

export default async function AdminLogin() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="page admin-page">
      <header className="head" style={{ marginTop: "12vh" }}>
        <div className="title">Админ</div>
        <div className="sub">Зөвхөн админ хэрэглэгч нэвтэрнэ.</div>
      </header>
      <AdminLoginForm />
    </main>
  );
}
