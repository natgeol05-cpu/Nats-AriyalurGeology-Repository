# Vercel API Setup Guide (Fixing 404 on `/api/*`)

Use this guide when deployed API routes like `/api/health` or `/api/register` return `404 NOT_FOUND`.

## 1) Add required environment variables in Vercel

Open:

`https://vercel.com/<your-team>/<your-project>/settings/environment-variables`

For this repository, the current project settings page is:

`https://vercel.com/nats-geology-team/natsariyalurgeology/settings/environment-variables`

Add these variables for **Production**:

- `SUPABASE_URL` → Supabase Project URL (`https://<project>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase `service_role` key

Get both values from **Supabase Dashboard → Settings → API**.

## 2) Redeploy after saving variables

Any env-var change requires a redeploy.

```bash
vercel --prod --yes
```

Or push to `main` if your deployment is Git-triggered.

## 3) Wait for deployment to finish

Wait 2–3 minutes for Vercel build and serverless function rollout.

## 4) Verify endpoints

```bash
curl "https://<your-project>.vercel.app/api/health"
curl -X POST "https://<your-project>.vercel.app/api/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'
```

Expected health response status: `200`.

## 5) Verify API handlers are present in repository

Current serverless handlers:

- `api/health.js`
- `api/register.js`
- `api/fossils.js` (alias route)
- `api/fossil-details.js`
- `api/upload.js` (alias route)
- `api/upload-image.js`

These files must be included in the branch deployed by Vercel.

## 6) Optional diagnostics

Unix/macOS:

```bash
APP_HEALTH_URL="https://<your-project>.vercel.app/api/health" ./supabase-diagnostic.sh
```

Windows PowerShell:

```powershell
.\supabase-diagnostic.ps1 -AppHealthUrl "https://<your-project>.vercel.app/api/health"
```
