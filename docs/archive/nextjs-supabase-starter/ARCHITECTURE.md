# Architecture Guide

This document explains the architecture and design decisions behind this starter template.

## Overview

This template follows modern Next.js 15 best practices with the App Router, Server Components, and a clear separation between client and server code.

## Core Technologies

### Next.js 15 (App Router)

- **Server Components by default**: All components are Server Components unless marked with `'use client'`
- **Parallel Routes**: Used for authentication flows with `(auth)` and `(protected)` route groups
- **Middleware**: Protects routes and handles authentication checks
- **API Routes**: Handle server-side operations like auth cookie management

### Supabase

- **Authentication**: Email/password auth with email confirmation
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Client/Server Split**: Separate clients for browser and server-side operations

### TypeScript

- Strict mode enabled for better type safety
- Path aliases (`@/*`) for clean imports
- Type definitions for all data structures

### Tailwind CSS

- Custom design system with semantic color tokens
- Responsive utilities
- Component-based styling with `class-variance-authority`

## Folder Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Public auth pages
│   ├── (protected)/         # Protected routes requiring authentication
│   ├── api/                 # API routes
│   ├── auth/                # Auth callback handlers
│   └── layout.tsx           # Root layout with providers
├── components/
│   ├── layout/              # Layout components (Header, etc.)
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── supabase/            # Supabase client setup
│   └── utils.ts             # Utility functions
├── providers/               # React Context providers
├── types/                   # TypeScript type definitions
└── styles/                  # Global CSS
```

## Authentication Flow

### Client-Side Auth

1. **AuthProvider** (`src/providers/auth-provider.tsx`):

   - Provides auth context to all components
   - Manages user state and session
   - Exposes `signIn`, `signUp`, `signOut` methods

2. **AuthSyncer** (`src/providers/AuthSyncer.tsx`):
   - Syncs auth state between server and client
   - Updates server cookies when auth changes

### Server-Side Auth

1. **Root Layout** (`src/app/layout.tsx`):

   - Gets initial user session server-side
   - Passes to `AuthProvider` to prevent flash of unauthenticated content

2. **Middleware** (`src/middleware.ts`):
   - Checks authentication for protected routes
   - Redirects unauthenticated users to login
   - Validates auth tokens

### Supabase Clients

Two separate clients for different contexts:

1. **Client-side** (`src/lib/supabase/client.ts`):

   - Browser-based Supabase client
   - Uses localStorage for session persistence
   - PKCE flow for auth

2. **Server-side** (`src/lib/supabase/server.ts`):
   - Server-only Supabase client
   - Uses cookies for session management
   - Used in Server Components and API routes

## Component Architecture

### UI Components

All UI components use:

- **class-variance-authority** for variant-based styling
- **tailwind-merge** to merge Tailwind classes safely
- **forwardRef** for proper ref handling
- TypeScript for prop types

Example:

```typescript
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }))}
        {...props}
      />
    );
  }
);
```

### Layout Components

- **Header**: Navigation with auth-aware UI
- **ClientProviders**: Wraps app with necessary providers (Auth, Query, Toaster)

## Data Fetching

### TanStack Query

- Configured with sensible defaults
- 5-minute stale time
- 30-minute garbage collection
- Disabled automatic refetch on window focus

### Server Components

Prefer Server Components for data fetching:

```typescript
export default async function Page() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from('table').select();

  return <div>{/* render data */}</div>;
}
```

## Database Schema

### Profiles Table

- Automatically created when user signs up
- Row Level Security enabled
- Users can only view/update their own profile

### Trigger Function

- `handle_new_user()`: Creates profile when user signs up
- Runs automatically on `auth.users` insert

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:

```sql
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

### Environment Variables

- Public variables: `NEXT_PUBLIC_*` (accessible in browser)
- Private variables: No prefix (server-only)

### Middleware Protection

- Validates auth tokens before allowing access
- Handles expired tokens gracefully
- Redirects unauthenticated users

## Styling System

### Semantic Color Tokens

Instead of using raw colors, use semantic tokens:

- `primary`: Brand color
- `content`: Text colors
- `background`: Page backgrounds
- `border`: Border colors
- `success`, `warning`, `danger`, `info`: Status colors

### Responsive Design

Mobile-first approach with Tailwind breakpoints:

```typescript
screens: {
  xs: '376px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

## Performance

### Optimizations

- Server Components by default
- Dynamic imports for client components
- Optimized fonts with `next/font`
- Image optimization with `next/image`
- Minimal client-side JavaScript

### Bundle Size

Keep client bundle small by:

- Using Server Components when possible
- Lazy loading heavy components
- Tree-shaking unused code

## Error Handling

### Client-Side

- Toast notifications for user-facing errors
- Console warnings for development
- Graceful fallbacks for auth failures

### Server-Side

- Try-catch blocks in API routes
- Proper HTTP status codes
- Logged errors in development

## Testing Strategy

### Unit Tests

Test individual components and functions:

- UI components
- Utility functions
- Custom hooks

### Integration Tests

Test feature flows:

- Authentication flow
- Protected route access
- Data fetching

### E2E Tests

Test complete user journeys:

- Sign up → Email confirmation → Login
- Protected route access
- CRUD operations

## Deployment

### Build Process

1. TypeScript compilation
2. Next.js build (static + server)
3. Environment variable validation

### Environment Setup

Different configs for:

- Development (`npm run dev`)
- Production (`npm run build && npm start`)

### Database Migrations

Run migrations manually in Supabase SQL Editor or use Supabase CLI:

```bash
supabase db push
```

## Extending the Template

### Adding New Features

1. Create database tables in new migration
2. Add TypeScript types
3. Create API routes if needed
4. Build UI components
5. Add to navigation

### Adding Third-Party Services

1. Install package
2. Add environment variables
3. Create wrapper in `src/lib/`
4. Use in components/routes

## Best Practices

### Do's

✅ Use Server Components by default
✅ Keep client components small
✅ Use semantic color tokens
✅ Enable RLS on all tables
✅ Validate user input
✅ Use TypeScript strictly

### Don'ts

❌ Don't use client components unnecessarily
❌ Don't store secrets in client code
❌ Don't bypass RLS policies
❌ Don't skip error handling
❌ Don't use inline styles

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)











