"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TemplateId } from "@/lib/config";
import TemplatePicker from "./TemplatePicker";

const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

export default function CreateForm() {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateId>("lush");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^\d{4}$/.test(pin)) return setErr("PIN код 4 оронтой тоо байна.");
    if (pin !== pin2) return setErr("PIN код таарахгүй байна.");
    setBusy(true);
    const res = await fetch("/api/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin, template }),
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
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Жишээ: Хөөрхөнөө🥰" required />
        </label>
        <label className="field">
          Утасны дугаар
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="99112244" required />
        </label>
        <div className="pin-row">
          <label className="field">
            PIN код <small>(4 оронтой)</small>
            <input className="input pin" type="password" value={pin} onChange={(e) => setPin(onlyDigits(e.target.value))} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="new-password" placeholder="••••" required />
          </label>
          <label className="field">
            PIN дахин
            <input className="input pin" type="password" value={pin2} onChange={(e) => setPin2(onlyDigits(e.target.value))} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="new-password" placeholder="••••" required />
          </label>
        </div>
        <p className="note-muted">Утасны дугаар, PIN кодоороо дараа нь өөрийн гацуур руу нэвтэрч орно. PIN-ээ мартахгүй санаарай.</p>
        {err && <div className="err">{err}</div>}
        <button className="btn festive" disabled={busy}>
          {busy ? "Үүсгэж байна…" : "🎄 Гацуураа үүсгэх · Үнэгүй ✨"}
        </button>
      </form>
    </>
  );
}
