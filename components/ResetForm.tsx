"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Started = { rid: string; displayInstruction: string; smsUri: string; shortcode: string; text: string; expiresAt: number };
type Step = "phone" | "sms" | "pin";

async function post(url: string, body: object) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return r?.ok ? { data: j } : { error: (j.error as string) ?? "Алдаа гарлаа. Дахин оролдоно уу." };
}

export default function ResetForm({ initialPhone = "" }: { initialPhone?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [s, setS] = useState<Started | null>(null);
  const [expired, setExpired] = useState(false);
  const [left, setLeft] = useState(0);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const polling = useRef(false);

  async function start(e?: React.FormEvent) {
    e?.preventDefault();
    setErr("");
    setBusy(true);
    const { data, error } = await post("/api/reset", { phone });
    setBusy(false);
    if (error) return setErr(error);
    setS(data as Started);
    setExpired(false);
    setStep("sms");
  }

  // 3 сек тутам төлөв шалгана; VERIFIED / EXPIRED болмогц зогсоно
  useEffect(() => {
    if (step !== "sms" || !s || expired) return;
    polling.current = true;
    const tick = async () => {
      setLeft(Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 1000)));
      const r = await fetch(`/api/reset/${s.rid}`, { cache: "no-store" }).catch(() => null);
      const j = r?.ok ? await r.json() : null;
      if (!polling.current) return;
      if (j?.status === "VERIFIED") {
        polling.current = false;
        setStep("pin");
      } else if (j?.status === "EXPIRED" || (r?.status === 404) || Date.now() > s.expiresAt + 15_000) {
        polling.current = false;
        setExpired(true);
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    const c = setInterval(() => setLeft(Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 1000))), 1000);
    return () => {
      polling.current = false;
      clearInterval(t);
      clearInterval(c);
    };
  }, [step, s, expired]);

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^\d{4}$/.test(pin)) return setErr("PIN код 4 оронтой тоо байна.");
    if (pin !== pin2) return setErr("PIN код таарахгүй байна.");
    setBusy(true);
    const { data, error } = await post(`/api/reset/${s!.rid}/complete`, { pin });
    if (error) {
      setBusy(false);
      return setErr(error);
    }
    router.push(`/t/${(data as { id: string }).id}`);
    router.refresh();
  }

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  if (step === "phone")
    return (
      <form className="form" onSubmit={start}>
        <label className="field">
          Гацуур үүсгэсэн утасны дугаар
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="99112233" required />
        </label>
        <p className="note-muted">Энэ дугаараас SMS илгээж баталгаажуулсны дараа шинэ PIN тохируулна.</p>
        {err && <div className="err">{err}</div>}
        <button className="btn festive" disabled={busy}>{busy ? "Түр хүлээнэ үү…" : "Үргэлжлүүлэх"}</button>
      </form>
    );

  if (step === "sms" && s)
    return (
      <div className="form">
        {expired ? (
          <>
            <div className="verify-box expired">
              <b>⏰ Хугацаа дууссан</b>
              <span>Хуучин код <b>{s.text}</b> хүчингүй боллоо. Түүнийг дахин бүү илгээгээрэй.</span>
            </div>
            {err && <div className="err">{err}</div>}
            <button className="btn festive" disabled={busy} onClick={() => start()}>{busy ? "Түр хүлээнэ үү…" : "Шинэ код авах"}</button>
          </>
        ) : (
          <>
            <div className="verify-box">
              <p className="verify-instr">{s.displayInstruction}</p>
              <div className="verify-code">
                <span>{s.shortcode}</span> ← <b>{s.text}</b>
              </div>
            </div>
            <a className="btn festive" href={s.smsUri}>📩 SMS илгээх</a>
            <p className="note-muted">
              Дээрх дугаараас л илгээнэ үү — өөр SIM-ээс илгээвэл баталгаажихгүй. SMS бүрт оператор 150₮ авна.
              Хариу SMS ирэхгүй байж болно, энэ хуудас автоматаар шинэчлэгдэнэ.
            </p>
            <div className="status" style={{ color: "#ffe7a0" }}>
              <span className="dot" /> SMS хүлээж байна… {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </div>
          </>
        )}
      </div>
    );

  return (
    <form className="form" onSubmit={savePin}>
      <div className="verify-box ok"><b>✅ Утас баталгаажлаа</b></div>
      <div className="pin-row">
        <label className="field">
          Шинэ PIN <small>(4 оронтой)</small>
          <input className="input pin" type="password" value={pin} onChange={(e) => setPin(digits(e.target.value))} inputMode="numeric" maxLength={4} autoComplete="new-password" placeholder="••••" required autoFocus />
        </label>
        <label className="field">
          PIN дахин
          <input className="input pin" type="password" value={pin2} onChange={(e) => setPin2(digits(e.target.value))} inputMode="numeric" maxLength={4} autoComplete="new-password" placeholder="••••" required />
        </label>
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn festive" disabled={busy}>{busy ? "Хадгалж байна…" : "PIN хадгалаад нэвтрэх"}</button>
    </form>
  );
}
