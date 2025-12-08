# Setup Guide

Step-by-step guide to get your Next.js + Supabase starter up and running.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** 18.0 or later
- **npm** 9.0 or later
- A **Supabase** account (free tier works great)
- A code editor (VS Code recommended)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd nextjs-supabase-starter

# Install dependencies
npm install
```

## Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - Name: Choose any name
   - Database Password: Save this securely
   - Region: Choose closest to your users
5. Click "Create new project"
6. Wait for setup to complete (1-2 minutes)

## Step 3: Get Supabase Credentials

### Project URL and API Keys

1. In your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

### Configure Environment Variables

1. Copy the template file:

   ```bash
   cp .env.template .env.local
   ```

2. Open `.env.local` and fill in your credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

## Step 4: Run Database Migration

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project
2. Click **SQL Editor** in the sidebar
3. Click **New Query**
4. Open `supabase/migrations/001_initial_schema.sql` from your project
5. Copy all the SQL code
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Step 5: Verify Database Setup

1. In Supabase Dashboard, go to **Table Editor**
2. You should see a `profiles` table
3. Click on it to verify the schema:
   - `id` (uuid, primary key)
   - `email` (text)
   - `full_name` (text)
   - `avatar_url` (text)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

## Step 6: Configure Email Templates (Optional but Recommended)

### Customize Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize these templates:
   - **Confirm signup**: Sent when user signs up
   - **Magic Link**: For passwordless login
   - **Change Email Address**: Email change confirmation
   - **Reset Password**: Password reset link

### Update Site URL

1. Go to **Authentication** → **URL Configuration**
2. Add your Site URL: `http://localhost:3000`
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`

## Step 7: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 8: Test Authentication

### Create Your First User

1. Click "Sign Up" in the header
2. Fill in email and password
3. Submit the form
4. Check your email for confirmation link
5. Click the confirmation link
6. You'll be redirected to the dashboard

### Test Login

1. Click "Sign Out" in the dashboard
2. Click "Sign In" in the header
3. Enter your email and password
4. You should be logged in and redirected to dashboard

### Test Password Reset

1. Sign out if logged in
2. Go to login page
3. Click "Forgot password?"
4. Enter your email
5. Check your email for reset link
6. Click the link and set new password
7. You'll be redirected to login

## Common Issues

### Issue: "Missing environment variables"

**Solution**: Make sure `.env.local` file exists and has all required variables:

```bash
# Check if file exists
ls -la .env.local

# Verify contents
cat .env.local
```

### Issue: "Invalid API key"

**Solution**: Double-check your Supabase credentials:

1. Go to Supabase Dashboard → Settings → API
2. Copy the values again
3. Make sure there are no extra spaces or line breaks
4. Restart the dev server after updating `.env.local`

### Issue: "Email not sent"

**Solution**: Check Supabase email settings:

1. Go to Authentication → Settings
2. Scroll to "SMTP Settings"
3. For development, Supabase uses their email service
4. Check your spam folder
5. For production, configure custom SMTP

### Issue: "Can't access dashboard"

**Solution**: Check authentication:

1. Open browser DevTools → Console
2. Look for any error messages
3. Check Network tab for failed requests
4. Make sure you confirmed your email
5. Try signing out and in again

### Issue: "Database connection error"

**Solution**: Verify database setup:

1. Check if migration ran successfully
2. Go to Table Editor and verify `profiles` table exists
3. Check RLS policies are enabled
4. Try running the migration again

## Next Steps

Now that your starter is set up, you can:

1. **Customize the UI**: Edit components in `src/components/`
2. **Add database tables**: Create new migrations in `supabase/migrations/`
3. **Build features**: Add new pages and API routes
4. **Deploy**: Follow deployment guide in README.md

## Getting Help

If you run into issues:

1. Check the [README.md](./README.md) for general information
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
3. Search [Supabase Docs](https://supabase.com/docs)
4. Search [Next.js Docs](https://nextjs.org/docs)
5. Open an issue on GitHub

## Development Tips

### Hot Reload

The dev server has hot reload enabled. Changes to:

- React components: Instant reload
- Tailwind classes: Instant reload
- Environment variables: Requires server restart

### TypeScript Errors

Run type check to see all TypeScript errors:

```bash
npm run type-check
```

### Linting

Check and fix code style:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Database Changes

When you make database changes:

1. Create a new migration file
2. Run it in Supabase SQL Editor
3. Test thoroughly
4. Commit the migration file

### VS Code Extensions

Recommended extensions:

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

## Production Setup

When ready to deploy:

1. Create production Supabase project
2. Run migrations in production database
3. Update environment variables
4. Deploy to Vercel/Netlify/etc.
5. Update Site URL in Supabase settings

See README.md for detailed deployment instructions.

---

Happy coding! 🚀





