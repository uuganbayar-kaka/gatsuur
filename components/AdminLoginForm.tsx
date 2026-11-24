"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) {
      setBusy(false);
      return setErr(j.error ?? "Алдаа гарлаа.");
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        Нэвтрэх нэр
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
      </label>
      <label className="field">
        Нууц үг
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {err && <div className="err">{err}</div>}
      <button className="btn festive" disabled={busy}>{busy ? "Нэвтэрч байна…" : "Нэвтрэх"}</button>
    </form>
  );
}
