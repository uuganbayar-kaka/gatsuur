"use client";
import type { OrnamentId, TemplateId } from "@/lib/config";
import { OrnamentDefs, OrnamentShape } from "./Ornament";

type GiftLite = { id: string; ornament: OrnamentId; from: string };

type Theme = {
  top: string;
  bottom: string;
  snow: number;
  paper?: boolean;
  lights?: boolean;
  trunk: string;
};

const THEMES: Record<TemplateId, Theme> = {
  lush: { top: "#3F9663", bottom: "#1F5C3C", snow: 0.55, trunk: "#6B4226" },
  paper: { top: "#8CC79A", bottom: "#5E9C70", snow: 0, paper: true, trunk: "#A0714A" },
  lights: { top: "#2A5E48", bottom: "#123526", snow: 0.25, lights: true, trunk: "#4A2F1C" },
  snowy: { top: "#3D8F7E", bottom: "#17665A", snow: 0.95, trunk: "#5A3A24" },
};

const T = 62;
const TOP = 70;
const ORN_SCALE = 0.8;
const ORN_R = 13 * ORN_SCALE; // чимэглэлийн радиус (~)

/** Мөчрийн муруй (cx,yA) → (cx+hw,yB) дээрх y өндөр дэх хагас өргөн. */
function halfAt(t: { yA: number; yB: number; hw: number }, y: number) {
  const cy = t.yA + (t.yB - t.yA) * 0.62;
  // y(s) = (1-s)²yA + 2(1-s)s·cy + s²yB — s-г хоёртын хайлтаар олно
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const s = (lo + hi) / 2;
    const ys = (1 - s) ** 2 * t.yA + 2 * (1 - s) * s * cy + s * s * t.yB;
    if (ys < y) lo = s;
    else hi = s;
  }
  const s = (lo + hi) / 2;
  return 2 * (1 - s) * s * t.hw * 0.35 + s * s * t.hw;
}

export type Slot = { x: number; y: number; hookY: number; tier: number };

/** Мөр бүрт r+2 байрлал; нийт n болтол мөр нэмнэ. Чимэглэл мөчрийн харагдах хэсэгт багтаж, дээд мөчрөөс унжина. */
export function layoutTree(n: number) {
  let rows = 3;
  const sum = (R: number) => (R * (R + 3)) / 2;
  while (sum(rows) < n) rows++;
  const hw = (r: number) => 44 + r * 30;
  const W = 2 * hw(rows - 1) + 48;
  const cx = W / 2;
  const tiers = Array.from({ length: rows }, (_, r) => ({
    yA: TOP + r * T * 0.78 - (r ? 6 : 0),
    yB: TOP + (r + 1) * T * 0.78 + T * 0.45,
    hw: hw(r),
  }));
  // Мөр бүрт өргөнтэй нь пропорциональ тоо (доод мөчирт ганц нэг үлдэхгүй)
  const counts = tiers.map((_, r) => Math.max(1, Math.floor(((r + 2) * n) / sum(rows))));
  for (let r = rows - 1, extra = n - counts.reduce((a, b) => a + b, 0); extra > 0; r = r ? r - 1 : rows - 1, extra--) counts[r]++;
  const slots: Slot[] = [];
  tiers.forEach((t, r) => {
    const c = counts[r];
    // Харагдах зурвас: дээд мөчрийн цасан ирмэгээс доош, өөрийн ирмэгээс дээш
    const bandTop = r ? tiers[r - 1].yB + 6 : t.yA + (t.yB - t.yA) * 0.48;
    const bandBot = t.yB - 6;
    const mid = (bandTop + bandBot) / 2;
    const wobble = Math.max(0, (bandBot - bandTop) / 2 - ORN_R - 1);
    for (let i = 0; i < c; i++) {
      const y = mid + (i % 2 ? -wobble : wobble) * (c > 1 ? 1 : 0);
      const span = Math.max(0, halfAt(t, y + ORN_R) - ORN_R - 9);
      const x = c === 1 ? cx : cx - span + (2 * span * i) / (c - 1);
      slots.push({ x, y, hookY: bandTop - 7, tier: r });
    }
  });
  const H = tiers[rows - 1].yB + 56;
  // Дүүргэх дараалал: дээрээс доош биш, бүх мөчрөөр тархаж дүүрнэ (алтан огтлолын алхам)
  const order = slots.map((_, i) => i).sort((a, b) => ((a * 0.618034) % 1) - ((b * 0.618034) % 1));
  return { W, H, cx, tiers, slots: order.map((i) => slots[i]) };
}

/** Мөчир дээгүүр хөндлөн унжих сувдан гирлянд (мөр бүрт чиглэл ээлжилнэ). */
function garlandPath(cx: number, t: { yA: number; yB: number; hw: number }, top: number, flip: boolean) {
  const yl = flip ? t.yB - 9 : top + 2;
  const yr = flip ? top + 2 : t.yB - 9;
  const xl = cx - halfAt(t, yl) + 5;
  const xr = cx + halfAt(t, yr) - 5;
  return `M${xl} ${yl} Q${cx} ${(yl + yr) / 2 + 16} ${xr} ${yr}`;
}

const hash = (s: string) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
};

function tierPath(cx: number, yA: number, yB: number, hw: number, bumps: number) {
  let d = `M${cx} ${yA} Q${cx + hw * 0.35} ${yA + (yB - yA) * 0.62} ${cx + hw} ${yB}`;
  const step = (2 * hw) / bumps;
  for (let i = 0; i < bumps; i++) {
    const x1 = cx + hw - step * (i + 1);
    d += ` Q${x1 + step / 2} ${yB + 9} ${x1} ${yB}`;
  }
  d += ` Q${cx - hw * 0.35} ${yA + (yB - yA) * 0.62} ${cx} ${yA}Z`;
  return d;
}

const LIGHT_COLORS = ["#FFD36B", "#FF7A8A", "#7FE3C4", "#9FC2FF", "#C59BFF"];

export default function TreeArt({
  template,
  capacity,
  gifts,
  onPick,
  showEmpty = true,
}: {
  template: TemplateId;
  capacity: number;
  gifts: GiftLite[];
  onPick?: (g: GiftLite) => void;
  showEmpty?: boolean;
}) {
  const th = THEMES[template] ?? THEMES.lush;
  const { W, H, cx, tiers, slots } = layoutTree(Math.max(capacity, gifts.length));
  const last = tiers[tiers.length - 1];
  const gid = `tg-${template}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-art" role="img" aria-label={`Гацуур, ${gifts.length} чимэглэлтэй`}>
      <OrnamentDefs />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.top} />
          <stop offset="1" stopColor={th.bottom} />
        </linearGradient>
        <radialGradient id="tree-glow">
          <stop offset="0" stopColor="#FFD98A" stopOpacity=".35" />
          <stop offset="1" stopColor="#FFD98A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={H * 0.5} rx={W * 0.55} ry={H * 0.5} fill="url(#tree-glow)" />
      <ellipse cx={cx} cy={last.yB + 40} rx={last.hw + 20} ry="12" fill="#fff" opacity=".85" />
      <rect x={cx - 13} y={last.yB - 4} width="26" height="40" rx="4" fill={th.trunk} />

      {[...tiers].reverse().map((t, ri) => {
        const r = tiers.length - 1 - ri;
        const bumps = 4 + r;
        const d = tierPath(cx, t.yA, t.yB, t.hw, bumps);
        const step = (2 * t.hw) / bumps;
        return (
          <g key={r}>
            {th.paper && <path d={d} fill="#000" opacity=".18" transform="translate(3 4)" />}
            <path d={d} fill={th.paper ? (r % 2 ? th.bottom : th.top) : `url(#${gid})`} />
            {th.paper && (
              <path
                d={tierPath(cx, t.yA + 10, t.yB - 5, t.hw - 10, bumps)}
                fill="none"
                stroke="#fff"
                strokeOpacity=".6"
                strokeWidth="1.3"
                strokeDasharray="4 4"
              />
            )}
            {th.snow > 0 &&
              Array.from({ length: bumps }, (_, i) => (
                <ellipse
                  key={i}
                  cx={cx + t.hw - step * (i + 0.5)}
                  cy={t.yB + 4}
                  rx={step * 0.36}
                  ry="3.2"
                  fill="#fff"
                  opacity={th.snow}
                />
              ))}
            {th.lights &&
              Array.from({ length: bumps + 1 }, (_, i) => {
                const f = i / bumps;
                const x = cx - t.hw * 0.85 + t.hw * 1.7 * f;
                const y = t.yB - 26 + f * 16;
                return (
                  <g key={`l${i}`}>
                    <circle cx={x} cy={y} r="7" fill={LIGHT_COLORS[(i + r) % 5]} opacity=".25" className="twinkle" style={{ animationDelay: `${(i * 0.37 + r * 0.2) % 2.8}s` }} />
                    <circle cx={x} cy={y} r="2.6" fill={LIGHT_COLORS[(i + r) % 5]} />
                  </g>
                );
              })}
            {th.lights && (
              <path
                d={`M${cx - t.hw * 0.85} ${t.yB - 26} Q${cx} ${t.yB - 10} ${cx + t.hw * 0.85} ${t.yB - 10}`}
                stroke="#0b1f16"
                strokeWidth=".8"
                fill="none"
                opacity=".6"
              />
            )}
          </g>
        );
      })}

      {!th.lights &&
        tiers.map((t, r) => (
          <path
            key={`gl${r}`}
            d={garlandPath(cx, t, r ? tiers[r - 1].yB + 4 : t.yA + (t.yB - t.yA) * 0.4, r % 2 === 1)}
            className="garland"
            stroke={th.paper ? "#fff" : "#F2C14E"}
            strokeOpacity={th.paper ? 0.75 : 0.9}
          />
        ))}

      <g transform={`translate(${cx} ${TOP - 8})`}>
        <circle r="26" fill="url(#o-halo)" className="twinkle" />
        <OrnamentShape id="star" />
      </g>

      {slots.map((s, i) => {
        const g = gifts[i];
        const len = s.y - ORN_R - 4 - s.hookY;
        if (!g)
          return showEmpty ? (
            <g key={`e${i}`} className="slot" transform={`translate(${s.x} ${s.y})`}>
              <circle r={ORN_R - 2} fill="#fff" fillOpacity=".1" stroke="#fff" strokeOpacity=".45" strokeDasharray="2 2.5" />
              <path d="M-2.5 -1 L2.5 -1 M0 -3.5 L0 1.5" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
            </g>
          ) : null;
        const h = hash(g.id);
        return (
          <g key={g.id} transform={`translate(${s.x} ${s.hookY})`}>
            <g className="drop" style={{ animationDelay: `${Math.min(i, 24) * 0.07}s` }}>
              <g
                className="swing"
                style={{ animationDuration: `${3.4 + (h % 15) / 10}s`, animationDelay: `-${(h % 37) / 10}s` }}
                onClick={onPick ? () => onPick(g) : undefined}
                role={onPick ? "button" : undefined}
                aria-label={onPick ? `${g.from}-ийн бэлэг` : undefined}
              >
                <circle cy="0" r="1.6" fill="#E2B34A" />
                <line y1="0" y2={len} stroke="#F2E2B0" strokeWidth=".8" />
                <g transform={`translate(0 ${len + ORN_R + 4}) scale(${ORN_SCALE})`}>
                  <g className="orn-body">
                    <OrnamentShape id={g.ornament} />
                    <path
                      className="glint"
                      style={{ animationDelay: `${(h % 50) / 10}s` }}
                      d="M7 -12 L8 -9 L11 -8 L8 -7 L7 -4 L6 -7 L3 -8 L6 -9Z"
                      fill="#fff"
                    />
                  </g>
                </g>
                {/* Дарах талбайг томруулна */}
                <circle cy={len + ORN_R + 4} r={ORN_R + 6} fill="transparent" />
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
