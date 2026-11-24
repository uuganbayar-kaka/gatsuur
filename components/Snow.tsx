"use client";
import { useEffect, useState } from "react";

export default function Snow({ count = 40 }: { count?: number }) {
  const [flakes, setFlakes] = useState<{ l: number; s: number; d: number; o: number; dl: number }[]>([]);
  useEffect(() => {
    setFlakes(
      Array.from({ length: count }, () => ({
        l: Math.random() * 100,
        s: 2 + Math.random() * 4,
        d: 7 + Math.random() * 10,
        o: 0.3 + Math.random() * 0.6,
        dl: -Math.random() * 15,
      })),
    );
  }, [count]);
  return (
    <div className="snow" aria-hidden>
      {flakes.map((f, i) => (
        <i
          key={i}
          style={{ left: `${f.l}%`, width: f.s, height: f.s, opacity: f.o, animationDuration: `${f.d}s`, animationDelay: `${f.dl}s` }}
        />
      ))}
    </div>
  );
}
