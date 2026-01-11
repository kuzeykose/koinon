# OAuth Redirect Fix Guide

## Problem

The `redirectTo` parameter in OAuth login wasn't working correctly, preventing successful authentication redirects.

## What Was Fixed

### 1. Updated Login & Signup Pages

- Added proper error handling with try-catch blocks
- Added environment variable support for `NEXT_PUBLIC_SITE_URL`
- Added console logging for debugging
- Improved type safety by capturing the response data

### 2. Updated Documentation

- Enhanced `SOCIAL_AUTH_SETUP.md` with clearer redirect URL configuration instructions

## Steps to Fix Your OAuth Redirect Issue

### Step 1: Create Environment File

Create a `.env.local` file in your project root:

```env
# Your Supabase credentials (you should already have these)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Add this for OAuth redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Replace `your-project-ref` and `your-anon-key` with your actual Supabase values.

### Step 2: Configure Supabase Dashboard (CRITICAL!)

This is the most common cause of OAuth redirect failures:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

4. **Set Site URL:**

   - For development: `http://localhost:3000`

5. **Add Redirect URLs** (add ALL of these):

   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```

   **Important Notes:**

   - URLs must match EXACTLY (case-sensitive)
   - Don't include trailing slashes unless your app uses them
   - The `/**` wildcard is optional but recommended
   - Port number matters (3000 in this case)

6. Click **Save**

### Step 3: Verify OAuth Provider Configuration

#### For Google:

1. In Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Verify it's **Enabled**
3. Check that your Client ID and Secret are correct
4. In [Google Cloud Console](https://console.cloud.google.com/), verify your authorized redirect URIs include:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

#### For Microsoft (Azure):

1. In Supabase Dashboard → **Authentication** → **Providers** → **Azure**
2. Verify it's **Enabled**
3. Check your Client ID, Secret, and Tenant
4. In [Azure Portal](https://portal.azure.com/), verify your redirect URI includes:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

### Step 4: Test the Fix

1. Restart your development server:

   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000/login`

3. Open browser console (F12) to see debug logs

4. Click "Continue with Google" or "Continue with Microsoft"

5. Check the console logs for:

   ```
   OAuth redirect URL: http://localhost:3000/auth/callback
   ```

6. The OAuth flow should:
   - Redirect to the provider (Google/Microsoft)
   - Ask for permissions
   - Redirect back to your app at `/auth/callback`
   - Create a profile if needed
   - Finally redirect to `/dashboard`

## Troubleshooting

### Still Getting Redirect Errors?

1. **Check Browser Console**

   - Look for the debug log: `OAuth redirect URL: ...`
   - Note any error messages

2. **Verify Exact URLs**

   - The redirect URL in console should match what's in Supabase dashboard
   - Check for typos, extra slashes, wrong ports

3. **Check Supabase Logs**

   - Go to Supabase Dashboard → **Logs** → **Auth Logs**
   - Look for failed authentication attempts and error messages

4. **Common Issues:**
   - **"Invalid redirect URL"**: The URL isn't whitelisted in Supabase
   - **"redirect_uri_mismatch"**: The provider (Google/Azure) doesn't have the right callback URL
   - **Silent failure**: Check if the provider is actually enabled in Supabase
   - **ENV not loaded**: Make sure `.env.local` is in the project root and restart dev server

### Testing Checklist

- [ ] `.env.local` file created with `NEXT_PUBLIC_SITE_URL`
- [ ] Development server restarted after adding env file
- [ ] Site URL set in Supabase dashboard
- [ ] Redirect URLs added to Supabase dashboard (with and without wildcards)
- [ ] OAuth providers enabled in Supabase
- [ ] Provider callback URLs configured (Google Cloud Console / Azure Portal)
- [ ] Browser console shows correct redirect URL
- [ ] No errors in Supabase Auth logs

## Understanding the OAuth Flow

Here's what happens when a user clicks "Continue with Google":

```
1. User clicks button in your app
   ↓
2. Your app: signInWithOAuth() with redirectTo parameter
   ↓
3. Browser redirects to Google OAuth
   ↓
4. User approves permissions
   ↓
5. Google redirects to Supabase: https://[project].supabase.co/auth/v1/callback
   ↓
6. Supabase validates and creates session
   ↓
7. Supabase redirects to YOUR app: http://localhost:3000/auth/callback
   ↓
8. Your app callback route: exchanges code for session
   ↓
9. Creates user profile if needed
   ↓
10. Redirects to /dashboard
```

The `redirectTo` parameter controls step 7 - where Supabase sends the user after validating the OAuth response.

## Production Deployment

When deploying to production:

1. Update `.env.local` (or your hosting platform's env vars):

   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

2. Add production URLs to Supabase dashboard:

   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/**
   ```

3. Update Site URL in Supabase to your production domain

4. Update OAuth provider redirect URIs if they reference your domain directly

## Need More Help?

- Check [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- Review `SOCIAL_AUTH_SETUP.md` for detailed provider setup
- Check Supabase Discord/Forums for common issues
