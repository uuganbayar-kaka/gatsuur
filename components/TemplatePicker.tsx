"use client";
import { TEMPLATES, type TemplateId } from "@/lib/config";
import TreeArt from "./TreeArt";

const DEMO = [
  { id: "d1", ornament: "ball" as const, from: "" },
  { id: "d2", ornament: "bell" as const, from: "" },
  { id: "d3", ornament: "star" as const, from: "" },
];

export default function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (t: TemplateId) => void }) {
  return (
    <div className="tpl-row">
      {TEMPLATES.map((t) => (
        <button key={t.id} type="button" className={`tpl${value === t.id ? " sel" : ""}`} onClick={() => onChange(t.id)}>
          <span className="mini">
            <TreeArt template={t.id} capacity={8} gifts={DEMO} showEmpty={false} />
          </span>
          {t.name}
          <small>{t.desc}</small>
        </button>
      ))}
    </div>
  );
}
