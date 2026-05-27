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
4. Confirm values are plain ASCII text with:
   - no leading/trailing whitespace
   - no line breaks
   - no smart punctuation/bullets
   - no other non-ASCII characters
5. Redeploy after changes.

## Health Endpoint Diagnostics

Call:

```bash
curl -s https://your-project.vercel.app/api/health | jq
```

- `200` + `"api":"ok"` means configuration and connectivity checks passed.
- `503` + `"configuration":{"status":"error"...}` means missing env vars.
- `503` + `"configuration":{"status":"malformed"...}` means env vars are present but malformed. Check `configuration.malformedEnvVars`, fix values in Vercel, redeploy, then call `/api/health` again.
- `503` + `"api":"degraded"` means Supabase connectivity failed; verify URL/key values.

### Malformed env-var recovery flow

1. Delete and re-add malformed variables (`SUPABASE_URL` and/or `SUPABASE_SERVICE_ROLE_KEY`) in Vercel.
2. Paste directly from **Supabase Dashboard → Settings → API** as plain text (no quotes, bullets, or extra whitespace).
3. Redeploy.
4. Re-run `/api/health` and confirm:
   - `configuration.status` is `ok`
   - `configuration.malformedEnvVars` is empty
