[![Coverage Status](https://img.shields.io/badge/coverage-vitest-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

# UFlow Project

A Next.js application built with Supabase, TypeScript, and Tailwind CSS.

## Project Structure

```
src/
├── app/                      # Next.js App Router pages and API routes
│   ├── (public)/            # Public routes (landing, login, etc.)
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── api/                 # API route handlers
│   ├── layout.tsx           # Root layout
│   ├── error.tsx            # Error boundary
│   └── loading.tsx          # Loading state
├── components/              # Reusable UI components
│   ├── common/             # Generic components
│   ├── layout/             # Layout components
│   ├── shared/             # Shared UI blocks
│   └── ui/                 # Atomic UI elements
├── features/               # Feature-specific modules
│   └── [feature-name]/     # Each feature has its own folder
│       ├── components/     # Feature-specific components
│       ├── hooks/         # Feature-specific hooks
│       └── services/      # Feature-specific services
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and configurations
│   ├── supabase/         # Supabase client and utilities
│   └── validations/      # Form validation schemas
├── providers/            # React context providers
│   └── AuthProvider.tsx  # Authentication context
├── services/            # External service integrations
├── styles/             # Global styles and Tailwind
├── types/              # TypeScript type definitions
│   └── supabase.ts    # Generated Supabase types
└── utils/             # Utility functions
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy .env.example to .env.local and fill in your Supabase credentials
4. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- \`NEXT_PUBLIC_SUPABASE_URL\`: Your Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`: Your Supabase anonymous key
- \`SUPABASE_SERVICE_ROLE_KEY\`: Your Supabase service role key (server-only)

## Authentication

Authentication is handled through Supabase Auth. The \`AuthProvider\` component manages the authentication state and provides it through the \`useAuth\` hook:

```typescript
const { user, session, isLoading, signOut } = useAuth();
```

## Adding New Features

1. Create a new folder in \`features/\` for your feature
2. Add feature-specific components, hooks, and services
3. Use the shared components from \`components/\` where possible
4. Add any necessary API routes in \`app/api/\`

## Best Practices

### Components

- Keep components small and focused
- Use TypeScript interfaces for props
- Implement error boundaries for feature-specific errors
- Use Suspense for loading states

### API Routes

- Use server-only environment variables
- Implement proper error handling
- Validate requests using Zod or similar
- Use appropriate HTTP status codes

### State Management

- Use React Context for global state
- Implement proper loading and error states
- Use SWR or React Query for data fetching

### Styling

- Use Tailwind CSS utility classes
- Follow the project's design system
- Implement responsive design
- Use CSS modules for component-specific styles

## Deployment

The project is configured for deployment on Vercel:

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

## Development Workflow

1. Create feature branch from main
2. Implement changes
3. Run tests and linting
4. Create PR for review
5. Merge after approval

## Available Scripts

- \`npm run dev\`: Start development server
- \`npm run build\`: Build for production
- \`npm run start\`: Start production server
- \`npm run lint\`: Run ESLint
- \`npm run test\`: Run tests
- \`npm run type-check\`: Run TypeScript checks

---

## 🛠️ Getting Started

### 1. **Clone the repo**

```sh
git clone https://github.com/your-org/uflow.git
cd uflow
```

### 2. **Install dependencies**

```sh
npm install
```

### 3. **Set up environment variables**

- Copy `.env.example` to `.env.local` and fill in the values:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - (Add any other required env vars)

### 4. **Connect to Supabase**

- [Create a Supabase project](https://app.supabase.com/).
- Get your project ref and API keys from the Supabase dashboard.
- Generate types:
  ```sh
  supabase gen types typescript --project-id <project-ref> --schema public > src/types/supabase.ts
  ```

### 5. **Run the development server**

```sh
npm run dev
```

- App will be available at [http://localhost:3000](http://localhost:3000)

---

## 🧩 Adding New Features

- Add new features in `src/features/feature-name/`.
- Use the modular structure: UI, hooks, and services per feature.
- Reuse components from `src/components/` when possible.
- Add tests in `src/__tests__/` or alongside features.

---

## 🔑 Managing Environment Variables

- **Public keys:** Prefix with `NEXT_PUBLIC_` (safe for client).
- **Server-only keys:** Never expose to client code.
- **.env.example:** Always update when adding new env vars.

---

## 🚀 Deployment

- **Vercel:**
  - Push to `main` or your production branch.
  - Set environment variables in the Vercel dashboard.
  - [Vercel Docs](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🧪 Testing

- Place tests in `src/__tests__/` or alongside features.
- Recommended: [Vitest](https://vitest.dev/) or [Jest](https://jestjs.io/).

---

## 🧑‍💻 Contributing

- Follow the established folder structure and code style.
- Use path aliases for imports (see `tsconfig.json`).
- Run `npm run lint` and `npm run format` before committing.

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 📝 License

MIT
