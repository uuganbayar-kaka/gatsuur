"use client";
import { MONEY_TEMPLATES, TEMPLATES, type TemplateId } from "@/lib/config";
import TreeArt from "./TreeArt";

const DEMO = [
  { id: "d1", ornament: "ball" as const, from: "" },
  { id: "d2", ornament: "bell" as const, from: "" },
  { id: "d3", ornament: "star" as const, from: "" },
];

const DEMO_MONEY = [
  { id: "d1", ornament: "coin" as const, from: "" },
  { id: "d2", ornament: "envelope" as const, from: "" },
  { id: "d3", ornament: "moneybag" as const, from: "" },
];

export default function TemplatePicker({ value, onChange, money = false }: { value: TemplateId; onChange: (t: TemplateId) => void; money?: boolean }) {
  return (
    <div className="tpl-row">
      {(money ? MONEY_TEMPLATES : TEMPLATES).map((t) => (
        <button key={t.id} type="button" className={`tpl${value === t.id ? " sel" : ""}`} onClick={() => onChange(t.id)}>
          <span className="mini">
            <TreeArt template={t.id} capacity={8} gifts={money ? DEMO_MONEY : DEMO} showEmpty={false} />
          </span>
          {t.name}
          <small>{t.desc}</small>
        </button>
      ))}
    </div>
  );
}
