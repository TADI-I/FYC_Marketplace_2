# FYC Marketplace

Student marketplace with a React frontend and an Express/MongoDB backend.
Students browse listings and arrange listing purchases directly with sellers.
Standard seller access costs R25 per month through the standalone LBG Payment
Service. Free periods and discounts are configurable offers: eligible users
must explicitly claim an offer before its access period begins.

## Product capabilities

- Location-assisted discovery sorts eligible listings by distance without storing a buyer's live coordinates.
- Campus recognition accounts for browser-reported accuracy instead of guessing from an imprecise reading.
- Buyers can restrict nearby results to 100 m, 500 m, 1 km, 5 km, 10 km, or all available distances.
- Administrators can review marketplace totals, process seller verification, edit user details and roles, manage verification badges, and suspend or restore accounts.
- Shared skeleton layouts preserve the page shape while dashboards, profiles, listings, analytics, verification, and chats load.
- Non-blocking application feedback uses accessible queued toasts; actions requiring a decision use an accessible confirmation dialog.
- Public support and company details are supplied from one frontend configuration module and can be overridden at build time.

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
REACT_APP_SUPPORT_EMAIL=support@lbgsoftware.co.za
REACT_APP_SUPPORT_PHONE_DISPLAY=+27 71 112 6204
REACT_APP_SUPPORT_PHONE_DIGITS=27711126204
REACT_APP_COMPANY_WEBSITE=https://www.lbgsoftware.co.za
REACT_APP_MARKETPLACE_WEBSITE=https://marketplace.lbgsoftware.co.za
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
| `JWT_SECRET` | Strong, stable JWT signing secret of at least 32 characters; startup fails closed if missing or left as a placeholder |
| `FRONTEND_URL` | Public frontend origin used for payment return URLs |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact frontend origins allowed to call the API; use `https://marketplace.lbgsoftware.co.za` in production |
| `RESEND_API_KEY` | Marketplace-only Resend key with Sending access, restricted to the verified sending domain |
| `EMAIL_FROM` | Verified sender, for example `FYC Marketplace <marketplace@lbgsoftware.co.za>` |
| `EMAIL_REPLY_TO` | Monitored reply-to mailbox |
| `SUPPORT_EMAIL` | Monitored destination for the Marketplace contact form |
| `EMAIL_DELIVERY_DISABLED` | `false` in production; tests use `true` to avoid external delivery |
| `PAYMENT_SERVICE_URL` | Public HTTPS base URL of LBG Payment Service |
| `PAYMENT_SERVICE_KEY_ID` | Marketplace service key ID |
| `PAYMENT_SERVICE_SECRET` | Marketplace service secret, at least 32 characters |
| `PAYMENT_SERVICE_CALLBACK_SECRET` | Secret used to verify signed callbacks |

No `PAYSTACK_SECRET_KEY` belongs in this repository.

`backend/render-env.example` is the copy/paste checklist for Render. It contains names and placeholders only—never put completed secret values in a tracked file.

## Transactional email

The backend sends Marketplace email through a dedicated Resend sending-only key. Supported flows include:

- new-account email verification and verification-link resend;
- single-use, one-hour password reset links;
- confirmation and decision notices for seller verification;
- seller subscription activation notices;
- unread private-message alerts that never include the private message body and are sent only after the message has remained unread for 10 minutes;
- support-form delivery plus a receipt to the sender; and
- seller subscription reminders seven days and one day before expiry.

New accounts cannot sign in until the email address is verified. Existing accounts without an `emailVerified` field are grandfathered so deployment does not lock out the current user base. Profile email changes remain pending for 10 minutes and do not replace the verified address until the new address is confirmed. Password reset and email-change flows store only SHA-256 token hashes; password changes invalidate JWT sessions issued before the change.

The frontend uses history-aware SPA routes for every page-level component, including `/about`, `/faq`, `/profile`, `/seller/products`, `/seller/products/new`, `/products/:id`, `/login`, and `/register`. Authentication actions use `/verify-email`, `/reset-password`, and `/confirm-email-change`. The production static host must rewrite all unmatched frontend paths to `index.html` so direct links and browser refreshes load the React application. API and backend `/p/:id` routes must remain excluded from that frontend rewrite. Returning from an authentication action performs a full navigation to `/` to clear action state.

Product cards offer WhatsApp or authenticated in-app chat. In-app threads are scoped to a product and its seller, are available from `/messages`, and store read receipts in MongoDB. Run `npm run email:unread-messages` from `backend/` every minute using the production scheduler. The job selects messages that have remained unread for at least 10 minutes, rechecks read state immediately before delivery, groups pending messages by product conversation, and records delivery idempotently in `emailNotificationEvents`. This scheduled job must be enabled in production; the web process does not use unreliable in-memory timers for delayed email.

Seller WhatsApp numbers are excluded from public listing, nearby-search, seller-listing, and social-preview responses. An authenticated account must request `GET /api/products/:id/contact` before the frontend can open WhatsApp. Shared listing links use the public `REACT_APP_MARKETPLACE_WEBSITE` origin and the `/products/:id` route rather than the backend API origin.

## Location-assisted discovery

The browser asks for location only after the buyer chooses **Use My Location**. The
reading contains latitude, longitude, and the browser's accuracy estimate. It is
kept in React state, sent only in the body of a nearby-products request, and is
not persisted by the Marketplace application. Buyers can disable discovery or
continue browsing without granting permission.

Nearby results are calculated with Haversine distance and sorted nearest first.
Location resolution uses the first valid coordinate source in this order:

1. listing pickup coordinates;
2. seller pickup coordinates; and
3. registered campus coordinates.

Listings without usable coordinates sort last when the buyer selects all
distances, and are excluded from bounded-radius searches. Normal seller-access,
listing-status, search, category, and campus restrictions still apply before
distance pagination.

Campus coordinates and independently configurable recognition radii are stored
in the `campuses` collection. A campus is recognized only when the full browser
accuracy circle fits inside its recognition radius. Server startup idempotently
creates or updates the campus points without overwriting a radius that an
administrator has adjusted.

To run the location migration independently:

```bash
cd backend
npm run locations:backfill
```

Configure `MONGODB_URI` and, when necessary, `DB_NAME` before running the command.

Nearby requests use `POST /api/products/nearby`, keeping buyer coordinates out
of URLs and access logs. The accepted `radiusKm` values are `0.1`, `0.5`, `1`,
`5`, `10`, and `"all"`. The response includes `distanceMeters`,
`locationSource`, pagination metadata, and a recognized campus when the reading
is sufficiently accurate. Raw pickup coordinates are not returned in product
results, and nearby responses use `Cache-Control: no-store`.

Example request:

```json
{
  "latitude": -25.7315,
  "longitude": 28.1612,
  "accuracy": 20,
  "radiusKm": 1,
  "page": 1,
  "limit": 20,
  "filters": {
    "search": "textbook",
    "category": "Books"
  }
}
```

## Admin dashboard and account control

All admin routes require a current JWT and the administrator role from the
database. The role is re-read on each authenticated request, so a stale token
cannot retain removed administrator privileges.

The dashboard exposes these operational totals:

- all users and sellers;
- active sellers;
- live listings;
- pending seller-verification requests; and
- suspended users.

Administrators can edit a user's name, email address, campus, WhatsApp number,
buyer/seller role, and verified-seller badge. They can also suspend or restore
non-admin accounts. An administrator cannot suspend their own account.

Suspension is enforced by the backend rather than only hidden in the interface:

- new logins are rejected;
- existing JWT sessions are rejected on their next authenticated request;
- seller subscription checks reject the account; and
- the seller's listings are excluded from public and nearby discovery.

Relevant endpoints:

```text
GET   /api/admin/overview          Operational dashboard totals
GET   /api/admin/users             User list, optionally filtered by type
PATCH /api/admin/users/:id         Admin-controlled account update
GET   /api/admin/reactivation-requests
POST  /api/admin/reactivation-requests/:requestId/process
GET   /api/verification/requests
POST  /api/verification/:requestId/process
```

Password hashes and account-token hashes are excluded from admin user responses.

## Loading and notification conventions

Use the shared components in `frontend/src/LoadingSkeletons.tsx` for initial
loading states. Available layouts are `ListSkeleton`, `DashboardSkeleton`,
`ProfileSkeleton`, and `CardGridSkeleton`. Keep already-loaded content visible
during background refreshes instead of replacing it with a full-page spinner.

Use `showNotification` for success, error, warning, and informational feedback.
These notifications appear as queued, auto-dismissing, accessible toasts. Use
`showConfirmation` only when the user must explicitly approve or cancel an
action, such as suspending an account or deleting a listing. Contextual field
validation remains next to the affected field.

## Public contact configuration

The public contact source of truth is `frontend/src/siteConfig.ts`. Components
must read from `SITE_CONTACT` or `supportWhatsAppUrl` rather than hard-coding
contact details.

| Frontend variable | Default |
| --- | --- |
| `REACT_APP_SUPPORT_EMAIL` | `support@lbgsoftware.co.za` |
| `REACT_APP_SUPPORT_PHONE_DISPLAY` | `+27 71 112 6204` |
| `REACT_APP_SUPPORT_PHONE_DIGITS` | `27711126204` |
| `REACT_APP_COMPANY_WEBSITE` | `https://www.lbgsoftware.co.za` |
| `REACT_APP_MARKETPLACE_WEBSITE` | `https://marketplace.lbgsoftware.co.za` |

Because Create React App injects these values at build time, rebuild and
redeploy the frontend after changing them. Backend support mail continues to
use `SUPPORT_EMAIL`, while replies use `EMAIL_REPLY_TO`.

## Scheduled email reminders

Run the reminder job once per day:

```bash
npm run email:reminders
```

In Render, configure this command as a daily Cron Job using the same Marketplace environment variables. Reminder delivery is recorded in `emailNotificationEvents` to avoid sending the same scheduled reminder again.

## Payment credential mapping

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

## Cold-start warm-up

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

Production URL mapping:

```text
Marketplace frontend:       https://marketplace.lbgsoftware.co.za
Marketplace backend:        https://<marketplace-backend>
Payment Service:             https://lbg-payment-service.onrender.com

MARKETPLACE_CALLBACK_URL=https://<marketplace-backend>/api/webhooks/payments
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
and subscription-period behavior. Location tests cover coordinate validation,
distance calculation, accuracy-aware campus recognition, deterministic nearby
ranking, pagination, and privacy-safe response shaping. Admin tests cover
dashboard totals, suspension audit fields, and self-suspension protection.

## Security rules

- Never commit `.env` files or production credentials.
- Never expose Payment Service credentials in the React environment.
- Never activate paid seller access from the browser return URL.
- Never accept a client-provided subscription amount.
- Keep callback processing idempotent and retain the unique callback-event index.
- Rotate credentials separately per environment when exposure is suspected.
- Treat browser coordinates as ephemeral request data; do not log or persist them.
- Enforce suspension and administrator privileges on the backend, never only in the React interface.

## License

MIT — see `LICENSE` when present.
