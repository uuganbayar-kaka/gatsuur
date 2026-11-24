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
        <g>
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
          <rect x="-13.5" y="-11" width="27" height="6" rx="2" fill="#5C74C7" />
          <rect x="-2.2" y="-11" width="4.4" height="24" fill="#F2C14E" />
          <path d="M0 -11 C-4 -19 -12 -16 -6 -11 Z M0 -11 C4 -19 12 -16 6 -11 Z" fill="#F2C14E" stroke="#B98320" strokeWidth=".7" />
        </g>
      );
    case "star":
      return (
        <g>
          <circle r="17" fill="url(#o-halo)" className="twinkle" />
          <polygon points={STAR(15, 6.5)} fill="url(#o-star)" stroke="#C98A10" strokeWidth=".8" strokeLinejoin="round" />
          <circle cx="-3" cy="-4" r="1.8" fill="#fff" opacity=".8" />
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
