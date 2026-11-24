import Link from "next/link";
import AdminLogout from "./AdminLogout";

const LINKS = [
  { href: "/admin", label: "Гацуур" },
  { href: "/admin/invoices", label: "Нэхэмжлэх" },
  { href: "/admin/logs", label: "Лог" },
];

export default function AdminNav({ admin, active }: { admin: string; active: string }) {
  return (
    <div className="admin-bar">
      <b>🎄 Админ</b>
      <span className="admin-nav">
        {LINKS.map((l) => (
          <Link key={l.href} className={`chip${l.href === active ? " on" : ""}`} href={l.href}>
            {l.label}
          </Link>
        ))}
        <span className="admin-user">{admin}</span>
        <AdminLogout />
      </span>
    </div>
  );
}
