# FYC Marketplace Frontend

React 19 and TypeScript frontend for FYC Marketplace.

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
The frontend does not persist the coordinates. Buyers can search within 100 m,
500 m, 1 km, 5 km, 10 km, or across all listings with known distances. The
interface explains approximate readings, allows location refresh, and always
supports browsing without location access.

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
