# OAuth Profile Picture Auto-Update Fix

## Problem

When users sign up with Google OAuth (or other OAuth providers), their profile picture from the provider is available in the auth metadata but wasn't being automatically saved or updated in the `profiles` table.

## Solution

This fix implements automatic profile picture synchronization through three mechanisms:

### 1. **Database Trigger (Primary Method)**
   - Updates the `handle_new_user()` trigger function to UPSERT profile data
   - Now updates existing profiles instead of skipping them with `ON CONFLICT DO NOTHING`
   - Captures both `avatar_url` and `picture` fields from OAuth metadata

### 2. **OAuth Callback Handler (Secondary Method)**
   - Updated `/app/auth/callback/route.ts` to use `.upsert()` instead of conditional insert
   - Ensures profile data is updated on every OAuth login
   - Captures profile picture from both `avatar_url` and `picture` metadata fields

### 3. **Backfill Script (One-time Fix)**
   - Updates existing profiles that are missing avatar URLs
   - Pulls avatar data from `auth.users` metadata

## How to Apply

### Step 1: Run the Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migrations/008_update_profile_trigger_with_avatar.sql`
5. Click **Run** to execute the migration

This will:
- ✅ Update the trigger function to handle profile updates
- ✅ Backfill existing profiles with missing avatar URLs
- ✅ Ensure future OAuth logins update profile pictures

### Step 2: Deploy the Code Changes

The code changes have already been made to:
- `app/auth/callback/route.ts` - OAuth callback handler
- `migrations/007_auto_create_profiles.sql` - Updated for reference

Simply deploy these changes to your environment.

### Step 3: Test the Fix

1. **For New Users:**
   - Sign up with a Google account
   - Profile picture should be saved immediately

2. **For Existing Users:**
   - Log out
   - Log back in with Google OAuth
   - Profile picture should now be updated

3. **Verify in Database:**
   ```sql
   SELECT id, full_name, email, avatar_url, updated_at 
   FROM profiles 
   WHERE avatar_url IS NOT NULL;
   ```

## Technical Details

### OAuth Metadata Fields

Different OAuth providers use different field names for profile pictures:

- **Google**: `picture` or `avatar_url`
- **Microsoft**: `picture`
- **GitHub**: `avatar_url`

Our fix checks both fields to ensure compatibility:

```typescript
const avatarUrl = 
  data.user.user_metadata?.avatar_url || 
  data.user.user_metadata?.picture || 
  null;
```

### Database Trigger Update

**Before:**
```sql
ON CONFLICT (id) DO NOTHING;
```

**After:**
```sql
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  email = COALESCE(EXCLUDED.email, profiles.email),
  avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
  updated_at = NOW();
```

### OAuth Callback Update

**Before:**
```typescript
if (!existingProfile) {
  await supabase.from("profiles").insert({...});
}
```

**After:**
```typescript
await supabase.from("profiles").upsert({
  id: data.user.id,
  full_name: fullName,
  email: data.user.email,
  avatar_url: avatarUrl,
}, {
  onConflict: 'id',
  ignoreDuplicates: false
});
```

## Benefits

✅ **Automatic Updates**: Profile pictures update automatically on every login
✅ **Backfill Support**: Fixes existing profiles missing avatar URLs
✅ **Multi-Provider Support**: Works with Google, Microsoft, GitHub, and other OAuth providers
✅ **No User Action Required**: Everything happens automatically in the background
✅ **Database-Level Consistency**: Trigger ensures data integrity at the database level

## Troubleshooting

### Profile Picture Not Showing After Login

1. **Check if the OAuth provider is sending the picture:**
   ```sql
   SELECT id, email, raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture'
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```

2. **Check if the profile was updated:**
   ```sql
   SELECT id, email, avatar_url, updated_at
   FROM profiles
   WHERE email = 'your-email@example.com';
   ```

3. **Manually update a profile (if needed):**
   ```sql
   UPDATE profiles
   SET avatar_url = (
     SELECT COALESCE(
       raw_user_meta_data->>'avatar_url',
       raw_user_meta_data->>'picture'
     )
     FROM auth.users
     WHERE auth.users.id = profiles.id
   )
   WHERE id = 'user-uuid-here';
   ```

### OAuth Provider Not Sending Picture

Some OAuth providers require specific scopes to access profile pictures:

- **Google**: Already includes profile picture by default
- **Microsoft**: May require `User.Read` scope
- **GitHub**: Requires `user:email` scope

Check your Supabase OAuth provider settings to ensure proper scopes are configured.

## Files Changed

- ✅ `migrations/008_update_profile_trigger_with_avatar.sql` (new)
- ✅ `migrations/007_auto_create_profiles.sql` (updated)
- ✅ `app/auth/callback/route.ts` (updated)
- ✅ `OAUTH_PROFILE_PICTURE_FIX.md` (this file)

## Related Documentation

- [SOCIAL_AUTH_SETUP.md](SOCIAL_AUTH_SETUP.md) - OAuth provider setup
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database schema
- [AUTHENTICATION_UPDATES.md](AUTHENTICATION_UPDATES.md) - Authentication system overview
