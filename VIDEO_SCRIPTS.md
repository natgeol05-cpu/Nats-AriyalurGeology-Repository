# Ariyalur Geology Website — Video Tutorial Scripts

This document contains scripts for six video tutorials covering the complete
setup and deployment of the Ariyalur Geology website's cloud backend.

Estimated total viewing time: **~90 minutes**

---

## Tutorial 1 — Introduction & Project Overview (10 min)

### Thumbnail Text
"Build a Cloud Geology Website | Supabase + Vercel + GitHub"

### Script

---

**[INTRO — 0:00–0:30]**

*[Show website at natswebsite.com]*

"Welcome! In this series, we're going to take this Ariyalur Geology website —
which right now has forms that don't work because they need a database — and
transform it into a fully functional cloud-powered website.

By the end of this series, visitors will be able to register, submit fossil
details, and upload images — all saved to a cloud database you can access from
anywhere."

---

**[OVERVIEW — 0:30–2:00]**

*[Show architecture diagram from ARCHITECTURE.md]*

"Here's what we're building. We have three main pieces:

**Number one** — the frontend. This is the HTML website you see here, hosted on
GitHub Pages and Vercel. It already exists.

**Number two** — the backend. We'll create a Node.js API server that handles
form submissions and file uploads. We'll deploy this to Vercel as serverless
functions.

**Number three** — the database. We'll use Supabase — a cloud PostgreSQL
database with a built-in file storage system. It has a generous free tier,
perfect for this project."

---

**[WHAT WE NEED — 2:00–4:00]**

*[Show checklist]*

"Before we start, you'll need:

- A GitHub account — free at github.com
- A Supabase account — free at supabase.com
- A Vercel account — free at vercel.com, connect it to your GitHub account
- Node.js version 18 or higher installed on your computer

Open a terminal and verify Node.js is installed by running: `node --version`

You should see a version number starting with 18 or higher."

---

**[TOOLS WE'LL USE — 4:00–7:00]**

*[Show code editor]*

"We'll use:
- **Supabase** as our database and file storage — think of it as a cloud MySQL
  replacement that's much easier to set up
- **Express.js** as our backend framework — the same kind of server that powers
  millions of websites
- **Vercel** to deploy both the frontend and backend — it connects directly to
  GitHub so every time you push code, it deploys automatically"

---

**[SERIES OUTLINE — 7:00–9:30]**

"Here's our plan across six videos:

- Video 2: Set up the Supabase database and storage
- Video 3: Build and deploy the backend API
- Video 4: Connect the frontend forms to the API
- Video 5: Test everything end-to-end
- Video 6: Set up monitoring so you know when things go wrong

Each video builds on the previous one, so follow along in order."

---

**[OUTRO — 9:30–10:00]**

"Let's get started! Click the next video in this playlist to begin setting up
your Supabase database. See you there!"

---

---

## Tutorial 2 — Supabase Setup (15 min)

### Thumbnail Text
"Supabase Database Setup in 15 Min | Free Cloud PostgreSQL"

### Script

---

**[INTRO — 0:00–1:00]**

*[Show Supabase homepage]*

"In this video we're going to set up our cloud database using Supabase. By the
end, we'll have two tables — one for registrations, one for fossil details — and
a storage bucket for fossil images. Let's go!"

---

**[CREATE ACCOUNT — 1:00–3:00]**

*[Screen recording: sign up at supabase.com]*

"Go to supabase.com and click 'Start your project'. Sign in with your GitHub
account — this makes it easy later.

Once you're in the dashboard, click 'New Project'.

- Organisation: use your default organisation
- Project name: `ariyalur-geology`
- Database password: create a strong password — save this somewhere safe!
- Region: choose the one closest to India — `ap-south-1` (Asia Pacific Mumbai) is ideal
- Click 'Create new project'"

---

**[GET API KEYS — 3:00–5:00]**

*[Navigate to Settings → API]*

"While the project is being created — it takes about 2 minutes — let's find our
API keys.

Click on the gear icon 'Settings', then 'API'.

You'll see two important values:
1. **Project URL** — looks like `https://abc123.supabase.co` — copy this
2. **service_role key** — this is a long string starting with 'eyJ' — copy this

⚠️ Important: The service_role key has full database access. Never put it in
your frontend HTML or commit it to a public GitHub repository. We'll store it
safely as an environment variable."

---

**[CREATE TABLES — 5:00–9:00]**

*[Navigate to SQL Editor]*

"Now let's create our database tables. Click 'SQL Editor' in the left menu, then
'New Query'.

Copy and paste this SQL:"

```sql
-- Registrations table
CREATE TABLE registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  phone        TEXT,
  institution  TEXT,
  purpose      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Fossil details table
CREATE TABLE fossil_details (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fossil_name     TEXT NOT NULL,
  scientific_name TEXT,
  period          TEXT,
  location        TEXT,
  description     TEXT,
  image_url       TEXT,
  submitted_by    TEXT,
  status          TEXT DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fossil_details ENABLE ROW LEVEL SECURITY;
```

"Click 'Run'. You should see 'Success' messages. These tables are now created!"

---

**[CREATE STORAGE BUCKET — 9:00–12:00]**

*[Navigate to Storage]*

"Next, let's set up the storage for fossil images.

Click 'Storage' in the left menu, then 'New bucket'.

- Bucket name: `fossil-images`
- Public bucket: YES — tick this checkbox so images can be viewed publicly
- File size limit: 10 megabytes
- Allowed MIME types: `image/jpeg, image/png, image/webp`

Click 'Create bucket'. Your storage is ready!"

---

**[VERIFY SETUP — 12:00–14:30]**

*[Show table editor]*

"Let's verify everything is set up correctly.

Click 'Table Editor' — you should see `registrations` and `fossil_details`.

Click 'Storage' — you should see the `fossil-images` bucket with a green badge.

Now let's do a quick test. In the Table Editor, click `registrations`, then
'Insert row':
- full_name: `Test User`
- email: `test@example.com`

Click 'Save'. The row should appear. Delete it — it was just a test."

---

**[OUTRO — 14:30–15:00]**

"Your Supabase database is set up and ready. In the next video, we'll build the
backend API and deploy it to Vercel. See you there!"

---

---

## Tutorial 3 — Backend Deployment (20 min)

### Thumbnail Text
"Deploy Node.js API to Vercel | Serverless Functions Tutorial"

### Script

---

**[INTRO — 0:00–1:00]**

"In this video we're building the Node.js backend that connects your website
forms to the Supabase database. We'll deploy it to Vercel as serverless
functions — which means it scales automatically and costs nothing on the free
tier."

---

**[PROJECT STRUCTURE — 1:00–4:00]**

*[Show terminal and VS Code]*

"Open a terminal and navigate to your repository:

```bash
cd Nats-AriyalurGeology-Repository
```

Run our setup script to create the backend structure automatically:

```bash
chmod +x setup.sh
./setup.sh --skip-secrets
```

This creates the `backend/` folder, installs dependencies, and generates your
`.env.example` file."

---

**[CONFIGURE ENVIRONMENT — 4:00–7:00]**

*[Show backend/.env]*

"Now let's configure our environment variables. Run:

```bash
./setup-env.sh --create-env
```

The script will ask you for:
1. **SUPABASE_URL** — paste the URL you copied from Supabase
2. **SUPABASE_SERVICE_ROLE_KEY** — paste your service_role key
3. **PORT** — press Enter to accept 8080
4. Everything else — press Enter for the defaults

This creates your `backend/.env` file with your real credentials."

---

**[REVIEW SERVER CODE — 7:00–12:00]**

*[Show backend/server.js]*

"Let's look at what `server.js` does. It creates an Express server with:

- **Helmet** — security headers to protect against common web vulnerabilities
- **CORS** — allows our frontend to call the API
- **Rate limiting** — prevents abuse by limiting requests per IP
- Three API endpoints:
  - `POST /api/register` — saves a new visitor registration
  - `POST /api/fossils` — saves fossil details to the database
  - `POST /api/upload` — uploads an image to Supabase Storage

The code handles errors gracefully — if something goes wrong, it returns a
proper error response rather than crashing."

---

**[TEST LOCALLY — 12:00–16:00]**

*[Show terminal]*

"Let's test it locally first:

```bash
cd backend
npm start
```

You should see: 'Server running on port 8080'

Open a new terminal and test with curl:

```bash
curl -X POST http://localhost:8080/api/register \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Test User","email":"test@test.com"}'
```

You should see `{\"success\":true,\"id\":\"...\"}`. Check your Supabase table —
the row should be there!"

---

**[DEPLOY TO VERCEL — 16:00–19:00]**

*[Show Vercel dashboard]*

"Now let's deploy to the cloud.

1. Log in to vercel.com
2. Click 'Add New Project'
3. Import from GitHub: select `Nats-AriyalurGeology-Repository`
4. Framework Preset: **Other**
5. Root Directory: `backend`
6. Click 'Environment Variables' — add:
   - `SUPABASE_URL` = your URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your key
   - `NODE_ENV` = `production`
   - `CORS_ORIGIN` = `https://natswebsite.com`
7. Click 'Deploy'

Vercel will build and deploy in about 90 seconds. Once complete, you'll get a
URL like `https://ariyalur-api.vercel.app` — copy this!"

---

**[OUTRO — 19:00–20:00]**

"Your backend is live in the cloud! In the next video, we'll update the HTML
forms to send data to this API URL. See you there!"

---

---

## Tutorial 4 — Frontend Integration (15 min)

### Thumbnail Text
"Connect HTML Forms to Cloud API | Fetch API Tutorial"

### Script

---

**[INTRO — 0:00–1:00]**

"Now that our backend is deployed, we need to update the HTML forms to send
data to our API instead of trying to connect to localhost. This is the step that
makes the registration and fossil upload forms actually work."

---

**[UPDATE REGISTRATION FORM — 1:00–7:00]**

*[Show UploadFossilImageAndDetails.html in editor]*

"Open `UploadFossilImageAndDetails.html` in your editor. Find the registration
form — it has an ID we can target with JavaScript.

We need to add a `<script>` block at the bottom of the `<body>` that intercepts
the form submission and sends the data to our API.

Here's the code:"

```javascript
const API_URL = 'https://ariyalur-api.vercel.app'; // your Vercel URL

document.getElementById('registrationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  try {
    const response = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: document.getElementById('fullName').value,
        email:     document.getElementById('email').value,
        phone:     document.getElementById('phone').value,
        institution: document.getElementById('institution').value
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Registration successful! Thank you for registering.');
      e.target.reset();
    } else {
      alert('Registration failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Network error — please check your connection and try again.');
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
});
```

"Replace `https://ariyalur-api.vercel.app` with your actual Vercel API URL."

---

**[UPDATE FOSSIL UPLOAD FORM — 7:00–13:00]**

*[Show the fossil upload form]*

"For the fossil upload form, it's similar but we also handle a file upload.
We use `FormData` instead of JSON because we're sending a file:"

```javascript
document.getElementById('fossilForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';
  
  try {
    const formData = new FormData();
    formData.append('fossil_name', document.getElementById('fossilName').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('location',    document.getElementById('location').value);
    formData.append('period',      document.getElementById('period').value);
    formData.append('submitted_by', document.getElementById('submitterName').value);
    formData.append('image', document.getElementById('fossilImage').files[0]);
    
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      body: formData   // No Content-Type header — browser sets it automatically
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Fossil details uploaded successfully!');
      e.target.reset();
    } else {
      alert('Upload failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Network error — please check your connection and try again.');
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Fossil';
  }
});
```

---

**[COMMIT AND PUSH — 13:00–14:30]**

*[Show terminal]*

"Save the file and push to GitHub:

```bash
git add UploadFossilImageAndDetails.html
git commit -m 'feat: connect forms to cloud API'
git push origin main
```

Vercel will automatically redeploy the frontend. In about 60 seconds, the live
site will have the updated forms."

---

**[OUTRO — 14:30–15:00]**

"The forms are now connected to the cloud! In the next video, we'll test the
complete flow from form submission to database storage. See you there!"

---

---

## Tutorial 5 — Testing Tutorial (15 min)

### Thumbnail Text
"Test Your Cloud API | End-to-End Testing Tutorial"

### Script

---

**[INTRO — 0:00–1:00]**

"In this video, we're going to test every part of the system — from form
submissions on the live website through to the database and back. Testing
catches bugs before your users do."

---

**[RUN AUTOMATED TESTS — 1:00–5:00]**

*[Show terminal]*

"First, let's run the automated test suite:

```bash
cd backend
npm test
```

You'll see Jest running 69 tests across 6 files. Each test category covers:
- **api.test.js** — tests each API endpoint
- **database.test.js** — tests Supabase connectivity
- **upload.test.js** — tests file upload handling
- **email.test.js** — tests notification emails
- **integration.test.js** — tests the full workflow
- **performance.test.js** — checks response times

All tests should show green checkmarks. If any fail, the output tells you
exactly what went wrong and on which line."

---

**[RUN DEPLOYMENT VERIFICATION — 5:00–9:00]**

*[Show terminal]*

"Now let's verify the live deployment:

```bash
./verify-deployment.sh --env production
```

This script tests every component:
- Can the frontend be loaded?
- Does the backend health endpoint respond?
- Are the database tables accessible?
- Do the API endpoints return correct responses?
- What's the response time?

Each check shows PASS, WARN, or FAIL with a clear explanation."

---

**[MANUAL BROWSER TEST — 9:00–13:00]**

*[Show browser at natswebsite.com]*

"Finally, let's test the real user experience in the browser.

1. Open the website
2. Navigate to the registration form
3. Fill in: Name, Email, Phone
4. Submit — you should see 'Registration successful!'
5. Open Supabase dashboard → Table Editor → `registrations`
6. Refresh — your test registration should appear!

Now test the fossil upload:
1. Navigate to the upload form
2. Fill in all fields
3. Select a test image (any JPEG works)
4. Submit — you should see 'Fossil details uploaded successfully!'
5. Check Supabase Storage → `fossil-images` — your image should be there!
6. Check `fossil_details` table — the record should appear with the image URL"

---

**[CHECK ERROR HANDLING — 13:00–14:30]**

"Let's also verify error handling works:

1. Try submitting the registration form with an empty email — should show a
   validation error
2. Try uploading a text file instead of an image — should show 'Invalid file
   type'
3. Open browser DevTools → Network tab → submit a form — you can see the exact
   API request and response"

---

**[OUTRO — 14:30–15:00]**

"Everything is working end-to-end! In the final video, we'll set up monitoring
so you know when your site is down. See you there!"

---

---

## Tutorial 6 — Monitoring Tutorial (15 min)

### Thumbnail Text
"Website Monitoring Setup | UptimeRobot + Vercel Analytics"

### Script

---

**[INTRO — 0:00–1:00]**

"In this final video, we'll set up monitoring for your live website. Monitoring
means you'll get an email alert the moment your website goes down — before your
users even notice. Let's set it up."

---

**[VERCEL ANALYTICS — 1:00–4:00]**

*[Show Vercel dashboard]*

"Vercel includes free analytics. Let's enable them:

1. Go to vercel.com → your project
2. Click the 'Analytics' tab
3. Click 'Enable Analytics'
4. That's it! Vercel will now track page views, Core Web Vitals, and visitor
   locations automatically.

After a few hours of traffic, you'll see charts showing which pages are most
visited and how fast they load."

---

**[UPTIMEROBOT SETUP — 4:00–8:00]**

*[Show UptimeRobot dashboard]*

"For uptime monitoring, we'll use UptimeRobot — free for up to 50 monitors.

1. Go to uptimerobot.com and create an account
2. Click 'Add New Monitor'
3. Monitor type: HTTP(s)
4. Friendly name: `Ariyalur Frontend`
5. URL: `https://natswebsite.com`
6. Monitoring interval: 5 minutes
7. Alert contacts: add your email
8. Click 'Create Monitor'

Now add a second monitor for the backend:
1. Same steps
2. Name: `Ariyalur API`
3. URL: `https://your-api.vercel.app/health`
4. Click 'Create Monitor'

You'll now get an email if either goes down for more than 5 minutes."

---

**[SUPABASE MONITORING — 8:00–11:00]**

*[Show Supabase dashboard]*

"Supabase has built-in monitoring too.

Go to your Supabase project → 'Reports':

- **API** tab: shows request count, average latency, error rate
- **Database** tab: shows query performance and connection count
- **Storage** tab: shows usage and upload success rate

Set up alerts in Supabase:
1. Go to Settings → Alerts
2. Add email alert for: 'Database connections > 80%'
3. Add alert for: 'Storage usage > 800 MB' (free tier limit is 1 GB)

This prevents surprises at the end of the month."

---

**[LOG REVIEW — 11:00–13:30]**

*[Show Vercel logs]*

"When something goes wrong, logs tell you why.

In Vercel: Project → Functions → click any function → Logs tab

You'll see every API request with:
- Timestamp
- Request path
- Response code
- Duration
- Any error messages

In Supabase: Logs → API logs — shows every database query.

Get in the habit of checking logs after every deployment."

---

**[SERIES WRAP-UP — 13:30–15:00]**

*[Show live website]*

"You've built a production-ready cloud-powered geology website! Let's recap what
we did:

✅ Supabase database with `registrations` and `fossil_details` tables
✅ Supabase Storage for fossil images
✅ Node.js/Express backend deployed to Vercel
✅ HTML forms connected to the cloud API
✅ Automated tests passing
✅ Uptime monitoring with email alerts
✅ Analytics tracking with Vercel

Your website now works completely in the cloud — the localhost:8080 limitation
is gone forever. Visitors can register and submit fossils from anywhere in the
world.

Thank you for following along! If you have questions, open an issue on the
GitHub repository. Good luck with your geology research!"

---
