# Ariyalur Geology Website – Comprehensive Deployment Guide

This guide walks through the complete process of deploying the Ariyalur Geology website with a cloud backend. The backend uses **Vercel serverless functions** and **Supabase** (PostgreSQL database + object storage), replacing the previous localhost-only MySQL setup.

**Audience:** Beginners and advanced users.  
**Time to complete:** 45–90 minutes (first time).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pre-Deployment Setup](#2-pre-deployment-setup)
3. [Supabase Database Setup](#3-supabase-database-setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Backend Deployment to Vercel](#5-backend-deployment-to-vercel)
6. [Frontend Integration](#6-frontend-integration)
7. [CI/CD with GitHub Actions](#7-cicd-with-github-actions)
8. [Testing and Validation](#8-testing-and-validation)
9. [Production Deployment Checklist](#9-production-deployment-checklist)
10. [Post-Deployment Monitoring](#10-post-deployment-monitoring)
11. [Troubleshooting Guide](#11-troubleshooting-guide)

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                  USER'S BROWSER                       │
│  index.html / AriyalurGeologyPage.html                │
│  RegistrationForm.html / FossilDetailsForm.html       │
└──────────────────────┬────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼────────────────────────────────┐
│                 VERCEL CDN / EDGE                      │
│  Static HTML, images, videos served globally          │
│                                                       │
│  Serverless API Functions (Node.js 20):               │
│   /api/health          – system health check          │
│   /api/register        – visitor registration         │
│   /api/fossil-details  – fossil submissions (GET/POST)│
│   /api/upload-image    – image upload to storage      │
└──────────────────────┬────────────────────────────────┘
                       │ Supabase JS SDK (HTTPS)
┌──────────────────────▼────────────────────────────────┐
│                SUPABASE (PostgreSQL)                   │
│  Tables:                                              │
│   registrations   – visitor registrations             │
│   fossil_details  – specimen submissions              │
│   feedback        – visitor feedback                  │
│  Storage Bucket:                                      │
│   fossil-images   – uploaded fossil photographs       │
└───────────────────────────────────────────────────────┘
```

**Why Supabase instead of MySQL?**
- Free tier with 500 MB database + 1 GB storage
- Built-in REST API – no extra server needed
- Row Level Security for access control
- S3-compatible object storage for images
- Automatic backups
- Direct replacement for localhost:8080 MySQL

---

## 2. Pre-Deployment Setup

### 2.1 System Requirements

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| Node.js | 18.x or later | `node --version` |
| npm | 9.x or later | `npm --version` |
| Git | 2.x or later | `git --version` |

**Install Node.js** (if not installed):
- Download from https://nodejs.org (choose "LTS" version)
- Verify: `node --version` should show `v18.x.x` or higher

### 2.2 GitHub Repository Setup

1. Ensure your code is in a GitHub repository (it already is for this project).
2. If you haven't cloned it locally yet:
   ```bash
   git clone https://github.com/natgeol05-cpu/Nats-AriyalurGeology-Repository.git
   cd Nats-AriyalurGeology-Repository
   ```

3. Install Node.js dependencies:
   ```bash
   npm install
   ```

### 2.3 Required Accounts

Sign up (all free) at:
- **Supabase**: https://supabase.com — cloud database and storage
- **Vercel**: https://vercel.com — backend API and frontend hosting

---

## 3. Supabase Database Setup

### 3.1 Create a Supabase Project

1. Go to https://supabase.com and sign in (or sign up).
2. Click **"New Project"**.
3. Fill in:
   - **Name**: `ariyalur-geology`
   - **Database Password**: Choose a strong password and **save it securely**
   - **Region**: `Southeast Asia (Singapore)` (closest to India)
4. Click **"Create new project"**.
5. Wait 1–2 minutes for the project to initialise.

### 3.2 Create Database Tables

1. In your Supabase project, click **"SQL Editor"** in the left sidebar.
2. Click **"New query"**.
3. Open the file `supabase/migrations/001_initial_schema.sql` from this repository.
4. Copy the entire contents and paste it into the SQL Editor.
5. Click **"Run"** (or press `Ctrl+Enter`).
6. You should see: `Success. No rows returned`

This creates three tables:
- `registrations` – stores visitor registration data
- `fossil_details` – stores fossil specimen submissions
- `feedback` – stores visitor feedback messages

And sets up Row Level Security (RLS) policies so:
- Public users can submit registrations, fossil details, and feedback
- Public users can only *read* fossil details that have been **approved**
- Only the server (service role key) can read all data

### 3.3 Create Storage Bucket for Fossil Images

1. In Supabase, click **"Storage"** in the left sidebar.
2. Click **"New bucket"**.
3. Set:
   - **Name**: `fossil-images`
   - **Public bucket**: ✅ Enable (images must be publicly viewable)
4. Click **"Create bucket"**.

#### Set Storage Policies

1. Click on the `fossil-images` bucket.
2. Click **"Policies"** tab.
3. Click **"New Policy"** → **"For full customization"**.

**Policy 1 – Public can view images:**
```sql
-- Policy name: Allow public image reads
-- Allowed operation: SELECT
-- Target roles: anon
CREATE POLICY "Allow public image reads"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'fossil-images');
```

**Policy 2 – Server can upload images:**
```sql
-- Policy name: Allow service role uploads
-- Allowed operation: INSERT
-- Target roles: service_role
CREATE POLICY "Allow service role uploads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'fossil-images');
```

### 3.4 Get API Keys

1. In Supabase, click **"Settings"** (gear icon) → **"API"**.
2. Note down these values (you will need them in Step 4):

| Key | Where to Find | Usage |
|-----|--------------|-------|
| **Project URL** | "Project URL" section | `SUPABASE_URL` |
| **anon / public key** | "Project API keys" → `anon` | `SUPABASE_ANON_KEY` (browser safe) |
| **service_role key** | "Project API keys" → `service_role` | `SUPABASE_SERVICE_ROLE_KEY` (server only!) |

> ⚠️ **NEVER** put the `service_role` key in any HTML file or commit it to Git. It has full database access.

---

## 4. Environment Configuration

### 4.1 Local Development Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in a text editor and fill in the real values:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

   > For backend API health and registrations, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are mandatory.
   > If either is missing, `/api/register` returns a misconfiguration error and `/api/health` returns `503`.

3. Verify `.env` is listed in `.gitignore` (it already is):
   ```bash
   grep ".env" .gitignore
   # Should output: .env
   ```

### 4.2 GitHub Secrets Configuration

These secrets allow the CI/CD pipeline to deploy automatically.

1. Go to your GitHub repository.
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **"New repository secret"** for each of the following:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key |
| `VERCEL_TOKEN` | Your Vercel API token (see below) |
| `VERCEL_ORG_ID` | Your Vercel organisation ID (see below) |
| `VERCEL_PROJECT_ID` | Your Vercel project ID (see below) |

**Get Vercel tokens:**
1. Go to https://vercel.com → Account Settings → Tokens.
2. Click **"Create"**, name it `github-actions`, click **"Create Token"**.
3. Copy the token (shown only once) → save as `VERCEL_TOKEN`.
4. Your Org ID and Project ID are found in the Vercel project under Settings → General.

### 4.3 Vercel Environment Variables (Production)

1. Go to your Vercel project dashboard.
2. Click **Settings** → **Environment Variables**.
3. Add each variable for **Production** environment:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key |

---

## 5. Backend Deployment to Vercel

### 5.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 5.2 Link the Project to Vercel

```bash
vercel login
# Follow the browser prompt to authenticate

vercel link
# Select: "Link to existing project" or create new
# Project name: ariyalur-geology
```

### 5.3 Set Environment Variables via CLI

```bash
vercel env add SUPABASE_URL
# Enter your Supabase URL when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter your service role key when prompted
# Select: Production, Preview, Development
```

### 5.4 Local Testing Before Deployment

Run the API locally with Vercel dev server:

```bash
vercel dev
```

This starts the server at `http://localhost:3000`. Test the API:

```bash
# Health check
curl http://localhost:3000/api/health

# Test registration
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@geology.com","phone":"9999999999"}'

# Test fossil details submission
curl -X POST http://localhost:3000/api/fossil-details \
  -H "Content-Type: application/json" \
  -d '{
    "fossil_name": "Calycoceras",
    "collector_name": "Dr Gowtham",
    "collector_email": "gowtham@geology.com",
    "field_number": "NAT-2024-001"
  }'
```

### 5.5 Run Unit Tests

```bash
npm test
```

Expected output: `17 tests total, 17 passed, 0 failed`

### 5.6 Deploy to Vercel

```bash
# Deploy to production
vercel --prod
```

Vercel will:
1. Build the serverless functions in `api/`
2. Deploy static HTML files to the CDN
3. Output your deployment URL: `https://your-project.vercel.app`

---

## 6. Frontend Integration

### 6.1 Forms Already Updated

The following HTML pages have been updated to use the cloud API (no more `localhost:8080`):

| Page | Change Made |
|------|-------------|
| `RegistrationForm.html` | New form, connects to `/api/register` |
| `FossilDetailsForm.html` | New form with image upload, connects to `/api/fossil-details` + `/api/upload-image` |
| `UploadFossilImageAndDetails.html` | Updated instructions, links to new cloud forms |
| `AriyalurGeologyPage.html` | Registration button updated to `RegistrationForm.html` |

### 6.2 How the Frontend Calls the API

The forms use the browser `fetch()` API with relative URLs:
```javascript
const API_URL = window.location.origin + '/api/register';
// When deployed: https://your-project.vercel.app/api/register
// When local:    http://localhost:3000/api/register
```

This means **no code change is needed** after deployment — it works automatically in both local and production environments.

### 6.3 Testing the Registration Form

1. Open `https://your-deployment.vercel.app/RegistrationForm.html`
2. Fill in: Name, Email, Phone (optional), Institution (optional), Purpose
3. Click **Register**
4. Expected: Green success message "Thank you, [Name]! Your registration is successful."
5. Verify in Supabase: Dashboard → Table Editor → `registrations`

### 6.4 Testing the Fossil Details Form

1. Open `https://your-deployment.vercel.app/UploadFossilImageAndDetails.html`
2. Click **"Fossil Details & Image Upload"**
3. Fill in all required fields (marked with *)
4. Select 1–4 images (JPEG/PNG, each < 250 KB)
5. Click **"Submit Fossil Details"**
6. Expected: Green success message with a submission ID
7. Verify in Supabase:
   - Table Editor → `fossil_details` (status = 'pending')
   - Storage → `fossil-images` bucket (uploaded images)

### 6.5 Reviewing and Approving Fossil Submissions

Submitted fossils start with `status = 'pending'`. To approve a submission:

1. Go to Supabase Dashboard → Table Editor → `fossil_details`
2. Find the submission you want to approve
3. Change `status` from `pending` to `approved`
4. Approved fossils will appear in the public `/api/fossil-details` GET response

---

## 7. CI/CD with GitHub Actions

### 7.1 Workflow Overview

The `.github/workflows/deploy.yml` workflow runs automatically on:
- **Every push to `main`** → validates + deploys to production
- **Every pull request to `main`** → validates + deploys a preview URL

### 7.2 Workflow Jobs

| Job | Trigger | Steps |
|-----|---------|-------|
| `validate` | All pushes and PRs | Install deps, validate JSON, check files, lint JS, run tests |
| `deploy-preview` | Pull Requests | Deploy preview to Vercel, comment URL on PR |
| `deploy-production` | Push to main | Deploy to Vercel production, run health check |

### 7.3 Required GitHub Secrets

Ensure all secrets from [Section 4.2](#42-github-secrets-configuration) are set before the workflow can deploy.

### 7.4 Monitoring Workflow Runs

1. In your GitHub repository, click the **Actions** tab.
2. You will see a list of all workflow runs.
3. Click any run to see detailed logs for each job.
4. If a run fails, the error message pinpoints the problem.

### 7.5 Workflow Validation Checks

The CI pipeline automatically checks:
- `vercel.json` is valid JSON
- All required API files exist (`api/register.js`, etc.)
- All required HTML form files exist
- No `localhost:8080` references remain in HTML files
- JavaScript syntax is valid
- All 17 unit tests pass

---

## 8. Testing and Validation

### 8.1 Unit Tests

```bash
npm test
```

Tests cover all API endpoints including:
- HTTP method validation (405 for wrong methods)
- Input validation (400 for missing/invalid fields)
- Email format validation
- File type and size validation for uploads
- Success responses (201)
- Database error handling (500)

### 8.2 Integration Testing (Manual)

After deployment, verify each endpoint:

```bash
BASE_URL="https://your-project.vercel.app"

# 1. Health check
curl "${BASE_URL}/api/health"
# Expected: {"api":"ok","database":"ok","storage":"ok","timestamp":"..."}

# 2. Registration
curl -X POST "${BASE_URL}/api/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Integration Test","email":"test@ariyalur.com"}'
# Expected: {"success":true,"message":"Thank you...","registration_id":"..."}

# 3. Fossil details GET (should return empty array initially)
curl "${BASE_URL}/api/fossil-details"
# Expected: {"success":true,"fossils":[]}

# 4. Fossil details POST
curl -X POST "${BASE_URL}/api/fossil-details" \
  -H "Content-Type: application/json" \
  -d '{"fossil_name":"Ammonite","collector_name":"Tester","collector_email":"tester@geo.com","field_number":"TEST-001"}'
# Expected: {"success":true,"message":"Thank you...","submission_id":"..."}
```

### 8.3 Form Testing (Browser)

| Form | URL | Test Actions |
|------|-----|-------------|
| Registration | `/RegistrationForm.html` | Submit valid data; try invalid email; try missing name |
| Fossil Details | `/FossilDetailsForm.html` | Submit with images; try files > 250 KB; try non-image files |
| Feedback | `/FeedBackGoogleSheetData.html` | Submit feedback (existing SheetDB integration) |

### 8.4 Performance Testing

Use browser DevTools (F12 → Network tab) to check:
- API response times should be < 2 seconds
- Images should load in < 1 second (compressed to < 250 KB)
- No console errors

---

## 9. Production Deployment Checklist

Before going live, verify each item:

### Pre-Deployment
- [ ] Supabase project created and tables created (SQL migration run)
- [ ] `fossil-images` storage bucket created with correct policies
- [ ] All Supabase keys noted down securely
- [ ] `.env` file created locally with real values
- [ ] `npm test` runs: all 17 tests pass
- [ ] `vercel dev` starts without errors
- [ ] Registration form works locally
- [ ] Fossil details form works locally (images upload)
- [ ] No `localhost:8080` in any HTML file

### Vercel Setup
- [ ] Vercel account created
- [ ] Project linked with `vercel link`
- [ ] Environment variables set in Vercel dashboard:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`

### GitHub Setup
- [ ] All GitHub Secrets set:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`

### Post-Deploy Verification
- [ ] `https://your-project.vercel.app/api/health` returns `{"api":"ok",...}`
- [ ] Registration form submits successfully
- [ ] Fossil image upload succeeds
- [ ] Fossil details form submits successfully
- [ ] Supabase tables show new records
- [ ] GitHub Actions workflow shows green checkmarks

---

## 10. Post-Deployment Monitoring

### 10.1 Supabase Dashboard

Monitor your database at https://supabase.com:
- **Table Editor** – view all registrations, fossil submissions, feedback
- **Storage** – browse uploaded fossil images
- **Logs** – view recent API and database activity
- **Database** → **Backups** – Supabase creates automatic daily backups (Pro plan)

### 10.2 Vercel Dashboard

Monitor deployments at https://vercel.com:
- **Overview** – see all deployments and their status
- **Functions** – view serverless function invocations and errors
- **Analytics** – see visitor traffic and performance
- **Logs** – real-time function execution logs

### 10.3 GitHub Actions

Monitor CI/CD at `https://github.com/natgeol05-cpu/Nats-AriyalurGeology-Repository/actions`:
- All workflow runs are logged
- Failed deployments send email notifications to the repository owner

### 10.4 Manual Health Check Schedule

Run this regularly (e.g., weekly):
```bash
curl https://your-project.vercel.app/api/health
```

### 10.5 Backup Procedures

**Database Backup (manual):**
1. Supabase Dashboard → Settings → Database → Backups
2. Click **"Download"** next to the latest backup
3. Store the backup file securely (e.g., Google Drive, external disk)

**Image Backup:**
```bash
# Using Supabase CLI (optional)
supabase storage download fossil-images --project-ref your-project-id
```

**Code Backup:**
The GitHub repository **is** your code backup. Every `git push` is a backup.

---

## 11. Troubleshooting Guide

### 11.1 Common Issues

#### "Registration failed. Please try again."
**Cause:** API cannot reach Supabase, or duplicate email.

**Check:**
1. Open browser DevTools → Network tab → look for the `/api/register` request
2. Check the response body for the error message
3. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel environment variables
4. Check Supabase Logs for database errors

```bash
# Test API directly
curl -X POST https://your-project.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}'
```

#### "Image upload failed"
**Cause:** Storage bucket missing, wrong permissions, or file too large.

**Check:**
1. Verify `fossil-images` bucket exists in Supabase Storage
2. Verify bucket is set to **Public**
3. Verify the storage policies allow `service_role` uploads
4. Verify image is < 250 KB (use reduceimages.com to compress)
5. Verify image format is JPEG, JPG, PNG, or GIF

#### API returns 500 error
**Cause:** Database connection failed or schema mismatch.

**Check:**
1. Go to Supabase → Logs → check for errors
2. Verify environment variables in Vercel match Supabase credentials
3. Re-run the SQL migration: paste `001_initial_schema.sql` contents into SQL Editor and run

```bash
# Check health endpoint for database status
curl https://your-project.vercel.app/api/health
# If database: "error" – environment variables are wrong or DB is down
```

#### GitHub Actions workflow fails
**Cause:** Missing secrets, test failures, or syntax errors.

**Check:**
1. Go to GitHub → Actions → click the failed run → expand the failed step
2. Common causes:
   - **"VERCEL_TOKEN is required"** → add `VERCEL_TOKEN` to GitHub Secrets
   - **"Tests failed"** → run `npm test` locally and fix the failing test
   - **"vercel.json invalid"** → validate JSON at https://jsonlint.com
   - **"localhost:8080 found"** → search for and remove any remaining localhost references

#### Forms not submitting (no response)
**Cause:** CORS error or JavaScript error.

**Check:**
1. Open browser DevTools → Console tab
2. Look for red error messages
3. Common causes:
   - **CORS error** → API is not allowing the origin (should not happen with current setup)
   - **network error** → check internet connection and Vercel deployment status
   - **JavaScript error** → fix the script error shown in Console

### 11.2 Log Analysis

**Vercel Function Logs:**
1. Vercel Dashboard → your project → Functions tab
2. Click on a function name to see recent invocations
3. Click an invocation to see the full request/response log

**Supabase Database Logs:**
1. Supabase Dashboard → Logs → Database
2. Filter by time range and severity
3. Look for `ERROR` level messages

**Browser DevTools:**
```
F12 → Network tab → filter by "Fetch/XHR"
→ find the API call → click it → see Request/Response
```

### 11.3 Debug Procedures

**Test API endpoints with curl:**
```bash
# Health check (most basic test)
curl -v https://your-project.vercel.app/api/health

# Registration with verbose output
curl -v -X POST https://your-project.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Debug Test","email":"debug@test.com"}'
```

**Verify Supabase connection:**
1. Supabase Dashboard → SQL Editor
2. Run: `SELECT count(*) FROM registrations;`
3. If this works, the database is healthy

**Run configuration verification script:**
```bash
chmod +x ./supabase-diagnostic.sh
./supabase-diagnostic.sh

# Optional: also verify deployed health endpoint
APP_HEALTH_URL="https://your-project.vercel.app/api/health" ./supabase-diagnostic.sh
```

**Interpret `/api/health` output:**
- `200` + `"api":"ok"` → Supabase config/connectivity checks passed
- `503` + `"configuration":{"status":"error","missingEnvVars":[...]}` → missing required env vars
- `503` + `"api":"degraded"` with database/storage error → Supabase URL/key may be invalid or inaccessible

**Re-deploy from scratch:**
```bash
# Remove cached Vercel config and redeploy
rm -rf .vercel
vercel link    # re-link project
vercel --prod  # fresh deployment
```

### 11.4 Performance Optimization

**Images loading slowly:**
- All fossil images should be < 250 KB (already enforced by upload form)
- Use WebP format where possible for even smaller file sizes
- Vercel CDN automatically caches static files globally

**API responses slow (> 2 seconds):**
- Check Supabase region (should be Singapore for best India latency)
- Add database indexes (already included in migration for common query columns)
- Cold start latency (first request after inactivity): 1–3 seconds is normal for Vercel serverless

**Database query slow:**
- Add indexes for frequently queried columns:
  ```sql
  -- Already included in migration, but verify with:
  SELECT indexname FROM pg_indexes WHERE tablename = 'registrations';
  ```

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Live Website | https://your-project.vercel.app |
| Registration Form | https://your-project.vercel.app/RegistrationForm.html |
| Fossil Details Form | https://your-project.vercel.app/FossilDetailsForm.html |
| Health Check API | https://your-project.vercel.app/api/health |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Actions | https://github.com/natgeol05-cpu/Nats-AriyalurGeology-Repository/actions |

| Contact | Details |
|---------|---------|
| Website Owner | natgeolo5@gmail.com |
| Technical Advisors | Dr K Ayyaswami, Dr B Gowtham, D Charles |

---

*This deployment guide was created as part of the Ariyalur Geology website cloud migration from a local MySQL + Tomcat setup to a fully cloud-hosted solution using Supabase and Vercel.*
