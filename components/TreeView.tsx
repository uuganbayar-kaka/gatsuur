"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EXPAND_PLANS, FREE_CAPACITY, ORNAMENTS, formatMnt, type OrnamentId, type PlanId, type TemplateId } from "@/lib/config";
import { OrnamentIcon } from "./Ornament";
import PaySheet, { type PublicInvoice } from "./PaySheet";
import Papercut from "./Papercut";
import OpenNotice from "./OpenNotice";
import Snow from "./Snow";
import TemplatePicker from "./TemplatePicker";
import TreeArt from "./TreeArt";

type G = { id: string; ornament: OrnamentId; from: string; message?: string };

type Sheet =
  | { t: "gift" }
  | { t: "expand" }
  | { t: "pay"; invoice: PublicInvoice; title: string };

export default function TreeView({
  tree,
  capacity,
  gifts,
  isOwner,
  mock,
}: {
  tree: { id: string; name: string; template: TemplateId };
  capacity: number;
  gifts: G[];
  isOwner: boolean;
  mock: boolean;
}) {
  const router = useRouter();
  const [template, setTemplate] = useState(tree.template);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const [shareUrl, setShareUrl] = useState(`/t/${tree.id}`);
  const [copied, setCopied] = useState(false);
  const full = gifts.length >= capacity;

  useEffect(() => setTemplate(tree.template), [tree.template]);
  useEffect(() => setShareUrl(`${window.location.origin}/t/${tree.id}`), [tree.id]);

  async function changeTemplate(t: TemplateId) {
    setTemplate(t);
    await fetch(`/api/trees/${tree.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: t }),
    });
    router.refresh();
  }

  async function share() {
    const data = { title: `${tree.name} · Шинэ жилийн гацуур`, text: "Миний гацуурт бэлэг чимэглэл өлгөөрэй 🎄", url: shareUrl };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* хэрэглэгч цуцалсан */
      }
    }
    await navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  const reader = reading !== null ? gifts[reading] : null;

  return (
    <main className="page">
      <Papercut hideCenter />
      <Snow />
      <div className="bar">
        <Link className="chip" href="/">🎄 Гацуур</Link>
        {isOwner ? (
          <button className="chip" onClick={logout}>Гарах</button>
        ) : (
          <Link className="chip" href="/login">Би эзэн нь</Link>
        )}
      </div>

      <header className="head">
        <div className="title">{tree.name}</div>
        <div className="sub">Шинэ жилийн гацуур</div>
        <div className="count">
          🎁 <b>{gifts.length}</b> / {capacity} бэлэг чимэглэл өлгөгдсөн
        </div>
        <OpenNotice owner={isOwner} />
      </header>

      <div className="stage">
        <TreeArt
          template={template}
          capacity={capacity}
          gifts={gifts}
          onPick={(g) => setReading(gifts.findIndex((x) => x.id === g.id))}
        />
      </div>

      <div className="actions">
        {full ? (
          <div className="up">
            <b>🎄 Гацуур дүүрсэн байна</b>
            <span>
              {isOwner
                ? "Найзууд чинь дахин бэлэг өлгөхийн тулд гацуураа томруулаарай."
                : `${tree.name}-ийн гацуурт сул зай үлдээгүй байна. Эзэн нь томруулсны дараа өлгөх боломжтой.`}
            </span>
            {isOwner && <button className="btn gold" onClick={() => setSheet({ t: "expand" })}>Гацуураа томруулах</button>}
          </div>
        ) : (
          <button className="btn primary" onClick={() => setSheet({ t: "gift" })}>🎁 Бэлэг чимэглэл өлгөх</button>
        )}

        {isOwner && (
          <>
            <div className="card">
              <h4>🔗 Хуваалцах линк</h4>
              <p>Энэ линкийг найзууддаа илгээгээрэй. Тэд гацуурт чинь бэлэг чимэглэл өлгөнө.</p>
              <div className="share-row">
                <div className="share-url">{shareUrl}</div>
                <button className="btn primary small" onClick={share}>{copied ? "Хуулсан ✓" : "Хуваалцах"}</button>
              </div>
            </div>

            <div className="card">
              <h4>🎨 Загвар солих</h4>
              <TemplatePicker value={template} onChange={changeTemplate} />
            </div>

            {!full && (
              <div className="card">
                <h4>🌲 Гацуураа томруулах</h4>
                <p>Үнэгүй гацуурт {FREE_CAPACITY} бэлэг өлгөх боломжтой. Томруулж илүү олон бэлэг хүлээн аваарай.</p>
                <button className="btn gold" onClick={() => setSheet({ t: "expand" })}>Багц сонгох</button>
              </div>
            )}
            <p className="note-muted" style={{ color: "#fff", opacity: 0.6, textAlign: "center" }}>
              Чимэглэл дээр дарж мессежийг уншина уу.
            </p>
          </>
        )}

        {!isOwner && (
          <Link className="link" href="/">🎄 Эсвэл өөрийн гацуураа үүсгэх →</Link>
        )}
      </div>

      {reader && (
        <div className="reader" onClick={() => setReading(null)}>
          <div className="note" onClick={(e) => e.stopPropagation()}>
            <div className="note-orn"><OrnamentIcon id={reader.ornament} size={64} /></div>
            {isOwner ? (
              <div className="msg">{reader.message || "🎄"}</div>
            ) : (
              <div className="locked">🔒 Мессежийг зөвхөн гацуурын эзэн уншина</div>
            )}
            <div className="sign">— {reader.from}</div>
          </div>
          <div className="reader-nav" onClick={(e) => e.stopPropagation()}>
            <button className="btn secondary small" disabled={reading === 0} onClick={() => setReading((r) => (r ?? 1) - 1)}>←</button>
            <span>{(reading ?? 0) + 1} / {gifts.length}</span>
            <button className="btn secondary small" disabled={reading === gifts.length - 1} onClick={() => setReading((r) => (r ?? 0) + 1)}>→</button>
            <button className="btn secondary small" onClick={() => setReading(null)}>Хаах</button>
          </div>
        </div>
      )}

      {sheet && (
        <div className="sheet-wrap" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h3>
                {sheet.t === "gift" ? "🎁 Бэлэг чимэглэл өлгөх" : sheet.t === "expand" ? "🌲 Гацуураа томруулах" : "💳 Төлбөр төлөх"}
              </h3>
              <button className="x" onClick={() => setSheet(null)} aria-label="Хаах">×</button>
            </div>
            {sheet.t === "gift" && (
              <GiftForm
                treeId={tree.id}
                treeName={tree.name}
                onInvoice={(invoice, title) => setSheet({ t: "pay", invoice, title })}
              />
            )}
            {sheet.t === "expand" && (
              <ExpandForm treeId={tree.id} onInvoice={(invoice, title) => setSheet({ t: "pay", invoice, title })} />
            )}
            {sheet.t === "pay" && (
              <PaySheet
                invoice={sheet.invoice}
                title={sheet.title}
                onPaid={() => router.refresh()}
                onClose={() => setSheet(null)}
              />
            )}
            {mock && sheet.t !== "pay" && <p className="note-muted">Туршилтын горим: бодит төлбөр авахгүй.</p>}
          </div>
        </div>
      )}
    </main>
  );
}

async function postInvoice(body: object): Promise<{ inv?: PublicInvoice; error?: string }> {
  const r = await fetch("/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  return r?.ok ? { inv: j } : { error: j.error ?? "Алдаа гарлаа. Дахин оролдоно уу." };
}

function GiftForm({
  treeId,
  treeName,
  onInvoice,
}: {
  treeId: string;
  treeName: string;
  onInvoice: (inv: PublicInvoice, title: string) => void;
}) {
  const [orn, setOrn] = useState<OrnamentId>("ball");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = ORNAMENTS.find((o) => o.id === orn)!;
  const tiers = [...new Set(ORNAMENTS.map((o) => o.price))];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { inv, error } = await postInvoice({ kind: "gift", treeId, ornament: orn, from, message });
    setBusy(false);
    if (error) return setErr(error);
    onInvoice(inv!, `${treeName}-д: ${selected.name}`);
  }

  return (
    <form onSubmit={submit}>
      {tiers.map((price) => (
        <div key={price}>
          <div className="tier-label">{formatMnt(price)}</div>
          <div className="orn-grid">
            {ORNAMENTS.filter((o) => o.price === price).map((o) => (
              <button type="button" key={o.id} className={`orn-opt${orn === o.id ? " sel" : ""}`} onClick={() => setOrn(o.id)}>
                <OrnamentIcon id={o.id} />
                {o.name}
                <b>{formatMnt(o.price)}</b>
              </button>
            ))}
          </div>
        </div>
      ))}
      <label className="field">
        Таны нэр
        <input className="input" value={from} onChange={(e) => setFrom(e.target.value)} maxLength={40} placeholder="Хэнээс" required />
      </label>
      <label className="field">
        Мэндчилгээ <small>(зөвхөн эзэн нь уншина)</small>
        <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="Шинэ оны мэнд хүргэе! 🎄" />
      </label>
      <OpenNotice compact />
      {err && <div className="err">{err}</div>}
      <button className="btn primary" disabled={busy}>
        {busy ? "Түр хүлээнэ үү…" : `Төлөх · ${formatMnt(selected.price)}`}
      </button>
    </form>
  );
}

function ExpandForm({ treeId, onInvoice }: { treeId: string; onInvoice: (inv: PublicInvoice, title: string) => void }) {
  const [plan, setPlan] = useState<PlanId>("m");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = EXPAND_PLANS.find((x) => x.id === plan)!;

  async function submit() {
    setBusy(true);
    setErr("");
    const { inv, error } = await postInvoice({ kind: "expand", treeId, plan });
    setBusy(false);
    if (error) return setErr(error);
    onInvoice(inv!, `Гацуур томруулах · +${p.slots} бэлэг`);
  }

  return (
    <div>
      <p className="note-muted" style={{ marginTop: 0 }}>Багцаа сонгоод гацуураа томруулаарай. Нэмэлт зай шууд нэмэгдэнэ.</p>
      <div className="plans">
        {EXPAND_PLANS.map((x) => (
          <button
            key={x.id}
            type="button"
            className="plan"
            style={{ borderColor: plan === x.id ? "var(--accent)" : "var(--line)", background: plan === x.id ? "#fff0f2" : "#fff" }}
            onClick={() => setPlan(x.id)}
          >
            <b>+{x.slots}</b>
            <small>бэлэг</small>
            <span className="price">{formatMnt(x.price)}</span>
          </button>
        ))}
      </div>
      {err && <div className="err">{err}</div>}
      <button className="btn primary" disabled={busy} onClick={submit}>
        {busy ? "Түр хүлээнэ үү…" : `Төлөх · ${formatMnt(p.price)}`}
      </button>
    </div>
  );
}
