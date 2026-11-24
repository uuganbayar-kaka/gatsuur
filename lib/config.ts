export const FREE_CAPACITY = 20;

/** Бэлэг задлах өдөр (Улаанбаатарын цагаар шөнө дунд). */
export const GIFT_OPEN_DATE = "2027-01-01";
export const GIFT_OPEN_AT = Date.parse(`${GIFT_OPEN_DATE}T00:00:00+08:00`);

export type OrnamentId =
  | "ball" | "candy" | "snowflake"
  | "bell" | "heart" | "stocking"
  | "gift" | "candle" | "snowman"
  | "star" | "lantern"
  | "super" | "diamond"
  | "topper";

/** 20,000₮-ийн онцгой чимэглэл — гацуурт ганцхан, оройд байрлана, багтаамжид тооцогдохгүй. */
export const TOPPER_ID: OrnamentId = "topper";
/** 10,000₮ ба түүнээс дээш — гацуур дээр онцгой анимацитай. */
export const PREMIUM_PRICE = 10000;

export const ORNAMENTS: { id: OrnamentId; name: string; price: number }[] = [
  { id: "ball", name: "Улаан бөмбөлөг", price: 1000 },
  { id: "candy", name: "Чихэр саваа", price: 1000 },
  { id: "snowflake", name: "Цасан ширхэг", price: 1000 },
  { id: "bell", name: "Алтан хонх", price: 2000 },
  { id: "heart", name: "Зүрх", price: 2000 },
  { id: "stocking", name: "Бэлгийн оймс", price: 2000 },
  { id: "gift", name: "Бэлгийн хайрцаг", price: 3000 },
  { id: "candle", name: "Лаа", price: 3000 },
  { id: "snowman", name: "Цасан хүн", price: 3000 },
  { id: "star", name: "Гялалзах од", price: 5000 },
  { id: "lantern", name: "Дэнлүү", price: 5000 },
  { id: "super", name: "Супер бөмбөлөг", price: 10000 },
  { id: "diamond", name: "Очир алмаз", price: 10000 },
  { id: "topper", name: "Оройн алтан од", price: 20000 },
];

export type PlanId = "s" | "m" | "l";

/** Худалдаалагдаж буй томруулах багцууд. */
export const EXPAND_PLANS: { id: PlanId; price: number; slots: number }[] = [
  { id: "s", price: 5000, slots: 50 },
  { id: "m", price: 10000, slots: 100 },
];

/** Өмнөх хувилбарын багцууд — хуучин нэхэмжлэх, тоолуурыг зөв тооцоход л хэрэглэнэ. */
const LEGACY_PLANS: { id: PlanId; price: number; slots: number }[] = [
  { id: "s", price: 5000, slots: 5 },
  { id: "m", price: 10000, slots: 10 },
  { id: "l", price: 20000, slots: 20 },
];

/** Нэхэмжлэх дээрх багц (хуучин "l" багц ч олдоно). */
export const planById = (id: PlanId | undefined) => EXPAND_PLANS.find((p) => p.id === id) ?? LEGACY_PLANS.find((p) => p.id === id);

/** Томруулалтын hash-д хадгалсан зайн тооноос үнэ (шинэ болон хуучин багц). */
export const planPriceBySlots = (slots: number) =>
  [...EXPAND_PLANS, ...LEGACY_PLANS].find((p) => p.slots === slots)?.price ?? 0;

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
