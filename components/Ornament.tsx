import type { OrnamentId } from "@/lib/config";

/** Бүх SVG-д нэг удаа оруулах градиентууд. */
export function OrnamentDefs() {
  return (
    <defs>
      <radialGradient id="o-red" cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#FF8A8F" />
        <stop offset=".55" stopColor="#D63A4A" />
        <stop offset="1" stopColor="#8E1F2E" />
      </radialGradient>
      <radialGradient id="o-gold" cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#FFF1B8" />
        <stop offset=".5" stopColor="#F2C14E" />
        <stop offset="1" stopColor="#B98320" />
      </radialGradient>
      <linearGradient id="o-bell" x1="0" x2="1">
        <stop offset="0" stopColor="#FFE08A" />
        <stop offset=".6" stopColor="#E6B84A" />
        <stop offset="1" stopColor="#B98320" />
      </linearGradient>
      <linearGradient id="o-star" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFF0A8" />
        <stop offset="1" stopColor="#F2B630" />
      </linearGradient>
      <linearGradient id="o-box" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7FA8FF" />
        <stop offset="1" stopColor="#3B4A8A" />
      </linearGradient>
      <radialGradient id="o-halo">
        <stop offset="0" stopColor="#FFE7A0" stopOpacity=".95" />
        <stop offset=".45" stopColor="#FFD36B" stopOpacity=".45" />
        <stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="o-heart" cx=".35" cy=".3" r=".9">
        <stop offset="0" stopColor="#FF9AB0" />
        <stop offset=".55" stopColor="#E8335A" />
        <stop offset="1" stopColor="#9C1838" />
      </radialGradient>
      <linearGradient id="o-ice" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#D9F1FF" />
        <stop offset="1" stopColor="#4FA3E3" />
      </linearGradient>
      <radialGradient id="o-flame" cx=".5" cy=".7" r=".7">
        <stop offset="0" stopColor="#FFFBE0" />
        <stop offset=".45" stopColor="#FFD36B" />
        <stop offset="1" stopColor="#FF7A2E" />
      </radialGradient>
      <radialGradient id="o-lamp" cx=".5" cy=".5" r=".6">
        <stop offset="0" stopColor="#FFF6C8" />
        <stop offset=".6" stopColor="#FFC94A" />
        <stop offset="1" stopColor="#E0702A" />
      </radialGradient>
      <linearGradient id="o-gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E9FBFF" />
        <stop offset=".45" stopColor="#7FD8FF" />
        <stop offset="1" stopColor="#3C6CE0" />
      </linearGradient>
      <linearGradient id="o-shine" x1="0" x2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="o-aura">
        <stop offset="0" stopColor="#FFF3C4" stopOpacity=".9" />
        <stop offset=".5" stopColor="#FFD36B" stopOpacity=".35" />
        <stop offset="1" stopColor="#FF9A3C" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="o-crown" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF7CF" />
        <stop offset=".45" stopColor="#FFD24A" />
        <stop offset="1" stopColor="#D08A0E" />
      </linearGradient>
      <radialGradient id="o-super" cx=".35" cy=".3" r=".8">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset=".35" stopColor="#FFE58A" />
        <stop offset=".8" stopColor="#E0A21E" />
        <stop offset="1" stopColor="#9C6A10" />
      </radialGradient>
    </defs>
  );
}

const STAR = (r: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? ri : r;
    return `${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`;
  }).join(" ");

/** (0,0) төвтэй, ~±15 хэмжээтэй чимэглэл. */
export function OrnamentShape({ id }: { id: OrnamentId }) {
  switch (id) {
    case "ball":
      return (
        <g>
          <rect x="-4" y="-17" width="8" height="5" rx="1.5" fill="#E2B34A" />
          <circle r="13" fill="url(#o-red)" />
          <clipPath id="o-ball-clip"><circle r="13" /></clipPath>
          <g clipPath="url(#o-ball-clip)"><rect className="a-sweep" x="-30" y="-14" width="10" height="28" fill="url(#o-shine)" transform="skewX(-20)" /></g>
          <path d="M-12 -1 Q0 5 12 -1" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" strokeDasharray="2 3" />
          <ellipse cx="-5" cy="-6" rx="3.2" ry="2" fill="#fff" opacity=".6" />
        </g>
      );
    case "candy":
      return (
        <g strokeLinecap="round" fill="none">
          <path d="M5 15 L5 -6 A6 6 0 0 0 -7 -6" stroke="#fff" strokeWidth="6" />
          <path d="M5 15 L5 -6 A6 6 0 0 0 -7 -6" stroke="#D63A4A" strokeWidth="6" strokeDasharray="3.5 3.5" />
          <path d="M-7 -14 L-7 -10" stroke="#E2B34A" strokeWidth="1.5" />
        </g>
      );
    case "bell":
      return (
        <g className="a-ring">
          <path d="M0 -15 C-9 -15 -10 -4 -10 2 C-10 7 -14 9 -14 12 L14 12 C14 9 10 7 10 2 C10 -4 9 -15 0 -15Z" fill="url(#o-bell)" stroke="#9C6A10" strokeWidth=".8" />
          <circle cy="15" r="3.2" fill="#B98320" />
          <path d="M-5 -14 Q-2 -19 0 -15 Q2 -19 5 -14" fill="#D63A4A" />
          <path d="M-6 -8 Q-7 0 -8 6" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case "gift":
      return (
        <g>
          <rect x="-12" y="-8" width="24" height="21" rx="2.5" fill="url(#o-box)" />
          <rect x="-2.2" y="-8" width="4.4" height="21" fill="#F2C14E" />
          <g className="a-lid">
            <rect x="-13.5" y="-11" width="27" height="6" rx="2" fill="#5C74C7" />
            <rect x="-2.2" y="-11" width="4.4" height="6" fill="#F2C14E" />
            <path d="M0 -11 C-4 -19 -12 -16 -6 -11 Z M0 -11 C4 -19 12 -16 6 -11 Z" fill="#F2C14E" stroke="#B98320" strokeWidth=".7" />
          </g>
        </g>
      );
    case "star":
      return (
        <g>
          <circle r="17" fill="url(#o-halo)" className="twinkle" />
          <g className="a-wobble">
            <polygon points={STAR(15, 6.5)} fill="url(#o-star)" stroke="#C98A10" strokeWidth=".8" strokeLinejoin="round" />
            <circle cx="-3" cy="-4" r="1.8" fill="#fff" opacity=".8" />
          </g>
        </g>
      );
    case "snowflake":
      return (
        <g>
          <circle r="15" fill="#BFE6FF" opacity=".35" className="twinkle" />
          <g className="a-spin" stroke="url(#o-ice)" strokeWidth="2.2" strokeLinecap="round" fill="none">
            {Array.from({ length: 6 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 60})`}>
                <path d="M0 0 L0 -13" />
                <path d="M0 -8 L-3.5 -11 M0 -8 L3.5 -11" strokeWidth="1.6" />
                <path d="M0 -4 L-2.5 -6.2 M0 -4 L2.5 -6.2" strokeWidth="1.3" />
              </g>
            ))}
            <circle r="2.4" fill="#fff" stroke="none" />
          </g>
        </g>
      );
    case "heart":
      return (
        <g className="a-beat">
          <path d="M0 13 C-4 9 -14 3 -14 -4 C-14 -10 -9 -13 -5 -13 C-2 -13 0 -11 0 -8 C0 -11 2 -13 5 -13 C9 -13 14 -10 14 -4 C14 3 4 9 0 13Z" fill="url(#o-heart)" stroke="#8E1F2E" strokeWidth=".7" />
          <ellipse cx="-6.5" cy="-6" rx="3" ry="2" fill="#fff" opacity=".6" transform="rotate(-30 -6.5 -6)" />
        </g>
      );
    case "stocking":
      return (
        <g>
          <path d="M-4 -12 L7 -12 L7 3 C7 9 3 14 -4 14 C-10 14 -13 10 -12 6 C-11 2 -7 2 -4 2Z" fill="#D63A4A" stroke="#8E1F2E" strokeWidth=".7" />
          <rect x="-6" y="-16" width="15" height="6" rx="3" fill="#fff" />
          <path d="M-8 11 C-6 12 -3 12 -1 11" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
          <circle cx="2" cy="-2" r="1.3" fill="#FFE08A" className="twinkle" />
          <circle cx="-2" cy="5" r="1.1" fill="#FFE08A" className="twinkle" style={{ animationDelay: ".9s" }} />
          <circle cx="4" cy="6" r="1" fill="#fff" className="twinkle" style={{ animationDelay: "1.6s" }} />
        </g>
      );
    case "candle":
      return (
        <g>
          <circle cy="-9" r="9" fill="#FFD36B" opacity=".35" className="a-glow" />
          <path className="a-flicker" d="M0 -18 C3 -14 4 -11 2.5 -8.5 C1.5 -7 -1.5 -7 -2.5 -8.5 C-4 -11 -2 -14 0 -18Z" fill="url(#o-flame)" />
          <line y1="-7.5" y2="-5" stroke="#333" strokeWidth=".9" />
          <rect x="-4.5" y="-5" width="9" height="16" rx="1.5" fill="#FFF4E6" stroke="#E5CFAE" strokeWidth=".6" />
          <path d="M-4.5 -2 Q-2.5 1 -1.5 -2 L-1.5 3" stroke="#F2DDBD" strokeWidth="1.2" fill="none" />
          <ellipse cy="12" rx="9" ry="3" fill="#E2B34A" />
          <path d="M9 12 Q13 12 12 8" stroke="#E2B34A" strokeWidth="1.6" fill="none" />
        </g>
      );
    case "snowman":
      return (
        <g>
          <circle cy="6" r="9" fill="#fff" stroke="#D4E6F2" strokeWidth=".8" />
          <circle cy="-6" r="6.5" fill="#fff" stroke="#D4E6F2" strokeWidth=".8" />
          <rect x="-6" y="-14" width="12" height="2" rx="1" fill="#2B2F45" />
          <rect x="-4" y="-20" width="8" height="7" rx="1" fill="#2B2F45" />
          <rect x="-4" y="-15.5" width="8" height="1.6" fill="#D63A4A" />
          <g className="a-blink">
            <circle cx="-2.3" cy="-7" r=".95" fill="#2B2F45" />
            <circle cx="2.3" cy="-7" r=".95" fill="#2B2F45" />
          </g>
          <path d="M0 -5.2 L4.5 -4.2 L0 -3.8Z" fill="#FF8A2E" />
          <path d="M-6 -1 Q0 1.6 6 -1" stroke="#D63A4A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path className="a-scarf" d="M3.5 0 L5 6" stroke="#D63A4A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cy="4" r=".9" fill="#2B2F45" />
          <circle cy="8" r=".9" fill="#2B2F45" />
        </g>
      );
    case "lantern":
      return (
        <g>
          <circle r="17" fill="url(#o-halo)" className="a-glow" />
          <path d="M-4 -17 Q0 -21 4 -17" stroke="#B98320" strokeWidth="1.4" fill="none" />
          <rect x="-7" y="-15" width="14" height="4" rx="1.5" fill="#B98320" />
          <path d="M-9 -11 L9 -11 L8 9 L-8 9Z" fill="#7a0a10" stroke="#B98320" strokeWidth="1" />
          <path d="M-6.5 -9 L6.5 -9 L6 7 L-6 7Z" fill="url(#o-lamp)" className="a-flicker-soft" />
          <path d="M0 -9 L0 7 M-6.3 -1 L6.3 -1" stroke="#B98320" strokeWidth=".9" />
          <rect x="-8" y="9" width="16" height="4" rx="1.5" fill="#B98320" />
          <path d="M0 13 L0 17" stroke="#D63A4A" strokeWidth="1.4" />
          <circle cy="18" r="1.6" fill="#D63A4A" />
        </g>
      );
    case "diamond":
      return (
        <g>
          <circle r="21" fill="url(#o-halo)" className="halo" />
          <g className="rays" opacity=".8">
            {Array.from({ length: 4 }, (_, i) => (
              <path key={i} d="M0 -22 L1.6 -15 L-1.6 -15Z" fill="#CFF3FF" transform={`rotate(${i * 90 + 45})`} />
            ))}
          </g>
          <path d="M-13 -5 L-7 -13 L7 -13 L13 -5 L0 14Z" fill="url(#o-gem)" stroke="#2F56B8" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M-13 -5 L13 -5 M-7 -13 L-3.5 -5 L0 14 L3.5 -5 L7 -13 M-3.5 -5 L0 -13 L3.5 -5" stroke="#ffffffa0" strokeWidth=".7" fill="none" />
          <clipPath id="o-gem-clip"><path d="M-13 -5 L-7 -13 L7 -13 L13 -5 L0 14Z" /></clipPath>
          <g clipPath="url(#o-gem-clip)"><rect className="a-sweep" x="-30" y="-14" width="9" height="30" fill="url(#o-shine)" transform="skewX(-20)" /></g>
          <path d="M9 -16 L10 -13.5 L12.5 -12.5 L10 -11.5 L9 -9 L8 -11.5 L5.5 -12.5 L8 -13.5Z" fill="#fff" className="twinkle" />
        </g>
      );
    case "topper":
      return (
        <g>
          <circle r="26" fill="url(#o-aura)" className="halo" />
          <g className="rays-slow">
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d={i % 2 ? "M0 -30 L1.6 -17 L-1.6 -17Z" : "M0 -36 L2.4 -18 L-2.4 -18Z"} fill="#FFE7A0" opacity={i % 2 ? 0.6 : 0.85} transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <g className="a-wobble">
            <polygon points={STAR(17, 7.2)} fill="url(#o-crown)" stroke="#B5770A" strokeWidth="1" strokeLinejoin="round" />
            <polygon points={STAR(10.5, 4.6)} fill="#FFF3B0" opacity=".75" />
            <path d="M0 -4.6 L3.6 0 L0 4.6 L-3.6 0Z" fill="url(#o-gem)" stroke="#2F56B8" strokeWidth=".5" />
          </g>
          {[[-14, -14, 0], [15, -11, 0.7], [-12, 13, 1.3], [13, 14, 2]].map(([x, y, d], i) => (
            <path key={i} className="twinkle" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y})`} d="M0 -3.5 L.9 -.9 L3.5 0 L.9 .9 L0 3.5 L-.9 .9 L-3.5 0 L-.9 -.9Z" fill="#fff" />
          ))}
        </g>
      );
    case "super":
      return (
        <g>
          <circle r="22" fill="url(#o-halo)" className="halo" />
          <g className="rays" opacity=".7">
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d="M0 -21 L1.4 -15 L-1.4 -15Z" fill="#FFE7A0" transform={`rotate(${i * 45})`} />
            ))}
          </g>
          <rect x="-4" y="-17" width="8" height="5" rx="1.5" fill="#B98320" />
          <circle r="13.5" fill="url(#o-super)" />
          <polygon points={STAR(6, 2.6)} fill="#fff" opacity=".9" />
          <circle cx="9" cy="-9" r="1.6" fill="#fff" className="twinkle" />
        </g>
      );
  }
}

export function OrnamentIcon({ id, size = 46 }: { id: OrnamentId; size?: number }) {
  return (
    <svg viewBox="-24 -24 48 48" width={size} height={size} aria-hidden>
      <OrnamentDefs />
      <OrnamentShape id={id} />
    </svg>
  );
}
