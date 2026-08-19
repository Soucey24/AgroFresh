# AgroFresh Development Runbook

This document describes how to run AgroFresh locally on Windows and troubleshoot the common `fetch failed` errors.

## Services and Ports

| Service | Port | Purpose |
|---|---:|---|
| Frontend | 8080 | Vite React application |
| Node backend | 4000 | Express API, sessions, Supabase, Paystack, notifications |
| ML backend | 8001 | FastAPI crop and freshness services |
| ngrok | public URL | Exposes backend port 4000 for Paystack callbacks |

The frontend calls `/api/...`. Vite proxies those requests from port 8080 to `http://localhost:4000` using [vite.config.ts](vite.config.ts).

## Prerequisites

Install or verify:

```powershell
node --version
pnpm --version
python --version
```

Install dependencies once:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm install
pnpm --dir backend install
Set-Location backend-ml
python -m pip install -r requirements.txt
Set-Location ..
```

## Start the ML Backend

Open a dedicated terminal:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh\backend-ml
python -m uvicorn app:app --reload --port 8001
```

Verify it:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/health | ConvertTo-Json
```

Expected result:

```json
{"status":"ok"}
```

The ML service is optional for basic login, browsing, orders, and payments, but required for ML-powered crop analysis and predictions.

## Start the Node Backend

Open another terminal:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm --dir backend start
```

Do not run `node app.js` from the workspace root. The backend command must run in the `backend` directory, where its `.env` file is loaded.

Verify it:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health | ConvertTo-Json
```

Expected result:

```json
{
  "status": "ok",
  "environment": "development"
}
```

The backend requires `backend/.env` with at least:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=...
```

Payment and notification configuration is also stored in `backend/.env`:

```env
PAYSTACK_SECRET_KEY=...
PAYSTACK_PUBLIC_KEY=...
PAYSTACK_CALLBACK_URL=https://YOUR-NGROK-HOST/api/payments/webhook
EMAILJS_SERVICE_ID=...
EMAILJS_TEMPLATE_ID=...
EMAILJS_PUBLIC_KEY=...
ARKESEL_API_KEY=...
ARKESEL_SENDER=AgroFresh
```

Never commit or paste secret values into source files or chat.

## Start ngrok for Paystack

The Node backend must already be running on port 4000.

Open another terminal:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm exec ngrok config add-authtoken YOUR_NGROK_TOKEN
pnpm exec ngrok http 4000
```

Run the `config add-authtoken` command only once. Enter the token directly in the terminal.

Copy the HTTPS forwarding URL, for example:

```text
https://example.ngrok-free.dev
```

Set this callback in `backend/.env`:

```env
PAYSTACK_CALLBACK_URL=https://example.ngrok-free.dev/api/payments/webhook
```

Restart the Node backend after changing `.env`.

Verify the tunnel:

```powershell
Invoke-RestMethod https://example.ngrok-free.dev/api/health -Headers @{ 'ngrok-skip-browser-warning' = 'true' } | ConvertTo-Json
```

Keep the ngrok terminal open during Paystack tests. The free ngrok hostname can change when the tunnel restarts.

## Start the Frontend

Open another terminal:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm dev
```

Open:

```text
http://localhost:8080
```

The Vite proxy sends frontend `/api` requests to port 4000. You normally do not need to set `VITE_API_URL` during local development.

## Recommended Startup Order

1. Start ML on port 8001.
2. Start Node backend on port 4000.
3. Start ngrok for port 4000 if testing Paystack callbacks.
4. Start the frontend on port 8080.
5. Open `http://localhost:8080`.

## Health Checks

Run these from PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8001/api/health | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8080/api/health | ConvertTo-Json
```

Check listening ports:

```powershell
Get-NetTCPConnection -State Listen |
  Where-Object { $_.LocalPort -in 4000, 8001, 8080 } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

## Troubleshooting `TypeError: fetch failed`

These messages:

```text
Failed to fetch profile TypeError: fetch failed
Failed to fetch notifications TypeError: fetch failed
[500] Login failed TypeError: fetch failed
```

mean the browser could not establish a connection to the API. They occur before normal authentication, notification, or Supabase logic runs.

Check the backend first:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health | ConvertTo-Json
```

If this fails, start the backend:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm --dir backend start
```

Then check the Vite proxy:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/health | ConvertTo-Json
```

If port 4000 reports `EADDRINUSE`, another backend is already running. Do not start a second one. Find it:

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

Test the existing process first:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/health | ConvertTo-Json
```

If the existing process is stale, stop only its process ID and start the backend again:

```powershell
Stop-Process -Id PROCESS_ID -Force
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm --dir backend start
```

If the backend is healthy but the browser still fails:

1. Confirm the browser is open at `http://localhost:8080`, not a different port.
2. Hard refresh with `Ctrl+F5`.
3. Confirm the Vite terminal is still running.
4. Confirm `vite.config.ts` still proxies `/api` to `http://localhost:4000`.
5. Restart Vite after changing Vite configuration.
6. Check the browser Network tab for the exact failed URL.

## Login Flow

Login now works as follows:

1. User enters email and password.
2. Backend finds the account and automatically determines its role.
3. Backend sends a six-digit OTP through Arkesel to the saved phone number.
4. User enters the OTP.
5. Backend creates the authenticated session.
6. User is routed automatically to the buyer, farmer, or admin area.

A user without a phone number cannot complete two-factor login. Add the phone number in Profile first.

## Payment Test Flow

1. Start backend, ngrok, frontend, and ML if needed.
2. Log in with email, password, and the Arkesel OTP.
3. Add an approved farmer product to the cart.
4. Open Checkout.
5. Choose Card, Bank, or Mobile Money.
6. Complete Paystack test payment.
7. Paystack calls the public ngrok webhook.
8. Backend verifies the payment.
9. Buyer and farmer receive in-app, SMS, and email notifications.
10. Buyer is redirected to `/buyer-orders`.
11. Buyer and farmer can download digital receipts from their order pages.

## Database SQL Files

Run these in Supabase SQL Editor when setting up a new database or feature:

- `backend/migrations/postgres-schema.sql` - main schema
- `backend/sql/notifications.sql` - in-app notifications
- `backend/sql/trust_reports.sql` - complaints and farmer reports
- `backend/sql/verification_and_otp_tables.sql` - phone OTP and farmer verification tables

## Useful Commands

Frontend build:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
$env:NODE_OPTIONS='--max-old-space-size=4096'
pnpm run build
```

Frontend lint:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm run lint
```

Backend syntax checks:

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh\backend
node --check app.js
node --check controllers/authController.js
node --check controllers/paymentController.js
node --check services/notificationService.js
```

## Current Local Status

At the time this runbook was written, the following direct checks succeeded:

- Node backend health: `http://127.0.0.1:4000/api/health`
- ML health: `http://127.0.0.1:8001/api/health`
- Vite proxy health: `http://127.0.0.1:8080/api/health`

Therefore, if the same `fetch failed` errors appear again, the backend was likely stopped or restarting at the moment the browser made its request. Start the services in the order above and refresh the browser after the backend health check succeeds.
