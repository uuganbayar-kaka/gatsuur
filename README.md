# 🎄 Шинэ жилийн гацуур

Гацуураа үүсгээд линкээ хуваалц — найзууд чинь төлбөртэй бэлэг чимэглэл өлгөнө.

## Боломжууд
- Гацуурын нэр, утасны дугаар, 4 оронтой PIN-ээр гацуур үүсгэх (үнэгүй)
- Утасны дугаар + PIN-ээр нэвтрэх
- PIN мартсан бол `/reset` — verify.mn SMS баталгаажуулалтаар шинэ PIN тохируулах
- Админ: `/admin` — бүх гацуур, утас, бэлгийн тоо, нийт дүн
- 4 үнэгүй загвар (Сэвсгэр, Цаасан, Гэрэлт, Цасан) — хүссэн үедээ солино
- Бэлэг чимэглэл: 5,000₮ / 10,000₮ / 20,000₮ (тус бүр 2 төрөл)
- Үнэгүй гацуурт 8 бэлэг. Томруулах багц: 5,000₮ → +5, 10,000₮ → +10, 20,000₮ → +20
- Хуваалцах линк (`/t/<id>`) — зочид бэлэг сонгож, QPay-р төлж өлгөнө
- Мэндчилгээг зөвхөн гацуурын эзэн уншина

## Технологи
Next.js 16 (App Router) · Upstash Redis · QPay Merchant v2 · JWT cookie сешн · Papercut parallax арын зураг

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
   `SESSION_SECRET`, `VERIFY_MN_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, `QPAY_INVOICE_CODE` …
4. Redeploy → `https://<домэйн>/api/health` нээж `"ok": true`, `"paymentMode": "qpay"` гарч байгааг шалгана.

## QPay Merchant холболт (merchant-postman.json)
| Алхам | Endpoint |
|---|---|
| Token — Basic `client_id:client_secret`; `access_token`-г `expires_in`-ийг TTL болгон Redis-д кэшлэнэ, 401 бол шинээр авна | `POST /v2/auth/token` |
| Нэхэмжлэх — `invoice_code, sender_invoice_no, invoice_receiver_code (утас), invoice_description, amount, callback_url` | `POST /v2/invoice` |
| Төлбөр шалгах — `object_type: "INVOICE", object_id: <invoice_id>` | `POST /v2/payment/check` |

Үүссэн нэхэмжлэх бүр `invoice_id, qr_text, status (PENDING/PAID), created_date, phone`-тойгоор
`qpay:invoice:<invoice_id>`-д, мөн утсаар хайхад `qpay:phone:<утас>` hash-д хадгалагдана (утас = гацуурын эзний дугаар).

Төлбөрийн урсгал: клиент 3 сек тутам `GET /api/invoices/:id` → сервер QPay-с шалгана; QPay мөн `/api/qpay/callback?inv=…` руу мэдэгдэнэ.
Callback-д шууд итгэхгүй, QPay-с дахин шалгаж баталгаажуулна.

## PIN сэргээх (verify.mn)
1. `/reset` → утасны дугаар → `POST /api/reset` нь verify.mn session (санамсаргүй 6 оронтой код) үүсгэнэ.
2. Хэрэглэгчид `displayInstruction`-ийг үг үсгээр нь харуулж, `smsUri` товчоор 144773 руу SMS илгээлгэнэ (150₮).
3. Хөтөч 3 сек тутам `GET /api/reset/:rid` → сервер `GET https://api.verify.mn/sessions/{id}` шалгана.
   Production-д (https) verify.mn мөн `/api/reset/callback?rid=…` руу дохио өгнө — үүнд итгэхгүй, дахин шалгана.
4. `VERIFIED` болмогц SMS товч нуугдаж, polling зогсоно → шинэ PIN → `POST /api/reset/:rid/complete` (нэг л удаа, 10 минутын дотор).
5. `EXPIRED` бол хуучин код хүчингүй гэж мэдэгдээд шинэ код авна.

`lib/verify.ts` дахь `verifyPhone(phone)` нь бүх урсгалыг нэг дор хийдэг функц (тест, скриптэд). Вэб дээр serverless
хугацааны хязгаараас болж алхмуудыг тусад нь ашигладаг.

Тест: `npm test` (PENDING→VERIFIED, EXPIRED, timeout, 401 буруу key, key логт орохгүй гэх мэт).

## Өгөгдлийн сан (Redis түлхүүрүүд)
| Түлхүүр | Төрөл | Агуулга |
|---|---|---|
| `tree:<id>` | JSON | нэр, утас, bcrypt нууц үг, загвар |
| `phone:<утас>` | string | гацуурын id (SET NX — давхардахгүй) |
| `tree:<id>:gifts` | hash | invoice id → бэлэг |
| `tree:<id>:expands` | hash | invoice id → нэмэгдсэн зай |
| `tree:<id>:amount` | number | төлөгдсөн бэлгийн нийт дүн — invoice paid болоход invoice-ийн утсаар гацуурыг олж INCRBY |
| `tree:<id>:update_amount` | number | төлөгдсөн томруулалтын нийт дүн (бэлгийн дүнгээс тусдаа) |
| `inv:<id>:credited` | flag (90 хоног) | дүн нэмэгдсэн тэмдэг (SET NX — давхар нэмэхгүй) |
| `inv:<id>` | JSON (90 хоног) | нэхэмжлэх, төлөв |
| `invoices:index` | list (сүүлийн 5000) | нэхэмжлэхийн id (админ жагсаалт) |
| `reset:<rid>` | JSON (20 мин) | PIN сэргээх хүсэлт ↔ verify.mn sessionId |
| `qpay:token` | string (TTL = expires_in) | QPay access_token |
| `qpay:invoice:<invoice_id>` | JSON (90 хоног) | QPay нэхэмжлэх: invoice_id, qr_text, status, created_date, phone |
| `qpay:phone:<утас>` | hash | invoice_id → QPay нэхэмжлэх |
| `logs` | list (сүүлийн 2000) | алдаа/үйл явдлын лог |

Бэлэг, томруулалт нь **invoice id-р hash-д** бичигддэг тул callback болон polling давхар ирсэн ч нэг л удаа тооцогдоно.

## Админ
- **Хаяг:** `/admin` (нэвтрэх: `/admin/login`)
- Хэрэглэгч Vercel → Environment Variables-д: `ADMIN_USERNAME`, `ADMIN_PASSWORD` (10+ тэмдэгт). Олон админ: `ADMIN_USERS=user:pass,user2:pass2`.
- Солих бол Vercel дээр утгыг өөрчлөөд redeploy. Эх кодонд нууц үг байхгүй тул repo public байж болно.
- **Нэхэмжлэх:** `/admin/invoices` — бүх нэхэмжлэх, төлөв 5 сек тутам live шинэчлэгдэнэ (`GET /api/admin/invoices`; хүлээгдэж буй сүүлийн 10-ыг QPay-с шалгана). Таб идэвхгүй үед зогсоно.
- Жагсаалт: гацуурын нэр, утас, бэлгийн тоо / багтаамж, бэлгийн нийт дүн, үүсгэсэн огноо. Нэр/утсаар хайх, дүн/тоогоор эрэмбэлэх.

## Алдааны лог
- Бүх серверийн алдаа, QPay HTTP алдаа, төлбөрийн үйл явдал, хөтөч талын JS алдаа автоматаар бүртгэгдэнэ.
- **Харах:** админаар нэвтрээд `/admin/logs` (error / warn / info шүүлтүүртэй)
- JSON: `GET /api/admin/logs?level=error` + `Authorization: Bearer <ADMIN_TOKEN>`
- Мөн Vercel → Project → **Logs** хэсэгт JSON мөрөөр харагдана.
