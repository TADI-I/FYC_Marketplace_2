# FYC Marketplace Frontend

React 19 and TypeScript frontend for FYC TUT Marketplace.

## Environment

Create `.env` in this directory:

```text
REACT_APP_API_BASE=http://localhost:5001
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
offer creates its access period and removes that offer from the eligible list. Without an eligible offer, the
frontend starts R25 seller-subscription checkout and redirects to the returned
authorization URL. Returning to the frontend does not prove payment; paid
access changes only after the backend verifies the signed callback from LBG
Payment Service.

Listing purchases are arranged directly between buyers and sellers and do not
use this subscription checkout.

All application-level feedback—including login and registration messages,
admin results, sharing feedback, errors, and destructive confirmations—uses the
shared queued in-app modal system. The frontend does not use browser `alert`,
`confirm`, or Notification API pop-ups.

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
