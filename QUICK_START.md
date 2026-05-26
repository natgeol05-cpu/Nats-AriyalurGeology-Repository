# Quick Start: Restore Vercel API

If `/api/health` or `/api/register` returns `404 NOT_FOUND`, do this:

1. Add in Vercel (**Production**):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Redeploy:
   ```bash
   vercel --prod --yes
   ```
3. Wait 2–3 minutes.
4. Test:
   ```bash
   curl "https://<your-project>.vercel.app/api/health"
   ```

Expected:

- HTTP `200`
- `"configuration":{"status":"ok","missingEnvVars":[]}`
- `"database":"ok"`
- `"storage":"ok"`

If you get `503` with `"configuration":{"status":"malformed"...}`, re-enter the listed `malformedEnvVars` in Vercel as plain text (no leading/trailing spaces, line breaks, smart punctuation/bullets, or other non-ASCII characters), redeploy, then call `/api/health` again.

## Windows check command

```powershell
.\supabase-diagnostic.ps1 -AppHealthUrl "https://<your-project>.vercel.app/api/health"
```

## Unix/macOS check command

```bash
APP_HEALTH_URL="https://<your-project>.vercel.app/api/health" ./supabase-diagnostic.sh
```
