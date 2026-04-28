# Environment Verification Guide

Use this guide when the registration API returns **"Server misconfiguration"** or data is not reaching the `registrations` table.

## Required Environment Variables

For backend API routes (`/api/register`, `/api/health`) you must set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Use `.env.example` as the template:

```bash
cp .env.example .env
```

Then fill in real values from **Supabase Dashboard → Settings → API**.

## Verify Configuration Locally

Run the diagnostic script:

```bash
chmod +x ./supabase-diagnostic.sh
./supabase-diagnostic.sh
```

Optional: also verify deployed API health by passing `APP_HEALTH_URL`:

```bash
APP_HEALTH_URL="https://your-project.vercel.app/api/health" ./supabase-diagnostic.sh
```

Windows PowerShell equivalent:

```powershell
.\supabase-diagnostic.ps1
.\supabase-diagnostic.ps1 -AppHealthUrl "https://your-project.vercel.app/api/health"
```

## Verify in Vercel

1. Open Vercel project settings.
2. Go to **Environment Variables**.
3. Confirm both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist for the target environment.
4. Redeploy after changes.

## Health Endpoint Diagnostics

Call:

```bash
curl -s https://your-project.vercel.app/api/health | jq
```

- `200` + `"api":"ok"` means configuration and connectivity checks passed.
- `503` + `"configuration":{"status":"error"...}` means missing env vars.
- `503` + `"api":"degraded"` means Supabase connectivity failed; verify URL/key values.
