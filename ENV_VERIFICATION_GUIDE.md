# Environment Verification Guide

This comprehensive guide provides step-by-step instructions for verifying your Supabase credentials and Vercel environment variable configuration.

## 1. Verifying Supabase Credentials
To verify your Supabase credentials, follow these steps:

### Step 1: Access Supabase Dashboard
- Go to the [Supabase](https://supabase.io) dashboard.
- Select your project from the list.

### Step 2: Locate API Keys
- Navigate to the **Settings** section.
- Select **API** to find your project API keys and URL.

### Step 3: Verify Environment Variables
Ensure that the following environment variables in your Vercel configuration match the Supabase settings:
- `SUPABASE_URL`
- `SUPABASE_PUBLIC_ANON_KEY`

## 2. Configuring Vercel Environment Variables
To set up Vercel environment variables:

### Step 1: Access Vercel Dashboard
- Go to [Vercel](https://vercel.com) dashboard.
- Choose your project.

### Step 2: Set Environment Variables
- Navigate to the **Settings** section of your project.
- In the **Environment Variables** section, add the necessary keys:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLIC_ANON_KEY`

### Step 3: Verify Configuration
After setting the variables, ensure they are listed correctly.

## 3. Accessing the /api/diagnose Endpoint
To access the new `/api/diagnose` endpoint:
- Use your browser or Postman to make a GET request to `https://your-vercel-project-url/api/diagnose`.

### Expected Responses
- **200**: If the setup is correct, you will receive a message indicating successful connection to Supabase.
- **500**: If there’s a connectivity issue, you will receive an error message indicating what went wrong.

## 4. Troubleshooting Common Issues
- **Missing Environment Variables**: Check Vercel for any missing variables. Ensure all required keys are set.
- **Failed Supabase Connectivity**: Ensure that the Supabase URL and keys are correct and match the ones in the dashboard.

## 5. Setup Checklist
- [ ] Verify Supabase credentials are correct.
- [ ] Configure Vercel environment variables correctly.
- [ ] Access the `/api/diagnose` endpoint successfully.
- [ ] Review troubleshooting steps if you encounter issues.

By following these instructions, you should be able to verify your environment configuration successfully!