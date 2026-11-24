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

const T = 56;
const TOP = 70;

/** Мөр бүрт r+2 байрлал; нийт n болтол мөр нэмнэ. */
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
  const slots: { x: number; y: number }[] = [];
  let left = n;
  tiers.forEach((t, r) => {
    const c = r === rows - 1 ? left : Math.min(left, r + 2);
    left -= c;
    const span = t.hw * 0.72;
    for (let i = 0; i < c; i++) {
      const x = c === 1 ? cx : cx - span + (2 * span * i) / (c - 1);
      const edge = 1 - Math.abs(x - cx) / t.hw;
      slots.push({ x, y: t.yB - 18 - (i % 2) * 7 - (1 - edge) * 6 });
    }
  });
  const H = tiers[rows - 1].yB + 56;
  return { W, H, cx, tiers, slots };
}

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

      <g transform={`translate(${cx} ${TOP - 8})`}>
        <circle r="26" fill="url(#o-halo)" className="twinkle" />
        <OrnamentShape id="star" />
      </g>

      {slots.map((s, i) => {
        const g = gifts[i];
        if (!g)
          return showEmpty ? (
            <circle key={`e${i}`} cx={s.x} cy={s.y} r="6" fill="#fff" fillOpacity=".12" stroke="#fff" strokeOpacity=".4" strokeDasharray="2 2.5" />
          ) : null;
        return (
          <g
            key={g.id}
            transform={`translate(${s.x} ${s.y})`}
            onClick={onPick ? () => onPick(g) : undefined}
            style={{ cursor: onPick ? "pointer" : undefined }}
          >
            <line y1="-24" y2="-14" stroke="#F2E2B0" strokeWidth=".8" />
            <g className="orn" style={{ animationDelay: `${Math.min(i, 20) * 0.04}s` }}>
              <OrnamentShape id={g.ornament} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
