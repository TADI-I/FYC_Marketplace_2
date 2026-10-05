# FYC TUT Marketplace

Student marketplace with a React frontend and an Express/MongoDB backend.
Students browse listings and arrange listing purchases directly with sellers.
Standard seller access costs R25 per month through the standalone LBG Payment
Service. Free periods and discounts are configurable offers: eligible users
must explicitly claim an offer before its access period begins.

## Architecture

```text
React frontend ──> Marketplace Express API ──> MongoDB
                         │
                         └──> LBG Payment Service ──> Paystack
                                      │
                                      └── signed callback ──> Marketplace API
```

The Marketplace backend never holds a Paystack secret. It authenticates to LBG
Payment Service with a Marketplace-specific service credential. Paid access is
activated or extended only after a signed payment callback matches the local
subscription order. Promotional access is activated only by an eligible,
recorded offer claim.

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

## Seller activation and subscription flow

1. A user may choose Seller at registration or later use **Profile → Become a Seller**. This does not automatically start a free period.
2. The backend checks active `sellerOffers` against configurable eligibility rules and the user's prior `sellerOfferClaims`.
3. Eligible offers are shown in a premium in-app modal. No browser notification or native alert is used, and login or offer discovery does not activate access.
4. The user explicitly claims an offer. The backend creates a unique claim, creates a `sellerSubscriptions` access period, and reactivates seller access.
5. When the promotional period expires, access returns to `PAYMENT_REQUIRED`; the claim history remains, preventing the same offer from being claimed again.
6. Without an eligible offer, Marketplace starts standard R25 checkout and creates a local order priced at `2500` minor units (`R25.00`).
7. Paid seller access begins only after a matching, verified `PAYMENT_SUCCESS` callback.

The immediate promotion is seeded as `SELLER_REACTIVATION_2_MONTHS`. It is
available to previously active sellers whose access has expired and can be
claimed once per account. Future promotions can use the same infrastructure by
adding an offer definition rather than rewriting subscription logic.

```text
users                       account type and current denormalized access state
sellerSubscriptions         paid or promotional access periods
sellerOffers                configurable duration, price, schedule, and rules
sellerOfferClaims           who claimed an offer and when it runs
```

Relevant endpoints:

```text
POST /api/users/:id/upgrade           Seller activation/options or paid checkout
POST /api/subscriptions/checkout       Authenticated paid renewal checkout
GET  /api/seller-offers/eligible       Claimable offers for the current user
POST /api/seller-offers/:offerId/claim Claim an eligible offer
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
- Never activate paid seller access from the browser return URL.
- Never accept a client-provided subscription amount.
- Keep callback processing idempotent and retain the unique callback-event index.
- Rotate credentials separately per environment when exposure is suspected.

## License

MIT — see `LICENSE` when present.
