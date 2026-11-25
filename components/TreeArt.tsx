"use client";
import { ORNAMENTS, PREMIUM_PRICE, type OrnamentId, type TemplateId } from "@/lib/config";
import { OrnamentDefs, OrnamentShape } from "./Ornament";

type GiftLite = { id: string; ornament: OrnamentId; from: string };

type Theme = {
  top: string;
  bottom: string;
  snow: number;
  paper?: boolean;
  lights?: boolean;
  trunk: string;
  /** Мөнгөтэй гацуурын загвар: гэрлийн утас (өнгөнүүд), гялалзах оч, гэрэлтэх од */
  festive?: { bulbs: string[]; wire: string; glow: string; cycle?: boolean };
};

const THEMES: Record<TemplateId, Theme> = {
  lush: { top: "#3F9663", bottom: "#1F5C3C", snow: 0.55, trunk: "#6B4226" },
  paper: { top: "#8CC79A", bottom: "#5E9C70", snow: 0, paper: true, trunk: "#A0714A" },
  lights: { top: "#2A5E48", bottom: "#123526", snow: 0.25, lights: true, trunk: "#4A2F1C" },
  snowy: { top: "#3D8F7E", bottom: "#17665A", snow: 0.95, trunk: "#5A3A24" },
  gold: { top: "#2F8A57", bottom: "#134A2C", snow: 0.3, trunk: "#5A3A24", festive: { bulbs: ["#FFD36B", "#FFE9A8", "#FFB547"], wire: "#3a2a10", glow: "#FFD98A" } },
  royal: { top: "#1E7A63", bottom: "#0A3A30", snow: 0.2, trunk: "#4A2F1C", festive: { bulbs: ["#C59BFF", "#FFD36B", "#FF7AD9", "#9FC2FF"], wire: "#1b1030", glow: "#E0B8FF" } },
  aurora: { top: "#1F8A7A", bottom: "#0B4A52", snow: 0.4, trunk: "#4A2F1C", festive: { bulbs: ["#7FE3C4", "#9FC2FF", "#FF7A8A", "#FFD36B", "#C59BFF"], wire: "#06262a", glow: "#8FF5DA", cycle: true } },
  crystal: { top: "#4FA3B8", bottom: "#1F5C73", snow: 0.95, trunk: "#4F3A2A", festive: { bulbs: ["#FFFFFF", "#BFE6FF", "#8FD3FF"], wire: "#16384a", glow: "#CFF3FF" } },
};

const TOP = 70;
const ORN_SCALE = 0.85;
const ORN_R = 13 * ORN_SCALE; // чимэглэлийн радиус (~)
const SPACING = 2 * ORN_R + 5; // хөрш чимэглэлийн хоорондох доод зай

type Tier = { yA: number; yB: number; hw: number };

/** Мөчрийн муруй (cx,yA) → (cx+hw,yB) дээрх y өндөр дэх хагас өргөн. */
function halfAt(t: Tier, y: number) {
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

/**
 * n чимэглэлд хангалттай мөчир үүсгэж, чимэглэл бүрийг мөчрийн харагдах хэсэгт багтаана.
 * 30-аас олон бол мөчир өндөр болж, мөчир бүрт 2 эгнээ (зигзаг) чимэглэл өлгөнө.
 */
export function layoutTree(n: number) {
  const dense = n > 30;
  const T = dense ? 88 : 64;
  const slope = 30 * (T / 62);
  const tierAt = (r: number): Tier => ({
    yA: TOP + r * T * 0.78 - (r ? 6 : 0),
    yB: TOP + (r + 1) * T * 0.78 + T * 0.45,
    hw: 44 + r * slope,
  });

  type Row = { y: number; half: number; cap: number; tier: number; hookY: number; sub: number; wobble: number };
  const tiers: Tier[] = [];
  const rows: Row[] = [];
  let total = 0;
  for (let r = 0; tiers.length < 3 || total < n; r++) {
    const t = tierAt(r);
    tiers.push(t);
    // Харагдах зурвас: дээд мөчрийн цасан ирмэгээс доош, өөрийн ирмэгээс дээш
    const bandTop = r ? tiers[r - 1].yB + 6 : t.yA + (t.yB - t.yA) * 0.48;
    const bandBot = t.yB - 6;
    const subs = dense && r >= 1 ? 2 : 1;
    for (let k = 0; k < subs; k++) {
      const y = subs === 1 ? (bandTop + bandBot) / 2 : k === 0 ? bandTop + ORN_R + 3 : bandBot - ORN_R - 1;
      const half = Math.max(0, halfAt(t, y + ORN_R) - ORN_R - 9);
      const cap = Math.max(1, Math.floor((2 * half) / SPACING) + (k === 0 ? 1 : 0));
      const wobble = subs === 1 ? Math.max(0, (bandBot - bandTop) / 2 - ORN_R - 1) : 0;
      rows.push({ y, half, cap, tier: r, hookY: k === 0 ? bandTop - 7 : y - ORN_R - 12, sub: k, wobble });
      total += cap;
    }
  }

  // Эгнээ бүрт багтаамжтай нь пропорциональ тоо (хэтрүүлэхгүй)
  // Эгнээ бүрт дор хаяж 1 (орой мөчир хоосон үлдэхгүй), үлдсэнийг багтаамжтай нь пропорциональ хуваана
  const base = n >= rows.length ? 1 : 0;
  const spare = rows.reduce((a, r) => a + r.cap - base, 0) || 1;
  const counts = rows.map((r) => base + Math.min(r.cap - base, Math.floor(((n - base * rows.length) * (r.cap - base)) / spare)));
  for (let left = n - counts.reduce((a, b) => a + b, 0); left > 0; ) {
    for (let i = rows.length - 1; i >= 0 && left > 0; i--) {
      if (counts[i] < rows[i].cap) {
        counts[i]++;
        left--;
      }
    }
  }

  const slots: Slot[] = [];
  rows.forEach((row, ri) => {
    const c = counts[ri];
    for (let i = 0; i < c; i++) {
      // 1-р эгнээ ирмэгээс ирмэг хүртэл, 2-р эгнээ завсраар нь (зигзаг)
      const f = row.sub === 0 ? (c === 1 ? 0.5 : i / (c - 1)) : (i + 0.5) / c;
      const x = -row.half + 2 * row.half * f; // төвөөс хойших зай (мөчрийн тоо эцэст нь л тодорхой)
      const y = row.y + (c > 1 ? (i % 2 ? -row.wobble : row.wobble) : 0);
      slots.push({ x, y, hookY: row.hookY, tier: row.tier });
    }
  });

  const last = tiers[tiers.length - 1];
  const W = 2 * last.hw + 48;
  const cx = W / 2;
  const H = last.yB + 56;
  for (const sl of slots) sl.x += cx;
  // Дүүргэх дараалал: дээрээс доош биш, бүх мөчрөөр тархаж дүүрнэ (алтан огтлолын алхам)
  const order = slots.map((_, i) => i).sort((a, b) => ((a * 0.618034) % 1) - ((b * 0.618034) % 1));
  return { W, H, cx, tiers, slots: order.map((i) => slots[i]) };
}

/** Мөчир дээгүүр хөндлөн унжих сувдан гирлянд (мөр бүрт чиглэл ээлжилнэ). */
function garlandPath(cx: number, t: Tier, top: number, flip: boolean) {
  const yl = flip ? t.yB - 9 : top + 2;
  const yr = flip ? top + 2 : t.yB - 9;
  const xl = cx - halfAt(t, yl) + 5;
  const xr = cx + halfAt(t, yr) - 5;
  return `M${xl} ${yl} Q${cx} ${(yl + yr) / 2 + 16} ${xr} ${yr}`;
}

const PREMIUM = new Set(ORNAMENTS.filter((o) => o.price >= PREMIUM_PRICE).map((o) => o.id));

/** 10,000₮-ийн чимэглэлийн нэмэлт эффект: судалтай гэрэл, эргэлдэх од, долгион. */
function PremiumFx({ seed }: { seed: number }) {
  const delay = `${(seed % 30) / 10}s`;
  return (
    <g pointerEvents="none">
      <circle r="24" fill="url(#o-aura)" className="aura" style={{ animationDelay: delay }} />
      <circle r="15" fill="none" stroke="#FFE7A0" strokeWidth="1.4" className="ripple" style={{ animationDelay: delay }} />
      <g className="orbit" style={{ animationDelay: `-${delay}` }}>
        {/* bbox-г төвд нь тэгшлэх үл үзэгдэх тойрог (эргэлтийн төв = чимэглэлийн төв) */}
        <circle r="25" fill="none" />
        {[0, 120, 240].map((a, i) => (
          <path
            key={a}
            transform={`rotate(${a}) translate(0 -21) scale(${i ? 0.7 : 1})`}
            d="M0 -3.5 L.9 -.9 L3.5 0 L.9 .9 L0 3.5 L-.9 .9 L-3.5 0 L-.9 -.9Z"
            fill="#FFF6D0"
          />
        ))}
      </g>
    </g>
  );
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
  zoom = false,
  topperId,
}: {
  template: TemplateId;
  capacity: number;
  gifts: GiftLite[];
  onPick?: (g: GiftLite) => void;
  showEmpty?: boolean;
  /** Том гацуурт чимэглэл хэт жижгэрэхгүй байх доод өргөн (эцэг элемент хажуу тийш гүйлгэнэ) */
  zoom?: boolean;
  /** Оройд байрлах 20,000₮-ийн онцгой чимэглэлийн gift id */
  topperId?: string | null;
}) {
  const topper = topperId ? gifts.find((g) => g.id === topperId) : undefined;
  if (topper) gifts = gifts.filter((g) => g !== topper);
  const th = THEMES[template] ?? THEMES.lush;
  const { W, H, cx, tiers, slots } = layoutTree(Math.max(capacity, gifts.length));
  const last = tiers[tiers.length - 1];
  const gid = `tg-${template}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tree-art" style={zoom ? { minWidth: Math.round(W * 0.72) } : undefined} role="img" aria-label={`Гацуур, ${gifts.length} чимэглэлтэй`}>
      <OrnamentDefs />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={th.top} />
          <stop offset="1" stopColor={th.bottom} />
        </linearGradient>
        {th.festive && (
          <radialGradient id={`sg-${template}`}>
            <stop offset="0" stopColor={th.festive.glow} stopOpacity=".75" />
            <stop offset=".45" stopColor={th.festive.glow} stopOpacity=".25" />
            <stop offset="1" stopColor={th.festive.glow} stopOpacity="0" />
          </radialGradient>
        )}
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

      {th.festive &&
        tiers.map((t, r) => {
          // Мөчир бүрт унжсан гэрлийн утас: муруй дагуу чийдэнгүүд ээлжлэн анивчина
          const fx = th.festive!;
          const top = r ? tiers[r - 1].yB + 2 : t.yA + (t.yB - t.yA) * 0.45;
          const y1 = top + 3;
          const y2 = t.yB - 7;
          const x1 = cx - halfAt(t, y1) + 4;
          const x2 = cx + halfAt(t, y2) - 4;
          const [ax, ay, bx, by] = r % 2 ? [x2, y1, x1, y2] : [x1, y1, x2, y2];
          const qx = cx;
          const qy = (ay + by) / 2 + 18;
          const n = Math.max(5, Math.round(Math.abs(bx - ax) / 18));
          return (
            <g key={`fl${r}`}>
              <path d={`M${ax} ${ay} Q${qx} ${qy} ${bx} ${by}`} stroke={fx.wire} strokeWidth="1" fill="none" opacity=".7" />
              {Array.from({ length: n + 1 }, (_, i) => {
                const u = i / n;
                const x = (1 - u) ** 2 * ax + 2 * (1 - u) * u * qx + u * u * bx;
                const y = (1 - u) ** 2 * ay + 2 * (1 - u) * u * qy + u * u * by;
                const c = fx.bulbs[(i + r) % fx.bulbs.length];
                const delay = `${((i * 0.23 + r * 0.41) % 1.8).toFixed(2)}s`;
                return (
                  <g key={i} transform={`translate(${x} ${y + 3})`} className={fx.cycle ? "bulb cycle" : "bulb"} style={{ animationDelay: delay, color: c }}>
                    <circle r="8" fill="currentColor" opacity=".35" className="bulb-glow" />
                    <rect x="-1.4" y="-4.6" width="2.8" height="2.2" rx=".6" fill="#3a3a3a" />
                    <ellipse ry="3.4" rx="2.5" fill="currentColor" />
                    <ellipse cx="-.8" cy="-1" rx=".7" ry="1.1" fill="#fff" opacity=".7" />
                  </g>
                );
              })}
            </g>
          );
        })}

      {th.festive &&
        // Мөчир дээгүүр гялалзах оч
        Array.from({ length: Math.min(28, 6 + tiers.length * 4) }, (_, i) => {
          const t = tiers[i % tiers.length];
          const u = ((i * 0.618034) % 1) * 2 - 1;
          const y = t.yA + (t.yB - t.yA) * (0.45 + ((i * 0.37) % 1) * 0.45);
          const x = cx + u * Math.max(0, halfAt(t, y) - 8);
          return (
            <path
              key={`sp${i}`}
              className="spark"
              style={{ animationDelay: `${((i * 0.53) % 3).toFixed(2)}s` }}
              transform={`translate(${x} ${y}) scale(${0.6 + ((i * 0.29) % 1) * 0.6})`}
              d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1Z"
              fill="#fff"
            />
          );
        })}

      {!th.lights && !th.festive &&
        tiers.map((t, r) => (
          <path
            key={`gl${r}`}
            d={garlandPath(cx, t, r ? tiers[r - 1].yB + 4 : t.yA + (t.yB - t.yA) * 0.4, r % 2 === 1)}
            className="garland"
            stroke={th.paper ? "#fff" : "#F2C14E"}
            strokeOpacity={th.paper ? 0.75 : 0.9}
          />
        ))}

      {topper ? (
        <g transform={`translate(${cx} ${TOP - 14})`}>
          <g
            className="topper"
            onClick={onPick ? () => onPick(topper) : undefined}
            role={onPick ? "button" : undefined}
            aria-label={onPick ? `${topper.from}-ийн оройн чимэглэл` : undefined}
          >
            <circle r="46" fill="url(#o-aura)" className="halo" />
            <g className="sparkle-ring">
              {Array.from({ length: 8 }, (_, i) => (
                <circle key={i} r={i % 2 ? 1.4 : 2.2} cx={Math.cos((i * Math.PI) / 4) * 36} cy={Math.sin((i * Math.PI) / 4) * 36} fill="#FFF3C4" className="twinkle" style={{ animationDelay: `${i * 0.3}s` }} />
              ))}
            </g>
            <g transform="scale(1.55)">
              <OrnamentShape id="topper" />
            </g>
          </g>
        </g>
      ) : th.festive ? (
        // Мөнгөтэй гацуурын гэрэлтэж анивчих оройн од
        <g transform={`translate(${cx} ${TOP - 12})`}>
          <circle r="56" fill={`url(#sg-${template})`} className="star-pulse" />
          <circle r="30" fill="url(#o-aura)" className="halo" />
          <g className="sparkle-ring">
            {Array.from({ length: 6 }, (_, i) => (
              <circle key={i} r={i % 2 ? 1.3 : 2} cx={Math.cos((i * Math.PI) / 3) * 30} cy={Math.sin((i * Math.PI) / 3) * 30} fill="#FFF3C4" className="twinkle" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
          </g>
          <g transform="scale(1.3)">
            <OrnamentShape id="topper" />
          </g>
        </g>
      ) : (
        <g transform={`translate(${cx} ${TOP - 8})`}>
          <circle r="26" fill="url(#o-halo)" className="twinkle" />
          <OrnamentShape id="star" />
        </g>
      )}

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
                    {PREMIUM.has(g.ornament) && <PremiumFx seed={h} />}
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
