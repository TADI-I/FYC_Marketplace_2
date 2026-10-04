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

## Payments

The frontend asks the Marketplace backend to start the R25 seller-subscription
checkout, then redirects the browser to the authorization URL returned by the
backend. Returning to the frontend does not prove payment. Seller access changes
only after the backend receives and verifies the signed callback from LBG
Payment Service.

Listing purchases are arranged directly between buyers and sellers and do not
use this subscription checkout.

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
