"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TemplateId } from "@/lib/config";
import TemplatePicker from "./TemplatePicker";

export default function CreateForm() {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateId>("lush");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password !== password2) return setErr("Нууц үг таарахгүй байна.");
    setBusy(true);
    const res = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, password, template }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      setBusy(false);
      return setErr(j.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
    }
    router.push(`/t/${j.id}`);
  }

  return (
    <>
      <div className="form-label">
        Гацуураа сонго <small>(бүгд үнэгүй, дараа нь солих боломжтой)</small>
      </div>
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <TemplatePicker value={template} onChange={setTemplate} />
      </div>
      <form className="form" onSubmit={submit}>
        <label className="field">
          Гацуурын нэр <small>(гацуур дээр харагдана)</small>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Жишээ: Болороо🥰" required />
        </label>
        <label className="field">
          Утасны дугаар
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="99112233" required />
        </label>
        <label className="field">
          Нууц үг <small>(6+ тэмдэгт)</small>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
        </label>
        <label className="field">
          Нууц үг дахин
          <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" minLength={6} required />
        </label>
        <p className="note-muted">Утасны дугаар, нууц үгээрээ дараа нь өөрийн гацуур руу нэвтэрч орно.</p>
        {err && <div className="err">{err}</div>}
        <button className="btn festive" disabled={busy}>
          {busy ? "Үүсгэж байна…" : "🎄 Гацуураа үүсгэх · Үнэгүй ✨"}
        </button>
      </form>
    </>
  );
}
