# Quick Start: Social Authentication

## 🚀 Quick Setup (5 minutes)

### Step 1: Apply Database Migration
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/007_auto_create_profiles.sql`
4. Click "Run"

### Step 2: Test Email Signup (Already Working!)
1. Run `npm run dev`
2. Go to `http://localhost:3000/signup`
3. Fill in:
   - Display Name: "Test User"
   - Email: your email
   - Password: test123
   - Confirm Password: test123
4. Click "Sign Up"
5. Check your email for verification link

### Step 3: Enable Social Providers (Optional)

Social authentication requires additional setup with each provider. You can enable them one at a time as needed.

#### Option A: Skip for Now
The application works perfectly with email/password authentication. You can add social providers later.

#### Option B: Enable Social Providers
Follow the detailed guide in `SOCIAL_AUTH_SETUP.md` for:
- Google (Easiest - ~10 minutes)
- Microsoft (Medium - ~15 minutes)  
- Apple (Requires Apple Developer Account - ~30 minutes)

## 📋 What's Already Working

✅ **Email/Password Authentication**
- Sign up with display name
- Password validation
- Email verification
- Automatic profile creation

✅ **Social Authentication Buttons**
- Google, Apple, and Microsoft buttons are visible
- They will work once you configure the providers

✅ **Profile Management**
- Profiles auto-created for all users
- Display names stored and accessible
- Database trigger ensures consistency

## 🎨 UI Updates

Both signup and login pages now feature:
- Modern social authentication buttons with brand icons
- Display name field on signup
- Clean separation between auth methods
- Consistent loading states
- Better error handling

## 🧪 Testing the Updates

### Test Email Signup:
```bash
# 1. Start dev server
npm run dev

# 2. Navigate to signup page
open http://localhost:3000/signup

# 3. Fill out the form with a display name
# 4. Submit and check for email verification
# 5. Click verification link in email
# 6. Login and verify display name appears
```

### Verify Profile Creation:
```bash
# 1. Go to Supabase Dashboard
# 2. Navigate to Table Editor > profiles
# 3. You should see your profile with:
#    - id (UUID matching auth.users)
#    - full_name (your display name)
#    - email
#    - created timestamp
```

## 🔧 Configuration Needed for Social Auth

### In Supabase Dashboard (for each provider):

1. **Authentication → Providers**
   - Enable Google/Apple/Microsoft
   - Add Client ID
   - Add Client Secret

2. **Authentication → URL Configuration**
   - Add redirect URL: `http://localhost:3000/auth/callback` (dev)
   - Add redirect URL: `https://yourdomain.com/auth/callback` (prod)

### Provider-Specific Setup:

See `SOCIAL_AUTH_SETUP.md` for detailed instructions on:
- Creating OAuth applications
- Getting client credentials
- Configuring redirect URLs
- Testing each provider

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `AUTHENTICATION_UPDATES.md` | Complete summary of all changes |
| `SOCIAL_AUTH_SETUP.md` | Detailed provider setup instructions |
| `DATABASE_SCHEMA.md` | Database structure and triggers |
| `QUICK_START_SOCIAL_AUTH.md` | This file - quick reference |

## 🆘 Common Issues

### "Profile not found"
**Solution**: Run the database migration (`007_auto_create_profiles.sql`)

### Social buttons don't work
**Solution**: Configure the providers in Supabase Dashboard (see `SOCIAL_AUTH_SETUP.md`)

### "Email already exists"
**Solution**: Use a different email or login instead of signup

### Display name not showing
**Solution**: Check that the profile was created in the `profiles` table

## 🎯 Next Steps

1. ✅ Apply database migration
2. ✅ Test email signup with display name
3. ⏭️ Enable Google (optional, easiest)
4. ⏭️ Enable Microsoft (optional)
5. ⏭️ Enable Apple (optional, requires developer account)

## 💡 Pro Tips

- **Start with Google**: Easiest to set up, widely used
- **Test in incognito**: Avoid cached sessions
- **Check Supabase logs**: Authentication → Logs for debugging
- **Use .env.local**: Never commit secrets to git
- **Production setup**: Update all redirect URLs before deploying

---

**Ready to go!** Your email/password authentication with display names is fully functional. Social auth is optional and can be added anytime.
