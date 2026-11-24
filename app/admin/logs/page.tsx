import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin";
import { readLogs, type LogLevel } from "@/lib/log";

export const dynamic = "force-dynamic";
export const metadata = { title: "Лог", robots: { index: false } };

const COLORS: Record<LogLevel, string> = { error: "#ff8a8f", warn: "#ffd36b", info: "#9fc2ff" };

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  if (!(await getAdmin())) redirect("/admin/login");
  const { level } = await searchParams;
  const lv = (["error", "warn", "info"] as const).find((l) => l === level);
  const rows = await readLogs(500, lv);
  const q = (l?: string) => (l ? `?level=${l}` : "?");
  return (
    <main style={{ padding: 16, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, background: "#10131f", minHeight: "100dvh" }}>
      <h2 style={{ fontFamily: "var(--f-ui)", margin: "0 0 10px" }}><Link href="/admin">← Админ</Link> · Лог ({rows.length})</h2>
      <p style={{ display: "flex", gap: 12 }}>
        <a href={q()}>бүгд</a> <a href={q("error")}>error</a> <a href={q("warn")}>warn</a> <a href={q("info")}>info</a>
      </p>
      {rows.map((r, i) => (
        <details key={i} style={{ borderBottom: "1px solid #ffffff1a", padding: "6px 0" }}>
          <summary style={{ cursor: "pointer" }}>
            <span style={{ opacity: 0.6 }}>{new Date(r.t).toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}</span>{" "}
            <b style={{ color: COLORS[r.level] }}>{r.level.toUpperCase()}</b> {r.event} {r.msg && <span style={{ opacity: 0.8 }}>— {r.msg}</span>}
          </summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", opacity: 0.85 }}>{JSON.stringify({ data: r.data, stack: r.stack }, null, 2)}</pre>
        </details>
      ))}
    </main>
  );
}
