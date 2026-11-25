"use client";
import { useEffect, useRef, useState } from "react";
import { formatMnt } from "@/lib/config";
import type { AdminInvoiceRow } from "@/lib/trees";

const POLL_MS = 5000;

const fmtDate = (t: number) =>
  new Date(t).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

type Filter = "all" | "pending" | "paid";
type KindFilter = "all" | "free" | "money";

export default function AdminInvoices({ initial }: { initial: AdminInvoiceRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [live, setLive] = useState<"ok" | "err" | "paused">("ok");
  const [updated, setUpdated] = useState(Date.now());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const prev = useRef(new Map(initial.map((r) => [r.id, r.status])));

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      if (document.hidden) {
        setLive("paused");
      } else {
        try {
          const res = await fetch("/api/admin/invoices", { cache: "no-store" });
          if (res.status === 401) return location.assign("/admin/login");
          if (!res.ok) throw new Error(String(res.status));
          const { rows: next } = (await res.json()) as { rows: AdminInvoiceRow[] };
          // Шинэ эсвэл төлөв өөрчлөгдсөн мөрийг тодруулна
          const changed = new Set(next.filter((r) => prev.current.get(r.id) !== r.status).map((r) => r.id));
          prev.current = new Map(next.map((r) => [r.id, r.status]));
          if (!stop) {
            setRows(next);
            setUpdated(Date.now());
            setLive("ok");
            if (changed.size) {
              setFlash(changed);
              setTimeout(() => setFlash(new Set()), 2500);
            }
          }
        } catch {
          if (!stop) setLive("err");
        }
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    const onVis = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (kind === "all" || r.treeKind === kind) &&
      (!needle ||
        r.treeName.toLowerCase().includes(needle) ||
        r.phone.includes(needle) ||
        r.id.includes(needle) ||
        (r.qpayId ?? "").toLowerCase().includes(needle) ||
        (r.from ?? "").toLowerCase().includes(needle)),
  );
  const paid = rows.filter((r) => r.status === "paid");
  const paidSum = paid.reduce((s, r) => s + r.amount, 0);
  const pendingCount = rows.length - paid.length;

  return (
    <>
      <div className="admin-stats">
        <div><small>Нэхэмжлэх</small><b>{rows.length}</b></div>
        <div><small>Төлөгдсөн / Хүлээгдэж буй</small><b>{paid.length} / {pendingCount}</b></div>
        <div><small>Төлөгдсөн дүн</small><b>{formatMnt(paidSum)}</b></div>
      </div>

      <div className="admin-search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Гацуур, утас, илгээгч, invoice id…" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">Бүгд</option>
          <option value="pending">Хүлээгдэж буй</option>
          <option value="paid">Төлөгдсөн</option>
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
          <option value="all">Бүх гацуур</option>
          <option value="free">🎄 Энгийн (бэлэг)</option>
          <option value="money">💰 Мөнгөтэй (мөнгө)</option>
        </select>
      </div>

      <p className={`live live-${live}`}>
        <i />
        {live === "ok" ? "Live" : live === "paused" ? "Түр зогссон (таб идэвхгүй)" : "Холболт тасарсан — дахин оролдож байна"}
        <span className="muted"> · {fmtDate(updated)}</span>
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Огноо</th>
              <th>Төлөв</th>
              <th>Гацуур төрөл</th>
              <th>Төрөл</th>
              <th>Гацуур</th>
              <th>Утас</th>
              <th>Илгээгч</th>
              <th className="num">Дүн</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={flash.has(r.id) ? "flash" : undefined}>
                <td className="muted">{fmtDate(r.createdAt)}</td>
                <td>
                  <span className={`badge ${r.status}`}>{r.status === "paid" ? "Төлөгдсөн" : "Хүлээгдэж буй"}</span>
                  {r.paidAt && <div className="muted small">{fmtDate(r.paidAt)}</div>}
                </td>
                <td><span className={`badge ${r.treeKind === "money" ? "money" : "free"}`}>{r.treeKind === "money" ? "💰 Мөнгөтэй" : "🎄 Энгийн"}</span></td>
                <td>{r.item}</td>
                <td><a href={`/t/${r.treeId}`} target="_blank" rel="noreferrer">{r.treeName}</a></td>
                <td className="mono">{r.phone}</td>
                <td>{r.from ?? <span className="muted">—</span>}</td>
                <td className="num"><b>{formatMnt(r.amount)}</b></td>
                <td className="mono small">
                  {r.id}
                  {r.qpayId && <div className="muted">{r.qpayId}</div>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={9} className="muted" style={{ textAlign: "center", padding: 24 }}>Нэхэмжлэх алга</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
