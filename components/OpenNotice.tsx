"use client";
import { useEffect, useState } from "react";
import { GIFT_OPEN_AT, GIFT_OPEN_DATE } from "@/lib/config";

const DAY = 86_400_000;

/** «Бэлгийг 2027-01-01-нд задална» сануулга + үлдсэн хоног (цагийг зөвхөн хөтөч дээр тооцно). */
export default function OpenNotice({ owner, compact }: { owner?: boolean; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const left = now === null ? null : GIFT_OPEN_AT - now;
  const open = left !== null && left <= 0;
  const days = left === null ? null : Math.ceil(left / DAY);

  if (compact)
    return (
      <p className="open-hint">
        🎁 Таны бэлгийг <b>{GIFT_OPEN_DATE}</b>-нд задална
      </p>
    );

  return (
    <div className={`open-notice${open ? " is-open" : ""}`}>
      <span className="open-ico" aria-hidden>{open ? "🎉" : "🎁"}</span>
      <span>
        {open ? (
          <b>{owner ? "Бэлгүүдээ задлах цаг боллоо!" : "Бэлгүүдийг задлах цаг боллоо!"}</b>
        ) : (
          <>
            <b>{owner ? "Бэлгүүдээ" : "Бэлгүүдийг"} {GIFT_OPEN_DATE}-нд задална</b>
            {days !== null && <small>Шинэ он хүртэл {days} хоног үлдлээ</small>}
          </>
        )}
      </span>
    </div>
  );
}
