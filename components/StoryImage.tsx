"use client";
import { useEffect, useState } from "react";
import { GIFT_OPEN_DATE } from "@/lib/config";

const W = 1080;
const H = 1920;
// Instagram/Facebook story-ийн дээд, доод 250px-д апп-ийн товч давхардана — гол агуулгыг дунд нь байрлуулна
const SAFE_TOP = 260;
const SAFE_BOTTOM = H - 260;

/** Зурагт хөдөлгөөнгүй үед зөв харагдах хамгийн бага стиль (хуудасны CSS SVG-тэй хамт очдоггүй). */
const SVG_STYLE = `
  .glint, .ripple, .slot { display: none; }
  .garland { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 0 6.5; }
`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Гацуурын зургийг уншиж чадсангүй."));
    img.src = src;
  });
}

/** Гацуурын одоогийн SVG-г (чимэглэл, загвартай нь) 1080×1920 story зураг болгоно. */
export async function renderStory(svgEl: SVGSVGElement, opts: { name: string; count: number; url: string; fontHand: string; fontUi: string }) {
  const vb = svgEl.viewBox.baseVal;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(vb.width));
  clone.setAttribute("height", String(vb.height));
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = SVG_STYLE;
  clone.insertBefore(style, clone.firstChild);
  const svgText = new XMLSerializer().serializeToString(clone);
  const tree = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);

  await document.fonts?.ready;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  // Шөнийн улаан тэнгэр
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#3a0306");
  bg.addColorStop(0.45, "#8e0d14");
  bg.addColorStop(1, "#c4060c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Цас (тогтмол seed — зураг бүр ижил)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 140; i++) {
    ctx.globalAlpha = 0.25 + rnd() * 0.6;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 1.5 + rnd() * 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Гарчиг
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffffcc";
  ctx.font = `700 40px ${opts.fontUi}`;
  ctx.fillText("Шинэ жилийн гацуур", W / 2, SAFE_TOP + 40);
  ctx.fillStyle = "#fff";
  let size = 130;
  ctx.font = `700 ${size}px ${opts.fontHand}`;
  while (ctx.measureText(opts.name).width > W - 120 && size > 60) ctx.font = `700 ${(size -= 6)}px ${opts.fontHand}`;
  ctx.shadowColor = "#0006";
  ctx.shadowBlur = 18;
  ctx.fillText(opts.name, W / 2, SAFE_TOP + 40 + size);
  ctx.shadowBlur = 0;

  // Гацуур — үлдсэн зайд багтаана
  const top = SAFE_TOP + 40 + size + 50;
  const bottom = SAFE_BOTTOM - 210;
  const scale = Math.min((W - 80) / vb.width, (bottom - top) / vb.height);
  const tw = vb.width * scale;
  const th = vb.height * scale;
  const tx = (W - tw) / 2;
  const ty = top + (bottom - top - th) / 2;
  const glow = ctx.createRadialGradient(W / 2, ty + th * 0.5, 10, W / 2, ty + th * 0.5, tw * 0.7);
  glow.addColorStop(0, "#ffd98a55");
  glow.addColorStop(1, "#ffd98a00");
  ctx.fillStyle = glow;
  ctx.fillRect(0, ty - 100, W, th + 200);
  ctx.drawImage(tree, tx, ty, tw, th);

  // Тоо, задлах өдөр
  const pill = (text: string, y: number, fill: string, color: string, font: string) => {
    ctx.font = font;
    const w = ctx.measureText(text).width + 64;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect((W - w) / 2, y - 46, w, 70, 35);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, y);
  };
  pill(`🎁 ${opts.count} бэлэг чимэглэл өлгөгдсөн`, bottom + 70, "#ffffff26", "#fff", `800 36px ${opts.fontUi}`);
  pill(`Бэлгүүдийг ${GIFT_OPEN_DATE}-нд задална`, bottom + 160, "#ffd36b", "#5a3a00", `800 34px ${opts.fontUi}`);

  // Холбоос
  ctx.fillStyle = "#ffffffd9";
  ctx.font = `700 32px ${opts.fontUi}`;
  ctx.fillText("Миний гацуурт бэлэг өлгөөрэй 🎄", W / 2, SAFE_BOTTOM + 70);
  ctx.font = `800 34px ${opts.fontUi}`;
  ctx.fillStyle = "#ffe7a0";
  ctx.fillText(opts.url.replace(/^https?:\/\//, ""), W / 2, SAFE_BOTTOM + 120);

  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Зураг үүсгэж чадсангүй."))), "image/png"));
}

/** «Story зураг» товч + урьдчилан харах цонх (хуваалцах / татах). */
export default function StoryButton({ getSvg, name, count, url }: { getSvg: () => SVGSVGElement | null; name: string; count: number; url: string }) {
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<{ blob: Blob; src: string } | null>(null);
  const [err, setErr] = useState("");
  const file = img ? new File([img.blob], "gatsuur-story.png", { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  useEffect(() => () => {
    if (img) URL.revokeObjectURL(img.src);
  }, [img]);

  async function make() {
    const svg = getSvg();
    if (!svg) return;
    setBusy(true);
    setErr("");
    try {
      const css = getComputedStyle(document.body);
      const blob = await renderStory(svg, {
        name,
        count,
        url,
        fontHand: css.getPropertyValue("--f-hand") || "cursive",
        fontUi: css.getPropertyValue("--f-ui") || "sans-serif",
      });
      setImg({ blob, src: URL.createObjectURL(blob) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Зураг үүсгэж чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `${name} · Шинэ жилийн гацуур` });
    } catch {
      /* хэрэглэгч цуцалсан */
    }
  }

  return (
    <>
      <button className="btn secondary story-btn" onClick={make} disabled={busy}>
        {busy ? "Зураг бэлдэж байна…" : "📸 Story зураг татах"}
      </button>
      {err && <div className="err">{err}</div>}
      {img && (
        <div className="reader" onClick={() => setImg(null)}>
          <div className="story-modal" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="Гацуурын story зураг" className="story-preview" />
            <div className="story-actions">
              {canShare && (
                <button className="btn festive" onClick={share}>
                  📤 Instagram / Facebook-т хуваалцах
                </button>
              )}
              <a className="btn primary" href={img.src} download="gatsuur-story.png">
                ⬇️ Зураг татах
              </a>
              <button className="btn secondary small" onClick={() => setImg(null)}>
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
