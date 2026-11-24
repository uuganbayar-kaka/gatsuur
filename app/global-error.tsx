"use client";
import { useEffect } from "react";
import { reportError } from "@/components/ErrorReporter";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError("global", error), [error]);
  return (
    <html lang="mn">
      <body style={{ fontFamily: "system-ui", background: "#7a0a10", color: "#fff", textAlign: "center", paddingTop: "30vh" }}>
        <h2>Алдаа гарлаа</h2>
        <button onClick={reset} style={{ padding: "12px 20px", borderRadius: 99 }}>Дахин оролдох</button>
      </body>
    </html>
  );
}
