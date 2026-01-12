# Social Authentication Setup Guide

This guide will help you set up Google and Microsoft authentication for your Book Shelf application.

## Prerequisites

1. A Supabase project
2. Access to the Supabase dashboard
3. Developer accounts for each provider you want to enable

## Environment Setup

Create a `.env.local` file in your project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Important:** Replace the values with your actual Supabase credentials. For production, update `NEXT_PUBLIC_SITE_URL` to your production domain.

## Supabase Configuration

### 1. Apply Database Migration

First, apply the profile auto-creation trigger to ensure all users get a profile:

```bash
# Run this SQL in your Supabase SQL Editor
```

Execute the SQL from `migrations/007_auto_create_profiles.sql`

### 2. Configure Redirect URLs

**This is critical for OAuth to work!**

In your Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Under **Site URL**, set:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Under **Redirect URLs**, add these EXACT URLs:
   - `http://localhost:3000/auth/callback` (for development)
   - `http://localhost:3000/**` (wildcard for development, optional but recommended)
   - `https://yourdomain.com/auth/callback` (for production when deploying)
   - `https://yourdomain.com/**` (wildcard for production, optional but recommended)

**Note:** The URLs must match EXACTLY (including http/https, trailing slashes matter). If your OAuth redirects aren't working, this is the first thing to check!

## Google Authentication Setup

### 1. Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen if not already done
6. Select **Web application** as the application type
7. Add authorized redirect URIs:
   - `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
8. Note your **Client ID** and **Client Secret**

### 2. Configure in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Enter your **Client ID** and **Client Secret**
5. Save changes

## Microsoft (Azure AD) Authentication Setup

### 1. Create Microsoft OAuth App

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - Name: Your app name
   - Supported account types: Choose based on your needs
   - Redirect URI: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. Click **Register**
6. Note your **Application (client) ID**
7. Go to **Certificates & secrets**
8. Click **New client secret**
9. Add a description and expiry period
10. Copy the **Value** (client secret) - you can only see it once!

### 2. Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph**
3. Select **Delegated permissions**
4. Add:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
5. Click **Grant admin consent** (if you're an admin)

### 3. Configure in Supabase

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Azure (Microsoft)** and enable it
4. Enter:
   - **Client ID**: Your Application (client) ID
   - **Client Secret**: The secret value you copied
   - **Tenant**: Use `common` for multi-tenant or your specific tenant ID
5. Save changes

## Testing

### Development Testing

1. Start your development server:

```bash
npm run dev
```

2. Navigate to `/signup` or `/login`
3. Try signing up/in with each provider

### Production Checklist

- [ ] Update redirect URLs in all provider configurations
- [ ] Update site URL in Supabase dashboard
- [ ] Test each provider in production
- [ ] Verify profile creation in database
- [ ] Check user metadata is properly stored

## Troubleshooting

### "Invalid redirect URI"

- Verify the redirect URI matches exactly in both provider and Supabase
- Check for trailing slashes
- Ensure you're using the correct Supabase project reference

### "Email already exists"

- This happens when a user tries to sign in with a provider using an email already registered with a different method
- Consider implementing account linking in the future

### Profile not created

- Check if the database trigger was applied correctly
- Verify RLS policies allow profile insertion
- Check Supabase logs for errors

### Provider button doesn't work

- Check browser console for errors
- Verify the provider is enabled in Supabase dashboard
- Ensure client ID/secret are correct

## Security Considerations

1. **Keep secrets secure**: Never commit client secrets to version control
2. **Use environment variables**: Store sensitive configuration in `.env.local`
3. **HTTPS only**: Always use HTTPS in production
4. **Regular updates**: Rotate client secrets periodically
5. **Monitor usage**: Check Supabase auth logs regularly

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Platform](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
