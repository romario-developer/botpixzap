# BotPixZap Backend (WhatsApp Cloud One-Shot)

API backend built with Node.js, TypeScript, Express and Prisma to handle WhatsApp Cloud API incoming messages and reply with a PIX charge in a single shot.

## Setup
1. Copy `.env.example` to `.env` and fill in your Postgres connection plus WhatsApp credentials. `TZ` defaults to `America/Bahia` and is required for silent-mode expiration.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the database schema (runs the SQL migrations and generates the Prisma client):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Seed today’s menu with the default price/fee:
   ```bash
   npm run seed
   ```

## Run
- `npm run dev` – start the TypeScript dev server with automatic reloads.
- `npm run build` – compile to `dist/`.
- `npm run start` – run the compiled server.

## Webhook routes
### Verification (GET /webhooks/whatsapp)
WhatsApp Cloud hits this endpoint during webhook registration with the query parameters `hub.mode`, `hub.challenge` and `hub.verify_token`. The server will return the `hub.challenge` only when `hub.mode` is `subscribe` and the provided token matches `WA_VERIFY_TOKEN`.

### Event callback (POST /webhooks/whatsapp)
1. Incoming messages are normalized to digits (keeping the DDI). If the customer is still in silent mode (`Customer.silentUntil` > now), the event is ignored.
2. Only text messages that match exactly `1`, `2`, or their Portuguese variants (`opção 1`, `opcao 2`, etc.) trigger a flow.
3. If today’s menu (based on the `America/Bahia` date) is missing, WhatsApp receives `Cardápio indisponível no momento.` and the customer stays unsilenced.
4. When a menu exists:
   - If a pending order for the same customer + option was created in the last 2 minutes, reuse its saved PIX copy/paste (no new order) and still update `silentUntil`.
   - Otherwise, create/update the customer, persist a new pending order, call `createPixCharge(order)` (which now hits Mercado Pago), and store its payment ID plus copy/paste/QR payload.
   - Reply with a single message containing the option, total (`pt-BR` currency) and PIX copia-e-cola text **only after Mercado Pago succeeds**.
   - Set `Customer.silentUntil` to today’s 23:59:59 (America/Bahia) after a successful PIX generation.
   - If Mercado Pago fails, reply `Não foi possível gerar o PIX agora. Tente novamente.` and leave the customer unsilenced so they can retry.
5. Any other payloads, non-text types or unsupported strings are ignored silently (no fallback or “não entendi”).

## Admin panel (backend)
- `POST /api/admin/login` – provide `{ "password": "<ADMIN_PASSWORD>" }` to receive a JWT (valid for ~8h).
- `GET /api/admin/summary/today` – protected by the JWT middleware; returns counts/amounts for today’s orders and paid breakdown by option.
- `GET /api/admin/menu/today` – fetches the current menu.
- `PUT /api/admin/menu/today` – updates `priceCents` and `deliveryFeeCents` (both integers). The same token can be re-used for all admin requests.
The JWT secret and password are powered by `ADMIN_PASSWORD`/`ADMIN_JWT_SECRET` in the `.env`.

## Frontend (web)
- The React + Vite UI lives in the `web/` directory. Run `cd web && npm install` first.
- `/login` – enter the admin password to store the JWT locally (`15px - bot pix`?). On success it routes to `/dashboard`.
- `/dashboard` – shows cards for total/paid/pending orders, accumulated paid amount, and per-option paid counts.
- `/menu` – preview and edit today’s `priceCents`/`deliveryFeeCents` (expressed as BRL and saved as cents). Success/failure messages inform the user.
- Set `VITE_API_BASE_URL` when building the static site so the UI can reach `https://your-backend/...`. Example (Render static site): `VITE_API_BASE_URL=https://botpixzap-backend.onrender.com`.
- Mobile-first styling comes from `src/style.css`; components live under `src/pages` and `src/components`.

## Deployment notes
1. **Backend (Render web service):**
   - Build command: `npm run build`
   - Start command: `npm run start`
   - Set environment variables: `DATABASE_URL`, `WA_*`, `MP_ACCESS_TOKEN`, `PUBLIC_BASE_URL`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`, `PORT`, `TZ=America/Bahia`.
   - The WhatsApp webhook callback should be `https://<public>/webhooks/whatsapp` and the Mercado Pago webhook `https://<public>/webhooks/mercadopago`.
2. **Frontend (Render static site or similar):**
   - Build command: `cd web && npm run build`
   - Publish directory: `web/dist`
   - Define `VITE_API_BASE_URL` pointing at the backend service URL.
   - Any changes to the static UI only require rebuilding the `web/` project; the backend stays unchanged.

## Environment variables (backend)
| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string used by Prisma. |
| `PORT` | Port where Express listens (defaults to `4000`). |
| `TZ` | Time zone used for silent-mode expiry (must be `America/Bahia`). |
| `WA_VERIFY_TOKEN` | Token used in webhook registration verification. |
| `WA_PHONE_NUMBER_ID` | WhatsApp Cloud phone number ID for the outgoing API call. |
| `WA_ACCESS_TOKEN` | Bearer token for the WhatsApp Cloud API. |
| `MP_ACCESS_TOKEN` | Mercado Pago bearer token used to request PIX charges. |
| `PUBLIC_BASE_URL` | Base URL to expose for people setting the webhook (used for documentation). |

## Seed data
`npm run seed` (which internally runs `prisma db seed`) will upsert a `Menu` record for the current date with `priceCents=1500` and `deliveryFeeCents=300`. Run it daily if you need fresh data.

## Mercado Pago integration
- `src/services/mercadoPago.ts` calls Mercado Pago’s `POST /v1/payments` with `payment_method_id=pix`, `transaction_amount` (BRL), and `payer.email` composed from the customer phone.
- `src/services/pix.ts` orchestrates the order update + PixCharge persistence that `createMercadoPagoPix` returns to the webhook handler.
- The WhatsApp reply is still sent through `sendText()` but it now uses the real copy/paste payload stored in `PixCharge`; failures will return a user-friendly retry message.

## Mercado Pago webhook
1. In your Mercado Pago business account, register `POST PUBLIC_BASE_URL/webhooks/mercadopago` as the endpoint receiving `payment` events (the same `PUBLIC_BASE_URL` used by this backend).
2. Mercado Pago signs requests with `MP_ACCESS_TOKEN`, but our endpoint simply parses the payload, reads `data.id` (or `resource.id`), and fetches the full payment details through `GET /v1/payments/{id}` using the same token.
3. Whenever a payment reaches `approved`, the webhook marks the matching order as `PAID`, updates the linked `PixCharge` status/raw payload, and always sends `PAGAMENTO CONFIRMADO COM SUCESSO ✅` via WhatsApp (even if the customer is silenced by the one-shot flow). Non-approved statuses only update the stored status without notifying the user.
# botpixzap
