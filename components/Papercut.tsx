"use client";
import { useEffect, useRef } from "react";

/**
 * "Parallax Papercut Animation" загварыг арын зураг болгосон хувилбар.
 * GSAP-ийн оронд CSS animation, хулгана/скролл дагасан parallax нэмсэн.
 * depth: 0 = хол (бага хөдөлнө), 1 = ойр (их хөдөлнө)
 */
const LAYERS: { n: number; depth: number; anim: string; delay: number }[] = [
  { n: 1, depth: 0.25, anim: "pc-left", delay: 1.8 },
  { n: 2, depth: 0.25, anim: "pc-left", delay: 1.6 },
  { n: 3, depth: 0.25, anim: "pc-left", delay: 1.4 },
  { n: 4, depth: 0.45, anim: "pc-bounce", delay: 2.2 },
  { n: 5, depth: 0.45, anim: "pc-bounce", delay: 0.9 },
  { n: 6, depth: 0.3, anim: "pc-right", delay: 1.6 },
  { n: 7, depth: 0.45, anim: "pc-bounce", delay: 2.0 },
  { n: 8, depth: 0.45, anim: "pc-bounce", delay: 1.1 },
  { n: 9, depth: 0.3, anim: "pc-right", delay: 1.8 },
  { n: 10, depth: 0.6, anim: "pc-up", delay: 0.7 },
  { n: 11, depth: 1, anim: "pc-up", delay: 0.05 },
  { n: 12, depth: 0.75, anim: "pc-up", delay: 2.4 },
  { n: 13, depth: 0.75, anim: "pc-up", delay: 2.4 },
  { n: 14, depth: 0.9, anim: "pc-up", delay: 0.25 },
  { n: 15, depth: 0.95, anim: "pc-up", delay: 0.4 },
  { n: 16, depth: 1, anim: "pc-up", delay: 0.5 },
];

/** hideCenter: гацуурын хуудсанд голын улаан гацуур (img-10) манай гацуурттай давхцахгүй байхаар нууна. */
export default function Papercut({ hideCenter = false }: { hideCenter?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let px = 0, py = 0, raf = 0;
    const apply = () => {
      raf = 0;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
      el.style.setProperty("--sy", String(Math.min(window.scrollY, 1200)));
    };
    const queue = () => (raf ||= requestAnimationFrame(apply));
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX / innerWidth - 0.5;
      py = e.clientY / innerHeight - 0.5;
      queue();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      px = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
      py = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 90));
      queue();
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", queue, { passive: true });
    addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("scroll", queue);
      removeEventListener("deviceorientation", onTilt);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="pc" ref={ref} aria-hidden>
      {/* eslint-disable @next/next/no-img-element */}
      <img src="/papercut/img-bg.svg" alt="" className="pc-bg" />
      <img src="/papercut/cloud-1.svg" alt="" className="pc-cloud-1" />
      <img src="/papercut/cloud-2.svg" alt="" className="pc-cloud-2" />
      <img src="/papercut/sled.svg" alt="" className="pc-sled" />
      <div className="pc-layers">
        {LAYERS.filter((l) => !(hideCenter && l.n === 10)).map((l) => (
          <div key={l.n} className="pc-layer" style={{ ["--d" as string]: l.depth }}>
            <img
              src={`/papercut/img-${l.n}.svg`}
              alt=""
              className={l.anim}
              style={{ animationDelay: `${l.delay}s` }}
              decoding="async"
            />
          </div>
        ))}
      </div>
      <div className="pc-shade" />
    </div>
  );
}
