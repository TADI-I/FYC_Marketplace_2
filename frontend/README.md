# Campus Cart Frontend

React 19 and TypeScript frontend for Campus Cart.

## Brand and assets

The visible product name is **Campus Cart** across navigation, metadata,
transactional email, and support copy. Use the existing assets:

- `public/campus-cart-logo.png` for the full wordmark and social preview;
- `public/campus-cart.svg` for the favicon and compact app mark.

The transparent wordmark is placed on a controlled surface so it remains clear
in light and dark mode. Keep the surrounding header or card contrast rather
than applying arbitrary filters to the logo. LBG Software is the supporting
company, not the marketplace display name.

## Environment

Create `.env` in this directory:

```text
REACT_APP_API_BASE=http://localhost:5001
REACT_APP_PAYMENT_SERVICE_URL=http://localhost:4100
REACT_APP_SUPPORT_EMAIL=support@lbgsoftware.co.za
REACT_APP_SUPPORT_PHONE_DISPLAY=+27 71 112 6204
REACT_APP_SUPPORT_PHONE_DIGITS=27711126204
REACT_APP_COMPANY_WEBSITE=https://www.lbgsoftware.co.za
REACT_APP_MARKETPLACE_WEBSITE=https://marketplace.lbgsoftware.co.za
```

In production, set `REACT_APP_API_BASE` to the public HTTPS URL of the
Marketplace backend. This is a build-time Create React App variable, so rebuild
the frontend after changing it.

Do not place `PAYMENT_SERVICE_SECRET`, `PAYMENT_SERVICE_CALLBACK_SECRET`, a
Paystack secret, MongoDB credentials, or JWT secrets in the frontend
environment.

## Development

```bash
npm install
npm start
```

The development server opens at `http://localhost:3000` and expects the backend
at the configured `REACT_APP_API_BASE`.

## Seller activation and payments

Seller promotions are claim-based. After login, the frontend asks the backend
for offers the current user is eligible to claim. Eligible promotions are shown
in an accessible in-app modal rather than a browser notification or native
alert. Merely loading the account does not start a free period. Claiming an
offer creates its access period and removes that offer from the eligible list.
Without an eligible offer, the frontend starts R25 seller-subscription checkout
and redirects to the returned authorization URL. Returning to the frontend does
not prove payment; paid access changes only after the backend verifies the
signed callback from LBG Payment Service.

Listing purchases are arranged directly between buyers and sellers and do not
use this subscription checkout.

## Nearby discovery

Nearby discovery is opt-in. The buyer's browser coordinates and accuracy are
held only in React state and sent in the body of `POST /api/products/nearby`.
The frontend does not persist the coordinates. When location is enabled, all
eligible listings remain visible and are sorted from closest to furthest;
listings without usable coordinates appear last. The interface explains
approximate readings, allows location refresh, and always supports browsing
without location access.

The campus selector also provides **Other campus or residence** for accredited
residences and other supported locations that are not formal campuses. This
choice reveals `CustomLocationCapture`, which collects a short public place
name and requests the browser location only after the user presses the capture
button. Registration requires both values. Profile editing can reuse an
existing saved point or explicitly replace it.

Buyer discovery coordinates remain in component state only. Seller custom
coordinates are sent to the backend for private account storage, but the
frontend receives only `locationLabel` and `hasCustomLocation`. Never render,
cache, or log a seller's raw coordinate.

Product location text is resolved in this order:

1. a seller's custom `sellerLocationLabel`;
2. the display name of a known campus; and
3. the safe fallback **Other campus or residence**.

## Listing loading and product sharing

Marketplace pagination is automatic. An `IntersectionObserver` sentinel loads
the next page near the end of the grid and keeps existing products visible
during the request. The initial request uses card skeletons; continuation uses
a compact inline loading indicator. Do not restore a required **Load more**
button.

All share actions must use `marketplaceProductUrl()` from `src/siteConfig.ts`.
Canonical links have the form:

```text
https://marketplace.lbgsoftware.co.za/products/<product-id>
```

The shared route renders a focused product card inside the normal application
shell. It must not render a duplicate marketplace heading or action toolbar.

## Contact and messaging

The product **Chat** action opens `ContactSellerModal` with two choices:

- in-app chat, scoped to the selected product and seller; and
- WhatsApp, using a contact number retrieved from the protected contact API.

Both paths require authentication. When an anonymous visitor makes a choice,
store only the intended product or conversation route in session storage,
direct the visitor to login or registration, and resume the action afterward.
Public product payloads must not contain WhatsApp numbers.

The messages pages use `/messages` and
`/messages/:participantId?product=:id`. The backend sends a Campus Cart email
only after a message remains unread for 10 minutes; email bodies do not contain
the private message text.

## Loading states and feedback

Use the shared layouts exported from `src/LoadingSkeletons.tsx` for initial
loads:

- `DashboardSkeleton` for dashboard totals and activity;
- `ProfileSkeleton` for profile and account views;
- `CardGridSkeleton` for listing grids; and
- `ListSkeleton` for users, verification, and chat content.

Keep previously loaded data visible during refreshes whenever possible.

Application-level success, error, warning, and information feedback uses
`showNotification` from `src/AppNotificationModal.tsx`. Notifications are
queued, accessible toasts and dismiss automatically. Use `showConfirmation`
for decisions that require explicit approval, such as deleting a listing or
suspending an account. Field validation stays beside its field. Do not use the
browser `alert`, `confirm`, or Notification APIs.

Modals should use the shared modal surface and normal-sized footer controls.
Keep headers, bodies, and footers visually distinct; allow the body to scroll on
short viewports; and supply explicit dark-mode styles for surfaces, fields,
borders, and buttons. Avoid fixed or stretched button heights.

## Admin interface

The admin dashboard shows user, seller, active-seller, live-listing,
pending-verification, and suspension totals. Administrators can edit user
details, switch non-admin users between buyer and seller roles, manage the
verified-seller badge, and suspend or restore accounts. These controls call
administrator-only backend routes; frontend visibility is not the security
boundary.

## Contact information

`src/siteConfig.ts` is the single public source of truth for LBG Software
support details and company links. Use `SITE_CONTACT` and
`supportWhatsAppUrl()` in components instead of embedding addresses, telephone
numbers, or URLs. The `REACT_APP_*` contact variables are build-time values, so
the frontend must be rebuilt after they change.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Marketplace grid with search, filters, nearby ordering, and automatic pagination |
| `/products/:id` | Canonical shared-product view |
| `/messages` | Authenticated conversation list |
| `/messages/:participantId?product=:id` | Product-scoped conversation |
| `/profile` | Account, seller access, verification, and saved location |
| `/seller/products` | Seller listing workspace |
| `/seller/products/new` | New listing editor |
| `/admin/reactivation` | Administrator dashboard and account controls |
| `/how-it-works` | Buyer, seller, safety, messaging, and location guidance |
| `/about`, `/faq`, `/contact`, `/privacy`, `/terms` | Public information and policy pages |
| `/login`, `/register` | Authentication entry points |
| `/verify-email`, `/reset-password`, `/confirm-email-change` | Email action routes |

Direct navigation and refresh require the production host to rewrite unmatched
frontend routes to `index.html`. Do not rewrite backend API routes.

## Verification

```bash
npm test -- --watchAll=false
npm run build
```

## Production build

```bash
npm run build
```

Deploy the generated `build/` directory to the frontend host and configure SPA
fallback routing to `index.html`.
