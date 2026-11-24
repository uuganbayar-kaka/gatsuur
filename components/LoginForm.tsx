"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setBusy(false);
      return setErr(j.error ?? "Алдаа гарлаа.");
    }
    router.push(`/t/${j.id}`);
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        Утасны дугаар
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="99112233" required />
      </label>
      <label className="field">
        Нууц үг
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {err && <div className="err">{err}</div>}
      <button className="btn festive" disabled={busy}>
        {busy ? "Нэвтэрч байна…" : "Миний гацуур руу орох"}
      </button>
    </form>
  );
}
