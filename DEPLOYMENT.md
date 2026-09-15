# Deployment Guide: Deploying to Vercel

This document outlines the step-by-step procedure to deploy this Vite + React + TypeScript + Supabase application to **Vercel**.

---

## 1. Prerequisites & Repository Preparation

1. Verify that your local secrets in `.env` are **not** committed to Git.
   - `.gitignore` is configured to ignore `.env`, `.env.local`, and related local environment files.
   - `.env.example` is committed as a template.
2. Push your latest code commits to your GitHub repository:
   ```bash
   git add .
   git commit -m "chore: prepare codebase for production deployment on Vercel"
   git push origin main
   ```

---

## 2. Deploying on Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: Select `Vite` (Vercel usually auto-detects this).
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)
5. Expand the **Environment Variables** section and add:

   | Name | Value | Description |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://smlboienukczbvtihfxl.supabase.co` | Your Supabase project API URL |
   | `VITE_SUPABASE_ANON_KEY` | *(Your Supabase anon public key)* | Found in Supabase Dashboard -> Project Settings -> API |

6. Click **Deploy**.
7. Wait for the build to finish. Once complete, Vercel will provide your live production domain (for example: `https://eco-swap-square.vercel.app`).

---

## 3. Post-Deploy Configuration (Required for Auth & Google OAuth)

Once you have your production URL (referred to below as `https://<your-app>.vercel.app`), update your authentication providers:

### A. Supabase Dashboard Configuration
1. Open your [Supabase Project Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication** -> **URL Configuration**.
3. Update **Site URL**:
   - Change from `http://localhost:8080` to your production URL:
     ```
     https://<your-app>.vercel.app
     ```
4. Update **Redirect URLs**:
   - Add your production URL and wildcard patterns to the allowlist:
     ```
     https://<your-app>.vercel.app/**
     https://<your-app>.vercel.app/auth
     http://localhost:8080/**
     http://localhost:8080/auth
     ```
   *(Keeping `localhost` entries allows you to continue testing auth locally).*
5. Click **Save**.

---

### B. Google Cloud Console Configuration (for Google OAuth)
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** -> **Credentials**.
3. Under **OAuth 2.0 Client IDs**, click your Web client.
4. Under **Authorized JavaScript origins**:
   - Click **Add URI** and enter your production domain:
     ```
     https://<your-app>.vercel.app
     ```
5. Under **Authorized redirect URIs**:
   - Ensure the Supabase OAuth callback URL is listed:
     ```
     https://smlboienukczbvtihfxl.supabase.co/auth/v1/callback
     ```
   *(Note: Google redirects users through Supabase's callback handler, which then redirects users back to your Vercel Site URL).*
6. Click **Save**.

---

## 4. Single-Page App (SPA) Routing
This repository includes a `vercel.json` file in the root directory:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This ensures direct browser navigation or page refreshes on client-side routes (such as `/browse`, `/item/:id`, `/profile`, `/swap`, `/auth`) route cleanly to `/index.html` without triggering 404 errors.

---

## 5. Post-Deployment Verification Checklist
- [ ] Visit `https://<your-app>.vercel.app/` and confirm homepage loads.
- [ ] Visit `https://<your-app>.vercel.app/browse` directly in the address bar and refresh the page (verifies SPA rewrite).
- [ ] Test Email Sign In / Sign Up at `/auth`.
- [ ] Test "Continue with Google" OAuth login.
- [ ] Go to `/profile`, upload an avatar, and save profile changes.
- [ ] Navigate to `/list-item` and list a new item.
- [ ] View the item at `/item/:id` and test the Edit and Remove functionality.
