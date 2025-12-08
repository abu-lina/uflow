# Next.js + Supabase Starter Template

A production-ready Next.js 15 starter template with Supabase authentication, Tailwind CSS, and TypeScript. Perfect for quickly building full-stack applications with modern tools.

## Features

- **Next.js 15** with App Router and Server Components
- **Supabase** for authentication and database
- **TypeScript** for type safety
- **Tailwind CSS** with custom design system
- **TanStack Query** for data fetching
- **Authentication** with email/password, protected routes
- **Server-side rendering (SSR)** for better performance
- **ESLint + Prettier** for code quality
- **Lucide Icons** for beautiful icons
- **Toast notifications** with Sonner

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd nextjs-supabase-starter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy the `.env.template` file to `.env.local`:
   ```bash
   cp .env.template .env.local
   ```
3. Fill in your Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for server-side)

### 4. Run Database Migrations

Run the migration in Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run the SQL

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## Project Structure

```
nextjs-supabase-starter/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, signup, etc.)
│   │   ├── (protected)/       # Protected routes (dashboard, etc.)
│   │   ├── api/               # API routes
│   │   ├── auth/              # Auth callback handlers
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   └── ui/               # UI components
│   ├── lib/                   # Utilities and configurations
│   │   ├── supabase/         # Supabase client/server setup
│   │   └── utils.ts          # Utility functions
│   ├── providers/             # React context providers
│   ├── types/                 # TypeScript types
│   └── styles/                # Global styles
├── supabase/
│   └── migrations/            # Database migrations
├── public/                    # Static assets
└── Configuration files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

## Authentication Flow

### Sign Up

1. User fills in email and password on `/signup`
2. Supabase sends a confirmation email
3. User clicks the link and is redirected to `/auth/callback`
4. User is logged in and redirected to `/dashboard`

### Sign In

1. User fills in email and password on `/login`
2. Credentials are validated with Supabase
3. User is logged in and redirected to `/dashboard`

### Password Reset

1. User requests password reset on `/forgot-password`
2. Supabase sends a reset email
3. User clicks the link and is redirected to `/reset-password`
4. User sets a new password and is redirected to `/login`

## Customization

### Colors and Theme

Edit `tailwind.config.ts` to customize your color palette:

```typescript
colors: {
  primary: {
    DEFAULT: '#589d96',  // Change this to your brand color
    light: '#b8d6d2',
    dark: '#438983',
    darker: '#356e6a',
  },
  // ...
}
```

### Components

All UI components are in `src/components/ui/`. You can customize or add new components as needed.

### Database Schema

Modify `supabase/migrations/001_initial_schema.sql` to add your own tables and policies.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables from `.env.local`
5. Deploy!

### Other Platforms

This template works with any platform that supports Next.js:

- Netlify
- Railway
- Render
- AWS Amplify
- Self-hosted with Docker

## Environment Variables

Required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (for email redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - feel free to use this template for your projects!

## Support

If you have questions or need help, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Supabase





