# 🎄 Шинэ жилийн гацуур

Гацуураа үүсгээд линкээ хуваалц — найзууд чинь төлбөртэй бэлэг чимэглэл өлгөнө.

## Боломжууд
- Гацуурын нэр, утасны дугаар, 4 оронтой PIN-ээр гацуур үүсгэх (үнэгүй)
- Утасны дугаар + PIN-ээр нэвтрэх
- Админ: `/admin` — бүх гацуур, утас, бэлгийн тоо, нийт дүн
- 4 үнэгүй загвар (Сэвсгэр, Цаасан, Гэрэлт, Цасан) — хүссэн үедээ солино
- Бэлэг чимэглэл: 5,000₮ / 10,000₮ / 20,000₮ (тус бүр 2 төрөл)
- Үнэгүй гацуурт 8 бэлэг. Томруулах багц: 5,000₮ → +5, 10,000₮ → +10, 20,000₮ → +20
- Хуваалцах линк (`/t/<id>`) — зочид бэлэг сонгож, QPay-р төлж өлгөнө
- Мэндчилгээг зөвхөн гацуурын эзэн уншина

## Технологи
Next.js 16 (App Router) · Upstash Redis · QPay QuickQR v2 · JWT cookie сешн · Papercut parallax арын зураг

## Локалаар ажиллуулах
```bash
npm install
npm run dev
```
Redis тохируулаагүй бол санах ойд түр хадгална, QPay түлхүүргүй бол **туршилтын төлбөрийн горимоор** ажиллана.

## Vercel дээр байршуулах
1. GitHub руу push хийгээд Vercel дээр **Import Project**.
2. Vercel → Project → **Storage → Upstash for Redis** холбоно (`KV_REST_API_URL`, `KV_REST_API_TOKEN` автоматаар нэмэгдэнэ).
   Region-оо Азид ойр (жишээ нь Tokyo / Singapore) сонговол хурдан.
3. **Settings → Environment Variables** — `.env.example`-д байгаа бүх утгыг бөглөнө:
   `SESSION_SECRET`, `QPAY_USERNAME`, `QPAY_PASSWORD`, `QPAY_TERMINAL_ID`, `QPAY_MERCHANT_ID` …
4. Redeploy → `https://<домэйн>/api/health` нээж `"ok": true`, `"paymentMode": "qpay"` гарч байгааг шалгана.

## QPay QuickQR холболт
| Алхам | Endpoint |
|---|---|
| Token (Basic auth + `terminal_id`) — Redis-д кэшлэнэ, 401 бол шинэчилнэ | `POST /v2/auth/token`, `POST /v2/auth/refresh` |
| Нэхэмжлэх | `POST /v2/invoice` (`merchant_id, amount, currency, description, mcc_code, callback_url, bank_accounts`) |
| Төлбөр шалгах | `POST /v2/payment/check` (`invoice_id`) |

Мерчант үүсгэх нь нэг удаагийн ажил — Postman collection-ий **"Байгууллагаар/Хувь хүнээр мерчант үүсгэх"**-ийг ажиллуулж
гарсан `id`-г `QPAY_MERCHANT_ID`-д хийнэ.

Төлбөрийн урсгал: клиент 3 сек тутам `GET /api/invoices/:id` → сервер QPay-с шалгана; QPay мөн `/api/qpay/callback?inv=…` руу мэдэгдэнэ.
Callback-д шууд итгэхгүй, QPay-с дахин шалгаж баталгаажуулна.

## Өгөгдлийн сан (Redis түлхүүрүүд)
| Түлхүүр | Төрөл | Агуулга |
|---|---|---|
| `tree:<id>` | JSON | нэр, утас, bcrypt нууц үг, загвар |
| `phone:<утас>` | string | гацуурын id (SET NX — давхардахгүй) |
| `tree:<id>:gifts` | hash | invoice id → бэлэг |
| `tree:<id>:expands` | hash | invoice id → нэмэгдсэн зай |
| `inv:<id>` | JSON (90 хоног) | нэхэмжлэх, төлөв |
| `qpay:token` | JSON (TTL) | QPay токен |
| `logs` | list (сүүлийн 2000) | алдаа/үйл явдлын лог |

Бэлэг, томруулалт нь **invoice id-р hash-д** бичигддэг тул callback болон polling давхар ирсэн ч нэг л удаа тооцогдоно.

## Админ
- **Хаяг:** `/admin` (нэвтрэх: `/admin/login`)
- Хэрэглэгч `lib/admin.ts` доторх `ADMIN_USERS`-д бичигдсэн. Солих/нэмэх бол тэнд засаад redeploy.
- Жагсаалт: гацуурын нэр, утас, бэлгийн тоо / багтаамж, бэлгийн нийт дүн, үүсгэсэн огноо. Нэр/утсаар хайх, дүн/тоогоор эрэмбэлэх.
- ⚠️ Repo-г public болгож болохгүй — нууц үг эх кодонд байгаа.

## Алдааны лог
- Бүх серверийн алдаа, QPay HTTP алдаа, төлбөрийн үйл явдал, хөтөч талын JS алдаа автоматаар бүртгэгдэнэ.
- **Харах:** админаар нэвтрээд `/admin/logs` (error / warn / info шүүлтүүртэй)
- JSON: `GET /api/admin/logs?level=error` + `Authorization: Bearer <ADMIN_TOKEN>`
- Мөн Vercel → Project → **Logs** хэсэгт JSON мөрөөр харагдана.
