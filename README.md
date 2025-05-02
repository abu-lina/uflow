[![Coverage Status](https://img.shields.io/badge/coverage-vitest-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)

# Ummah Flow - Islamic Marketplace

Ummah Flow is a modern marketplace platform for Islamic products and services, built with Next.js 14, TypeScript, and TailwindCSS.

## Features

- **Modern Tech Stack**: Next.js 14+ with App Router, TypeScript, and TailwindCSS
- **Responsive Design**: Mobile-first approach ensuring great UX across all devices
- **Authentication**: User authentication and account management
- **Marketplace Features**: Product listings, categories, search, and filtering
- **Seller Dashboard**: Tools for sellers to manage their products and services
- **Cart & Checkout**: Seamless shopping experience

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
