"use client";
import { useEffect } from "react";

export function reportError(kind: string, e: { message?: string; stack?: string; digest?: string }) {
  try {
    const body = JSON.stringify({ kind, message: e.message, stack: e.stack, digest: e.digest, url: location.href });
    if (!navigator.sendBeacon?.("/api/log", new Blob([body], { type: "application/json" })))
      fetch("/api/log", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    /* ignore */
  }
}

/** Хөтөч дээрх барьж аваагүй алдааг сервер рүү илгээнэ. */
export default function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const onErr = (ev: ErrorEvent) => {
      if (sent++ < 5) reportError("onerror", { message: ev.message, stack: ev.error?.stack });
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const r = ev.reason;
      if (sent++ < 5) reportError("unhandledrejection", { message: r?.message ?? String(r), stack: r?.stack });
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);
  return null;
}
