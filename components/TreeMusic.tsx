"use client";
import { useEffect, useRef, useState } from "react";
import type { MelodyId } from "@/lib/config";
import { MELODIES, melodyLength, midiHz } from "@/lib/melodies";

const PREF_KEY = "music:on";

/** Хөгжмийн хайрцаг/хонхны дуу: үндсэн давтамж + 2 обертон, хурдан эхэлж аажмаар унтарна. */
function bell(ctx: AudioContext, out: AudioNode, hz: number, at: number, dur: number, vol: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, at + Math.max(0.6, dur * 1.6));
  g.connect(out);
  for (const [mult, v, type] of [[1, 1, "sine"], [2, 0.35, "sine"], [3, 0.12, "triangle"]] as const) {
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = type;
    o.frequency.value = hz * mult;
    og.gain.value = v;
    o.connect(og).connect(g);
    o.start(at);
    o.stop(at + Math.max(0.7, dur * 1.7));
  }
}

/**
 * Мөнгөтэй гацуурын арын хөгжим. Хөтөч дуу автоматаар тоглуулахыг хориглодог тул
 * хэрэглэгч товч дарах (эсвэл өмнө нь асаасан бол хуудсан дээр анх хүрэх) үед эхэлнэ.
 */
export default function TreeMusic({ melody, song }: { melody: MelodyId; song: string }) {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const master = useRef<GainNode | null>(null);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    master.current?.gain.setTargetAtTime(0, ctxRef.current!.currentTime, 0.15);
    const old = master.current;
    setTimeout(() => old?.disconnect(), 600);
    master.current = null;
  }

  function start() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (ctxRef.current ??= new AC());
    void ctx.resume();
    const m = MELODIES[melody];
    const beat = 60 / m.bpm;
    const out = ctx.createGain();
    out.gain.value = 0.22;
    out.connect(ctx.destination);
    master.current = out;

    // Нэг давталтыг урьдчилан төлөвлөөд, дуусахын өмнө дараагийнхыг төлөвлөнө
    const loop = (t0: number) => {
      if (master.current !== out) return;
      let t = t0;
      for (const [n, d] of m.notes) {
        if (n) bell(ctx, out, midiHz(n), t, d * beat, 0.5);
        t += d * beat;
      }
      t = t0;
      for (const [n, d] of m.bass) {
        bell(ctx, out, midiHz(n), t, d * beat, 0.18);
        t += d * beat;
      }
      const len = melodyLength(m) * beat;
      timer.current = setTimeout(() => loop(t0 + len), Math.max(0, (t0 + len - ctx.currentTime - 1) * 1000));
    };
    loop(ctx.currentTime + 0.1);
  }

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(PREF_KEY, next ? "1" : "0");
    } catch {
      /* хадгалах боломжгүй байж болно */
    }
    if (next) start();
    else stop();
  }

  // Загвар (аялгуу) солигдвол дахин эхлүүлнэ
  useEffect(() => {
    if (!on) return;
    stop();
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [melody]);

  // Өмнө нь асаасан бол хуудсан дээр анх хүрэхэд автоматаар эхэлнэ
  useEffect(() => {
    let pref = "1";
    try {
      pref = localStorage.getItem(PREF_KEY) ?? "1";
    } catch {
      /* */
    }
    if (pref !== "1") return;
    const first = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.(".music-btn")) return;
      setOn(true);
      start();
    };
    window.addEventListener("pointerdown", first, { once: true });
    return () => window.removeEventListener("pointerdown", first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    void ctxRef.current?.close();
  }, []);

  return (
    <button className={`music-btn${on ? " on" : ""}`} onClick={toggle} aria-label={on ? "Хөгжим унтраах" : "Хөгжим асаах"}>
      <span className="music-ico">{on ? "🔊" : "🔇"}</span>
      <span className="music-name">{on ? `♪ ${song}` : "Хөгжим"}</span>
    </button>
  );
}
