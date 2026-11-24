export const FREE_CAPACITY = 8;

export type OrnamentId = "ball" | "candy" | "bell" | "gift" | "star" | "super";

export const ORNAMENTS: { id: OrnamentId; name: string; price: number }[] = [
  { id: "ball", name: "Улаан бөмбөлөг", price: 5000 },
  { id: "candy", name: "Чихэр саваа", price: 5000 },
  { id: "bell", name: "Алтан хонх", price: 10000 },
  { id: "gift", name: "Бэлгийн хайрцаг", price: 10000 },
  { id: "star", name: "Гялалзах од", price: 20000 },
  { id: "super", name: "Супер бөмбөлөг", price: 20000 },
];

export type PlanId = "s" | "m" | "l";

export const EXPAND_PLANS: { id: PlanId; price: number; slots: number }[] = [
  { id: "s", price: 5000, slots: 5 },
  { id: "m", price: 10000, slots: 10 },
  { id: "l", price: 20000, slots: 20 },
];

export type TemplateId = "lush" | "paper" | "lights" | "snowy";

export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "lush", name: "Сэвсгэр", desc: "Цас, гэрэл" },
  { id: "paper", name: "Цаасан", desc: "Гар хийцийн цаас" },
  { id: "lights", name: "Гэрэлт", desc: "Ороосон гэрлүүд" },
  { id: "snowy", name: "Цасан", desc: "Цастай ой" },
];

export const isTemplate = (v: unknown): v is TemplateId =>
  TEMPLATES.some((t) => t.id === v);

export const formatMnt = (n: number) => n.toLocaleString("en-US") + "₮";
