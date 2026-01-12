# Supabase Authentication Setup

This guide will help you set up Supabase authentication for the Koinon application.

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- Node.js and pnpm installed

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in your project details:
   - Name: book-shelf (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project"

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find two important values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon/public key** (a long JWT token)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root of your project:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Replace `your-project-url` and `your-anon-key` with the values from Step 2.

**Important:** Never commit your `.env.local` file to version control. It's already included in `.gitignore`.

## Step 4: Configure Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation and password reset emails

## Step 5: Set Up Site URL and Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set your **Site URL**:
   - For development: `http://localhost:3000`
   - For production: `https://your-domain.com`
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)
   - `http://localhost:3000/auth/reset/confirm` (development, password reset)
   - `https://your-domain.com/auth/reset/confirm` (production, password reset)

## Step 6: Run the Application

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000` and you should see the landing page!

## Features Included

### Authentication Pages

- **Landing Page** (`/`) - Public homepage with feature showcase
- **Sign Up** (`/signup`) - User registration with email confirmation
- **Login** (`/login`) - User authentication
- **Dashboard** (`/dashboard`) - Protected route, requires authentication

### Authentication Flow

1. User signs up with email and password
2. Supabase sends a confirmation email
3. User clicks the confirmation link
4. User is redirected to the dashboard
5. User can sign out from the dashboard

### Protected Routes

The middleware (`middleware.ts`) automatically:

- Redirects unauthenticated users from `/dashboard` to `/login`
- Redirects authenticated users from `/login` and `/signup` to `/dashboard`
- Refreshes user sessions automatically

### Auth Context

The `AuthProvider` component wraps your app and provides:

- `user` - Current user object or null
- `loading` - Loading state during auth checks
- `signOut()` - Function to sign out the user

Usage example:

```tsx
import { useAuth } from "@/contexts/auth-context";

function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <button onClick={signOut}>Sign Out</button>
      ) : (
        <a href="/login">Sign In</a>
      )}
    </div>
  );
}
```

## Testing Authentication

1. Go to `http://localhost:3000`
2. Click "Get Started" or "Sign Up"
3. Create an account with your email
4. Check your email for the confirmation link
5. Click the confirmation link
6. You'll be redirected to the dashboard
7. Try signing out and signing back in

## Development Notes

### Email Confirmation

By default, Supabase requires email confirmation. For development, you can disable this:

1. Go to **Authentication** → **Providers**
2. Click on **Email**
3. Toggle off "Confirm email"
4. Save changes

**Warning:** Only disable email confirmation in development. Always require it in production.

### Testing with Test Users

You can create test users directly in Supabase:

1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter email and password
4. The user is created and confirmed automatically

## Troubleshooting

### "Invalid API key" error

- Double-check your environment variables in `.env.local`
- Make sure you're using the **anon/public** key, not the **service role** key
- Restart your development server after changing `.env.local`

### Email confirmation not working

- Check your spam folder
- Verify the redirect URLs in Supabase dashboard
- Check the email templates in **Authentication** → **Email Templates**

### Infinite redirect loop

- Clear your browser cookies
- Check the middleware configuration in `middleware.ts`
- Verify your route patterns

### "Failed to fetch" error

- Verify your Supabase project URL is correct
- Check if your Supabase project is paused (free tier projects pause after inactivity)
- Check your network connection

## Next Steps

Now that authentication is set up, you can:

1. **Add user profiles**: Create a `profiles` table in Supabase
2. **Implement password reset**: Add a forgot password flow
3. **Add OAuth providers**: Enable Google, GitHub, etc.
4. **Set up Row Level Security (RLS)**: Secure your database tables
5. **Create protected API routes**: Use Supabase auth in API routes

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

## Security Best Practices

1. Never expose your `service_role` key
2. Always use environment variables for sensitive data
3. Enable Row Level Security (RLS) on all database tables
4. Use HTTPS in production
5. Keep your Supabase client libraries up to date
6. Enable email confirmation in production
7. Set strong password requirements
8. Implement rate limiting for auth endpoints
