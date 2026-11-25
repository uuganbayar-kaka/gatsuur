"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BANKS, MONEY_ORNAMENTS, MONEY_TREE_PRICE, formatMnt, type BankId, type TemplateId } from "@/lib/config";
import { OrnamentIcon } from "./Ornament";
import PaySheet, { type PublicInvoice } from "./PaySheet";
import TemplatePicker from "./TemplatePicker";

const onlyDigits = (v: string, n: number) => v.replace(/\D/g, "").slice(0, n);

export default function MoneyCreateForm() {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateId>("lush");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [bank, setBank] = useState<BankId | null>(null);
  const [account, setAccount] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^\d{4}$/.test(pin)) return setErr("PIN код 4 оронтой тоо байна.");
    if (pin !== pin2) return setErr("PIN код таарахгүй байна.");
    if (!bank) return setErr("Банкаа сонгоно уу.");
    setBusy(true);
    const res = await fetch("/api/money-trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin, template, bank, account }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setErr(j.error ?? "Алдаа гарлаа. Дахин оролдоно уу.");
    setInvoice(j);
  }

  /** Төлбөр орсны дараа шинэ гацуурт нэвтэрч орно. */
  async function claim() {
    const res = await fetch("/api/money-trees/claim", { method: "POST" }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) router.push(`/t/${j.id}`);
    else setErr(j.error ?? "Нэвтэрч чадсангүй. Утас, PIN-ээрээ нэвтэрнэ үү.");
  }

  return (
    <>
      <div className="money-info">
        <div className="money-orns">
          {MONEY_ORNAMENTS.map((o) => (
            <div key={o.id}>
              <OrnamentIcon id={o.id} size={40} />
              <small>{o.price ? formatMnt(o.price) : "Хүссэн дүн"}</small>
            </div>
          ))}
        </div>
        <p>Зочид 1,000₮ – 20,000₮ эсвэл хүссэн дүнгээрээ мөнгөн чимэглэл өлгөнө. Цугласан мөнгийг таны бүртгүүлсэн данс руу шилжүүлнэ.</p>
      </div>

      <div className="form-label">Гацуураа сонго</div>
      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <TemplatePicker value={template} onChange={setTemplate} />
      </div>

      <form className="form" onSubmit={submit}>
        <label className="field">
          Гацуурын нэр <small>(гацуур дээр харагдана)</small>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Жишээ: Болдын мөнгөн гацуур" required />
        </label>
        <label className="field">
          Утасны дугаар
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="99112244" required />
        </label>
        <div className="pin-row">
          <label className="field">
            PIN код <small>(4 оронтой)</small>
            <input className="input pin" type="password" value={pin} onChange={(e) => setPin(onlyDigits(e.target.value, 4))} inputMode="numeric" maxLength={4} autoComplete="new-password" placeholder="••••" required />
          </label>
          <label className="field">
            PIN дахин
            <input className="input pin" type="password" value={pin2} onChange={(e) => setPin2(onlyDigits(e.target.value, 4))} inputMode="numeric" maxLength={4} autoComplete="new-password" placeholder="••••" required />
          </label>
        </div>

        <div className="field">
          Мөнгө хүлээн авах банк
          <div className="bank-grid">
            {BANKS.map((b) => (
              <button type="button" key={b.id} className={`bank-opt${bank === b.id ? " sel" : ""}`} onClick={() => setBank(b.id)}>
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Дансны дугаар
          <input className="input" value={account} onChange={(e) => setAccount(e.target.value.replace(/[^\dA-Za-z\s-]/g, "").slice(0, 26))} inputMode="numeric" placeholder="5000123456" required />
        </label>
        <p className="note-muted">Дансны дугаараа сайн шалгаарай — цугласан мөнгийг энэ данс руу шилжүүлнэ. Дансны мэдээлэл бусдад харагдахгүй.</p>
        {err && <div className="err">{err}</div>}
        <button className="btn festive" disabled={busy}>
          {busy ? "Түр хүлээнэ үү…" : `💰 Мөнгөтэй гацуур үүсгэх · ${formatMnt(MONEY_TREE_PRICE)}`}
        </button>
      </form>

      {invoice && (
        <div className="sheet-wrap" onClick={() => setInvoice(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h3>💰 Мөнгөтэй гацуур</h3>
              <button className="x" onClick={() => setInvoice(null)} aria-label="Хаах">✕</button>
            </div>
            <PaySheet invoice={invoice} title={`«${name}» үүсгэх төлбөр`} onPaid={claim} onClose={claim} />
          </div>
        </div>
      )}
    </>
  );
}
