"use client";
import { useEffect } from "react";
import { reportError } from "@/components/ErrorReporter";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError("boundary", error), [error]);
  return (
    <main className="page">
      <header className="head" style={{ marginTop: "20vh" }}>
        <div className="title">Уучлаарай 🎄</div>
        <div className="sub">Алдаа гарлаа. Бид бүртгэж авлаа.</div>
      </header>
      <div className="actions">
        <button className="btn primary" onClick={reset}>Дахин оролдох</button>
      </div>
    </main>
  );
}
