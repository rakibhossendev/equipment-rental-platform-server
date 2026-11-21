# AGENTS.md

Express 5 (ESM) + MongoDB backend for the equipment rental platform. The client app is the sibling directory `../equipment-rental-platform` (serves `http://localhost:3000`); this server is its API.

## Commands

- `npm start` — run (`node src/server.js`).
- `npm run dev` — nodemon, but **nodemon is not in package.json**; it only works because it's installed globally here. On a fresh clone use `npm start` or `npx nodemon src/server.js`.
- No lint, typecheck, or test suite exists (`npm test` exits 1 by design). The only verification is starting the server and hitting endpoints; `GET /` returns plain HTML "Express server is running..".
- Config comes from a gitignored `.env` at the repo root, loaded by absolute path in `src/config/env.js` (cwd doesn't matter). Required: `MONGODB_DATABASE_URL`, `CLIENT_SIDE_BASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; optional `PORT` (default 5000). Missing values only log "Env not found" — no fail-fast.

## Layout & request flow

- Entry: `src/server.js` (connects Mongo, then listens) → `src/app.js` (middleware + route mounts). New routes must be registered manually in `src/app.js`; mount paths are flat and don't mirror filenames: `/users`, `/equipments`, `/add-equipment`, `/update-user-role`, `/update-equipment-status`, `/my-equipments`, `/payments`.
- All responses go through `sendAPIResponse(response, data, success, statusCode, message)` (`src/utils/apiResponse.js`) → JSON `{ success, message, data }`. Handler convention: try/catch with an explicit numeric status, e.g. `sendAPIResponse(response, null, false, 400, "...")`.
- Mongo: DB name is hardcoded `equipment-rental-platform-db` in `src/config/db.js`; collections are `equipments`, `user` (singular!), `bookings`, `payments`. Import collection handles from that file.

## Auth — owned by the client app

- Tokens are issued by the client; this server only verifies them via remote JWKS at `${CLIENT_SIDE_BASE_URL}/api/auth/jwks` (`src/middleware/auth.js`). Don't add login/token issuance here.
- `request.user` is the JWT payload: `sub` = the user's Mongo `_id` string, plus `email` and `role`. Roles: `admin`, `owner`, `customer`. `verifyRole(...)` reads the role from the token, not the DB.
- Guard routes with `checkAuthenticateUser` first, then `verifyRole(...)`.

## Payments

- `POST /payments/stripe` inserts a **Pending** booking *before* creating the Stripe Checkout session (currency `bdt`, amounts ×100), passing `metadata.bookingId`.
- `/payments/webhook` is mounted with `express.raw` **before** `express.json()` in `src/app.js` — keep that order or Stripe signature verification breaks (raw body required).
- The webhook runs a MongoDB transaction (`client.startSession().withTransaction`), so it needs a replica set/Atlas — a standalone local mongod will fail. Idempotency comes from the `paymentStatus === "Paid"` guard + `payments` upsert on `stripeSessionId`.
- Local end-to-end test: `stripe listen --forward-to localhost:5000/payments/webhook`.

## Gotchas

- **`ApiError` arguments are inverted at every call site.** The constructor is `(errorMessage, statusCode)` (`src/utils/apiError.js`), but callers do `new ApiError(404, "Data not found")`, so `error.statusCode` holds the message string and `error.message` holds the number. Any handler that throws `ApiError` and catches it itself (most of `src/routes/user/user.route.js`) then passes a non-numeric status to `response.status()`, which throws — the client gets an **HTML 500 instead of JSON** (Express 5 rejects non-integer status codes). There is no global error middleware. Prefer explicit numeric statuses in `sendAPIResponse`; if you fix `ApiError`, fix its order and all call sites together.
- Public equipment queries (`GET /equipments`) only return `status: "Approved"`; the allowed statuses are `Pending | Approved | Rejected`, flipped by admin via `PATCH /update-equipment-status/:id`.
- ESM: keep `.js` extensions on relative imports. Both `import { Router } from "express"` and `import Router from "express"` appear; the latter is the app factory being used as a router — don't be confused by it.
- `.env*` and `.vercel/` are gitignored; never commit them.
