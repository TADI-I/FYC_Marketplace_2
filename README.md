# FYC TUT Marketplace

Student marketplace with a React frontend and an Express/MongoDB backend.
Students browse listings and arrange listing purchases directly with sellers.
The platform itself charges sellers a server-priced R25 monthly subscription
through the standalone LBG Payment Service.

## Architecture

```text
React frontend ──> Marketplace Express API ──> MongoDB
                         │
                         └──> LBG Payment Service ──> Paystack
                                      │
                                      └── signed callback ──> Marketplace API
```

The Marketplace backend never holds a Paystack secret. It authenticates to LBG
Payment Service with a Marketplace-specific service credential. Seller access
is activated or extended only after a signed payment callback matches the local
subscription order.

Listing purchases are still private transactions between buyers and sellers;
they are not processed by the platform payment integration.

## Stack

- Frontend: React 19, TypeScript, Create React App
- Backend: Node.js 18+, Express 5, MongoDB native driver
- Authentication: JWT bearer tokens
- Images: MongoDB GridFS
- Payments: LBG Payment Service with Paystack-hosted checkout
- Tests: Node test runner for the backend and React Testing Library for the frontend

## Repository layout

```text
frontend/   React application
backend/    Express API, MongoDB access, payment callbacks, and tests
```

## Local development

Prerequisites:

- Node.js 18 or newer
- npm
- MongoDB
- A running LBG Payment Service configured with Paystack test credentials

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
```

Confirm `frontend/.env` contains:

```text
REACT_APP_API_BASE=http://localhost:5001
REACT_APP_PAYMENT_SERVICE_URL=http://localhost:4100
```

Then start the frontend:

```bash
npm start
```

The local frontend runs on port `3000`; the backend defaults to port `5001`.

## Backend environment

Use `backend/.env.example` as the source of truth.

| Variable | Purpose |
| --- | --- |
| `PORT` | Express listen port; Render supplies this in production |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Strong, stable JWT signing secret |
| `FRONTEND_URL` | Public frontend origin used for payment return URLs |
| `PAYMENT_SERVICE_URL` | Public HTTPS base URL of LBG Payment Service |
| `PAYMENT_SERVICE_KEY_ID` | Marketplace service key ID |
| `PAYMENT_SERVICE_SECRET` | Marketplace service secret, at least 32 characters |
| `PAYMENT_SERVICE_CALLBACK_SECRET` | Secret used to verify signed callbacks |

No `PAYSTACK_SECRET_KEY` belongs in this repository.

### Payment credential mapping

These values must match across the two backends:

```text
Marketplace PAYMENT_SERVICE_KEY_ID
  = Payment Service MARKETPLACE_SERVICE_KEY_ID

Marketplace PAYMENT_SERVICE_SECRET
  = Payment Service MARKETPLACE_SERVICE_SECRET

Marketplace PAYMENT_SERVICE_CALLBACK_SECRET
  = Payment Service MARKETPLACE_CALLBACK_SECRET
```

Use different secrets for service authentication and callbacks, and different
credentials for development, staging, and production.

### Cold-start warm-up

On first visit, and when a marketplace tab becomes active after five minutes,
the frontend sends a non-blocking request to `/api/warmup`. This wakes the
Marketplace backend, which calls the Payment Service `/health` endpoint. The UI
does not wait for the call and never receives Payment Service credentials.

`REACT_APP_PAYMENT_SERVICE_URL` is optional. When it is set to the public
Payment Service base URL, the frontend also sends an opaque request to its
public `/health` route in parallel with the Marketplace backend request. The
Marketplace backend warm-up remains the authoritative dependency probe, so the
Payment Service is still woken when this frontend variable is omitted. The
variable is a public URL only and must never contain credentials.

Browser calls are throttled and backend dependency probes are deduplicated for
30 seconds. This reduces cold-start delays without needing a third-party uptime
monitor and does not replace normal checkout availability handling.

The Payment Service must also contain:

```text
MARKETPLACE_CALLBACK_URL=https://<marketplace-backend>/api/webhooks/payments
MARKETPLACE_RETURN_URL=https://<marketplace-frontend>/?payment=return
```

Current production values:

```text
Marketplace frontend:       https://marketplace.lbgsoftware.co.za
Marketplace backend:        https://marketplace.firstyearcouncil.co.za
Marketplace Render origin:  https://fyc-marketplace-tut.onrender.com
Payment Service:             https://lbg-payment-service.onrender.com

MARKETPLACE_CALLBACK_URL=https://marketplace.firstyearcouncil.co.za/api/webhooks/payments
MARKETPLACE_RETURN_URL=https://marketplace.lbgsoftware.co.za/?payment=return
```

The Marketplace backend and Payment Service must use the same Marketplace key
ID, service secret, and callback secret. Never place either secret in the
frontend or in this document.

## Seller subscription payment flow

1. An authenticated user starts checkout with `POST /api/subscriptions/checkout`.
2. Marketplace creates a local 30-minute subscription order priced on the server at `2500` minor units (`R25.00`).
3. Marketplace creates an idempotent central payment using the local order ID.
4. The browser is redirected to the Paystack-hosted authorization URL.
5. Paystack notifies LBG Payment Service; the browser return is not payment proof.
6. LBG Payment Service verifies the provider event and sends Marketplace a signed callback.
7. Marketplace validates the HMAC signature and five-minute timestamp window, deduplicates the event ID, and compares product, user, order, central payment ID, reference, amount, and currency.
8. Seller access is activated only after a matching `PAYMENT_SUCCESS` callback.
9. Any older pending manual reactivation request for that seller is marked
   approved automatically, and the seller's saved listings become visible
   immediately through the active-subscription product filter.

Relevant endpoints:

```text
POST /api/subscriptions/checkout       Authenticated seller checkout
POST /api/users/:id/upgrade           Authenticated compatibility route
POST /api/webhooks/payments            Signed internal callback
GET  /api/health                       Backend health check
```

Callback headers:

```text
x-lbg-event-id
x-lbg-timestamp
x-lbg-signature
```

The signature is HMAC-SHA256 over `<timestamp>.<raw-json-body>` using
`PAYMENT_SERVICE_CALLBACK_SECRET`.

## Deployment order

1. Deploy LBG Payment Service as a public Render Web Service using Docker.
2. Apply its Prisma migration and run `npm run db:seed` so the Marketplace service client exists.
3. Configure Paystack to call `https://<payment-service>/api/v1/webhooks/paystack`.
4. Deploy the Marketplace backend with its production MongoDB, JWT, frontend, and Payment Service values.
5. Set `MARKETPLACE_CALLBACK_URL` and `MARKETPLACE_RETURN_URL` in the Payment Service.
6. Deploy the frontend with `REACT_APP_API_BASE` pointing to the public Marketplace backend.
7. Complete an end-to-end Paystack test-mode subscription before switching to live credentials.

If the Payment Service reports Prisma `P2021` for a table such as
`CallbackDelivery`, its own PostgreSQL migration is missing or it is connected
to the wrong database. Fix the Payment Service database; do not bypass callback
verification or manually activate a seller.

## Verification

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test -- --watchAll=false
npm run build
```

Payment tests cover callback signatures, timestamp expiry, payload validation,
and subscription-period behavior.

## Security rules

- Never commit `.env` files or production credentials.
- Never expose Payment Service credentials in the React environment.
- Never activate seller access from the browser return URL.
- Never accept a client-provided subscription amount.
- Keep callback processing idempotent and retain the unique callback-event index.
- Rotate credentials separately per environment when exposure is suspected.

## License

MIT — see `LICENSE` when present.
