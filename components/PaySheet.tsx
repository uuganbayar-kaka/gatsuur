"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMnt } from "@/lib/config";

export type PublicInvoice = {
  id: string;
  kind: "gift" | "expand" | "create";
  amount: number;
  status: "pending" | "paid";
  qr_image?: string;
  shortUrl?: string;
  urls: { name: string; description: string; logo: string; link: string }[];
  mock: boolean;
};

export default function PaySheet({
  invoice,
  title,
  onPaid,
  onClose,
}: {
  invoice: PublicInvoice;
  title: string;
  onPaid: () => void;
  onClose: () => void;
}) {
  const [inv, setInv] = useState(invoice);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [opened, setOpened] = useState<string | null>(null);
  const paid = inv.status === "paid";
  const polling = useRef(false);

  /** Нэхэмжлэхийн төлөвийг чимээгүй шалгана (давхар хүсэлт явуулахгүй). */
  const poll = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    const r = await fetch(`/api/invoices/${inv.id}`, { cache: "no-store" }).catch(() => null);
    polling.current = false;
    if (r?.ok) setInv(await r.json());
  }, [inv.id]);

  useEffect(() => {
    if (paid) {
      onPaid();
      return;
    }
    if (inv.mock) return;
    const t = setInterval(poll, 3000);
    // Банкны аппаас буцаж ирэхэд шууд шалгана (далд таб дээр interval удааширдаг).
    const onBack = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    window.addEventListener("pageshow", onBack);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
      window.removeEventListener("pageshow", onBack);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, inv.mock, poll]);

  /** Банкны аппыг deep link-ээр нээнэ. */
  function openApp(e: React.MouseEvent<HTMLAnchorElement>, link: string, name: string) {
    e.preventDefault();
    setErr("");
    setOpened(name);
    window.location.href = link;
  }

  async function check(path: string, method: "GET" | "POST") {
    setBusy(true);
    setErr("");
    const r = await fetch(path, { method, cache: "no-store" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setErr(j.error ?? "Алдаа гарлаа.");
    setInv(j);
    if (j.status !== "paid") setErr("Төлбөр хараахан орж ирээгүй байна.");
  }

  if (paid)
    return (
      <div className="pay">
        <div className="success">🎉</div>
        <h3>{inv.kind === "gift" ? "Бэлэг амжилттай өлгөгдлөө!" : inv.kind === "create" ? "Мөнгөтэй гацуур үүслээ!" : "Гацуур томорлоо!"}</h3>
        <p className="note-muted">Баярлалаа. Төлбөр {formatMnt(inv.amount)} амжилттай.</p>
        <button className="btn primary" onClick={onClose}>Гацуур харах</button>
      </div>
    );

  return (
    <div className="pay">
      <div className="note-muted" style={{ marginTop: 0 }}>{title}</div>
      <div className="amount">{formatMnt(inv.amount)}</div>

      {inv.mock ? (
        <>
          <div className="mock-banner">
            Туршилтын горим: QPay холбогдоогүй тул доорх товчоор төлбөрийг дуурайлган баталгаажуулна.
          </div>
          <button className="btn primary" disabled={busy} onClick={() => check(`/api/invoices/${inv.id}/mock`, "POST")}>
            ✅ Төлбөр төлсөн (туршилт)
          </button>
        </>
      ) : (
        <>
          {inv.qr_image && <img className="qr" src={`data:image/png;base64,${inv.qr_image}`} alt="QPay QR" />}
          <div className="note-muted">QPay эсвэл банкны аппаар QR уншуулна уу. Утаснаас бол доорх банкаа сонгоно уу.</div>
          {inv.urls.length > 0 && (
            <div className="banks">
              {inv.urls.map((u) => (
                <a
                  key={u.name + u.link}
                  className={`bank${opened === u.name ? " sel" : ""}`}
                  href={u.link}
                  rel="noopener"
                  onClick={(e) => openApp(e, u.link, u.name)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.logo} alt={u.description || u.name} loading="lazy" />
                  <span>{u.description || u.name}</span>
                </a>
              ))}
            </div>
          )}
          {inv.shortUrl && (
            <a className="bank-link" href={inv.shortUrl} target="_blank" rel="noopener noreferrer">
              QPay холбоосоор төлөх ↗
            </a>
          )}
          <div className="status">
            <span className="dot" /> {opened ? "Аппаас төлөөд энд буцаж ирнэ үү…" : "Төлбөр хүлээж байна…"}
          </div>
          <button
            className={`btn ${opened ? "primary" : "secondary"}`}
            disabled={busy}
            onClick={() => check(`/api/invoices/${inv.id}`, "GET")}
          >
            {busy ? "Шалгаж байна…" : opened ? "Төлсөн, шалгах" : "Төлбөр шалгах"}
          </button>
        </>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  );
}
