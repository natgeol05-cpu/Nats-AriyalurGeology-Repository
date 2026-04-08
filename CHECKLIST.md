# Ariyalur Geology Website — Deployment & Operations Checklist

> Use this checklist before, during, and after every deployment.
> Check each item (`[x]`) as you complete it.
> Items marked ⚠️ are blocking — do not proceed until resolved.

---

## Part 1 — Pre-Setup Checklist

Complete these steps **before** running any setup script.

### Accounts & Access

- [ ] GitHub account created and logged in
- [ ] Supabase account created at <https://supabase.com>
- [ ] Vercel account created at <https://vercel.com> (connect via GitHub)
- [ ] Repository `natgeol05-cpu/Nats-AriyalurGeology-Repository` cloned locally

### Local Tools

- [ ] Git installed (`git --version` → v2.30+)
- [ ] Node.js installed (`node --version` → v18+)
- [ ] npm installed (`npm --version` → v9+)
- [ ] curl installed (`curl --version`)
- [ ] Text editor or IDE available (VS Code recommended)

### Supabase Project Setup

- [ ] New Supabase project created (name: `ariyalur-geology`)
- [ ] Project region set to nearest to India (e.g., `ap-south-1`)
- [ ] `SUPABASE_URL` copied from: **Project → Settings → API → Project URL**
- [ ] `SUPABASE_SERVICE_ROLE_KEY` copied from: **Project → Settings → API → service_role key**
  - ⚠️ **Never expose this key in frontend code or public repositories**

---

## Part 2 — Setup Verification Steps

Run these after `./setup.sh` completes.

### File Structure

- [ ] `backend/` directory exists
- [ ] `backend/package.json` exists
- [ ] `backend/server.js` exists
- [ ] `backend/.env` exists (not committed to git)
- [ ] `backend/.env.example` exists (safe to commit)
- [ ] `backend/.gitignore` contains `.env` and `node_modules/`
- [ ] `backend/node_modules/` exists and is populated

### Database Tables

Run in **Supabase SQL Editor** (Project → SQL Editor):

- [ ] `registrations` table created (see schema in `ARCHITECTURE.md`)
- [ ] `fossil_details` table created
- [ ] Row Level Security (RLS) enabled on both tables
- [ ] RLS policy: service role can read/write all rows
- [ ] RLS policy: anonymous users can only INSERT into `registrations`

### Storage Bucket

In Supabase dashboard → **Storage**:

- [ ] `fossil-images` bucket created
- [ ] Bucket set to **Public** (so images are accessible via URL)
- [ ] File size limit set to 10 MB
- [ ] Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### Environment Variables

- [ ] `SUPABASE_URL` set in `backend/.env` (no placeholder text)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in `backend/.env`
- [ ] `PORT` set (default: `8080`)
- [ ] `NODE_ENV` set to `development` for local, `production` for deployed
- [ ] `CORS_ORIGIN` includes your frontend URL

---

## Part 3 — Pre-Deployment Validation

Run `./setup-env.sh --full` to automate these checks.

### Code Quality

- [ ] All tests pass: `cd backend && npm test`
- [ ] No lint errors: `cd backend && npm run lint` (if configured)
- [ ] `backend/server.js` handles errors gracefully (try/catch on all routes)
- [ ] No hardcoded credentials or secrets in any source file

### API Endpoint Tests (manual)

Test each endpoint with `curl` or Postman:

- [ ] `GET  /health` → returns `{ "status": "ok" }`
- [ ] `POST /api/register` with valid body → returns `{ "success": true, "id": "..." }`
- [ ] `POST /api/register` with missing fields → returns HTTP 400
- [ ] `POST /api/fossils` with valid body → returns `{ "success": true }`
- [ ] `POST /api/upload` with image file → returns `{ "url": "https://..." }`
- [ ] `GET  /api/fossils` → returns array of fossil records

### Security

- [ ] CORS is restricted to allowed origins (not `*` in production)
- [ ] Rate limiting is active (test: send 101 requests in 15 min — 101st should get 429)
- [ ] Helmet security headers present (check: `curl -I https://your-api/health`)
- [ ] File upload validates MIME type (test: upload a `.txt` file — should be rejected)
- [ ] No `.env` file in git history: `git log --all --full-history -- backend/.env`

---

## Part 4 — Post-Deployment Verification

Run `./verify-deployment.sh --env production` to automate these checks.

### Frontend

- [ ] `https://natswebsite.com` loads without errors
- [ ] `https://natswebsite.com/index.html` → Home page visible
- [ ] `https://natswebsite.com/AriyalurFossilsGallery.html` → Gallery visible
- [ ] `https://natswebsite.com/UploadFossilImageAndDetails.html` → Upload form visible
- [ ] Registration form submits successfully (end-to-end test)
- [ ] Fossil upload form submits successfully (end-to-end test)
- [ ] Uploaded image appears in fossil gallery

### Backend

- [ ] `https://your-api-url/health` → HTTP 200 with `{ "status": "ok" }`
- [ ] Backend response time < 2 seconds (cold start)
- [ ] Backend response time < 500 ms (warm)
- [ ] Error responses return proper JSON (not HTML error pages)

### Database

- [ ] Test registration appears in Supabase `registrations` table
- [ ] Test fossil record appears in `fossil_details` table
- [ ] Test image appears in `fossil-images` storage bucket
- [ ] Supabase dashboard shows no connection errors

### GitHub Actions CI

- [ ] Latest workflow run on `main` branch: ✅ green
- [ ] No failed jobs in `.github/workflows/`
- [ ] Build artefacts uploaded successfully

---

## Part 5 — Monitoring Setup Checklist

### Uptime Monitoring

- [ ] Uptime monitor configured for `https://natswebsite.com`
  - Recommended: UptimeRobot (free), Better Uptime, or Vercel Analytics
- [ ] Uptime monitor configured for backend `/health` endpoint
- [ ] Alert email set up (notify on downtime > 5 minutes)

### Error Tracking

- [ ] Vercel deployment logs enabled (Vercel → Project → Logs)
- [ ] Supabase logs reviewed (Supabase → Logs → API logs)
- [ ] Backend error logging writes to `backend/logs/error.log`
  - [ ] Log rotation configured (max 10 MB, keep 7 days)

### Performance Monitoring

- [ ] Vercel Analytics enabled (free with Vercel account)
- [ ] Core Web Vitals targets:
  - [ ] LCP (Largest Contentful Paint) < 2.5 s
  - [ ] FID (First Input Delay) < 100 ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Supabase API response time < 200 ms (check in Supabase dashboard)

### Alerts

- [ ] Email alert on > 3 consecutive failed health checks
- [ ] Alert on > 10 API errors in 5 minutes
- [ ] Alert on Supabase storage > 80% of free quota (1 GB)
- [ ] Alert on Supabase DB rows > 80% of free quota (50,000 rows)

---

## Part 6 — Security Checklist

### Secrets Management

- [ ] `backend/.env` is in `.gitignore`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **not** in frontend JavaScript
- [ ] All secrets stored in GitHub Secrets (Settings → Secrets → Actions)
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] Secrets rotated if they were ever accidentally committed

### Network Security

- [ ] HTTPS enforced (no HTTP endpoints in production)
- [ ] CORS allows only `https://natswebsite.com` (not `*`)
- [ ] Rate limiting: 100 requests per 15 minutes per IP
- [ ] Supabase RLS policies reviewed and tested

### Input Validation

- [ ] All form inputs validated on backend (not just frontend)
- [ ] Image upload: file size limit enforced (10 MB)
- [ ] Image upload: MIME type validation (only `image/*`)
- [ ] Text inputs sanitised to prevent XSS
- [ ] Email format validated with regex

### Dependency Security

- [ ] `npm audit` shows no critical or high vulnerabilities
  - Run: `cd backend && npm audit`
  - Fix: `cd backend && npm audit fix`
- [ ] Dependencies up to date: `cd backend && npm outdated`
- [ ] `package-lock.json` committed to version control

---

## Quick Reference Commands

```bash
# Setup
./setup.sh                     # Initial environment setup
./setup-env.sh --full           # Validate env and test connectivity

# Development
cd backend && npm start         # Start backend (port 8080)
cd backend && npm run dev       # Start with auto-reload (nodemon)
cd backend && npm test          # Run all tests

# Verification
./verify-deployment.sh --env production   # Full deployment check
./verify-deployment.sh --env staging      # Staging check

# Git
git push origin main            # Trigger CI/CD pipeline
```
