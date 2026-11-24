"use client";
import { useRouter } from "next/navigation";

export default function AdminLogout() {
  const router = useRouter();
  return (
    <button
      className="chip"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      Гарах
    </button>
  );
}
