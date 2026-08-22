# AgroFresh Hosting Guide

## Recommended production setup

- Frontend/PWA: Vercel
- Node API: Railway or Render
- ML API: Render or Railway
- Database: Supabase
- Payments: Paystack
- SMS: Arkesel
- Email: EmailJS

Do not use ngrok in production. Use a permanent HTTPS backend URL for Paystack callbacks.

## 1. Prepare Supabase

Run these files in the Supabase SQL Editor:

```text
backend/migrations/postgres-schema.sql
backend/sql/notifications.sql
backend/sql/trust_reports.sql
backend/sql/payout_profile.sql
backend/sql/verification_and_otp_tables.sql
```

Confirm that `users`, `crops`, `orders`, `payments`, `payouts`, `notifications`, `complaints`, and OTP tables exist.

## 2. Deploy the Node backend

Create a Railway or Render web service connected to the repository.

Use:

```text
Root directory: backend
Build command: pnpm install
Start command: pnpm start
```

Set these environment variables in the host dashboard:

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=use-a-long-random-secret
PAYSTACK_SECRET_KEY=...
PAYSTACK_PUBLIC_KEY=...
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=https://your-api-domain.com/api/payments/webhook
EMAILJS_SERVICE_ID=...
EMAILJS_TEMPLATE_ID=...
EMAILJS_PUBLIC_KEY=...
ARKESEL_API_KEY=...
ARKESEL_SENDER=AgroFresh
```

After deployment, verify:

```text
https://your-api-domain.com/api/health
```

It should return a healthy JSON response.

## 3. Deploy the ML service

Create a second Railway or Render service.

```text
Root directory: backend-ml
Build command: pip install -r requirements.txt
Start command: uvicorn app:app --host 0.0.0.0 --port $PORT
```

Set any ML environment variables required by `backend-ml/config.py`.

Verify:

```text
https://your-ml-domain.com/api/health
```

Update the backend ML service URL if the backend environment uses a remote ML URL.

## 4. Deploy the frontend/PWA

Create a Vercel project connected to the repository.

```text
Install command: pnpm install
Build command: pnpm run build
Output directory: dist
```

Set:

```env
VITE_API_URL=https://your-api-domain.com
```

The PWA files are generated during the build:

```text
dist/manifest.webmanifest
dist/sw.js
dist/registerSW.js
```

Open the deployed site over HTTPS and use the browser menu to install AgroFresh.

## 5. Paystack configuration

In Paystack, use the permanent backend callback URL:

```text
https://your-api-domain.com/api/payments/webhook
```

Do not use a localhost or ngrok callback after deployment.

## Production Environment Variables

Set these in the hosting provider dashboards. Do not commit production secrets to `.env` files in Git.

### Node backend: Railway or Render

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-app.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
SESSION_SECRET=generate-a-long-random-secret

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_CALLBACK_URL=https://your-api-domain.com/api/payments/webhook

EMAILJS_SERVICE_ID=service_...
EMAILJS_TEMPLATE_ID=template_...
EMAILJS_PUBLIC_KEY=...
ARKESEL_API_KEY=your-production-arkesel-key
ARKESEL_SENDER=AgroFresh
```

Generate a session secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For Paystack testing, `sk_test_...` and `pk_test_...` may be used temporarily. Switch to `sk_live_...` and `pk_live_...` before accepting real payments.

### Vercel frontend

Set this in the Vercel project environment variables:

```env
VITE_API_URL=https://your-api-domain.com
```

Do not use `http://localhost:4000` in production. `VITE_API_URL` is embedded during the frontend build, so redeploy Vercel after changing it.

### ML service: Railway or Render

Use the variables required by `backend-ml/config.py`, commonly:

```env
PORT=8001
ENVIRONMENT=production
LOG_LEVEL=INFO
```

If the Node backend uses a remote ML service, set its production URL, for example:

```env
ML_SERVICE_URL=https://your-ml-domain.com
```

### Local-to-production replacements

Replace local development values:

```env
FRONTEND_URL=http://localhost:8080
PAYSTACK_CALLBACK_URL=http://localhost:4000/api/payments/webhook
VITE_API_URL=
```

With deployed values:

```env
FRONTEND_URL=https://your-app.vercel.app
PAYSTACK_CALLBACK_URL=https://your-api-domain.com/api/payments/webhook
VITE_API_URL=https://your-api-domain.com
```

Do not use ngrok for production. Restart or redeploy the backend after backend variable changes and redeploy the frontend after changing `VITE_API_URL`.

## 6. CORS and cookies

Set `FRONTEND_URL` to the exact deployed frontend origin, including `https://` and excluding a trailing slash. The backend uses credentialed sessions, so HTTPS is required in production.

## 7. Production test checklist

1. Open the deployed frontend.
2. Register a buyer with a real phone number.
3. Confirm signup OTP through Arkesel.
4. Log in and confirm login OTP.
5. Register/verify a farmer.
6. Upload and approve a crop.
7. Test farmer Availability and increase quantity.
8. Place a buyer order.
9. Complete a Paystack test payment.
10. Confirm buyer/farmer notifications and receipts.
11. Add farmer payout details in Profile.
12. Request payment from Farmer Payouts.
13. Mark the payout from the admin payout queue.

## Local production preview

```powershell
Set-Location C:\Users\noraa\Desktop\Agrofresh
pnpm run build
pnpm exec vite preview --host 0.0.0.0 --port 8080
```

Use `http://localhost:8080` for the local production preview. Keep the Node backend running separately on port 4000. Use ngrok only for local Paystack webhook testing.
