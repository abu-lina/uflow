# Ummah Flow - Islamic Marketplace

Ummah Flow is a modern marketplace platform for Islamic products and services, built with Next.js 14, TypeScript, and TailwindCSS.

## Features

- **Modern Tech Stack**: Next.js 14+ with App Router, TypeScript, and TailwindCSS
- **Responsive Design**: Mobile-first approach ensuring great UX across all devices
- **Authentication**: User authentication and account management
- **Marketplace Features**: Product listings, categories, search, and filtering
- **Seller Dashboard**: Tools for sellers to manage their products and services
- **Cart & Checkout**: Seamless shopping experience

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ummah-flow.git
cd ummah-flow
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
```bash
cp .env.example .env.local
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

- `src/app/` - App Router pages and layouts
- `src/components/` - Reusable UI components
- `src/lib/` - Utility functions and shared code
- `public/` - Static assets
- `src/styles/` - Global styles and TailwindCSS config

## Environment Variables

The following environment variables need to be set in your `.env.local` file:

```
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication (replace with your preferred auth provider details)
NEXT_PUBLIC_AUTH_URL=
AUTH_SECRET=

# Database (replace with your database connection details)
DATABASE_URL=

# API Keys (add any external service API keys here)
NEXT_PUBLIC_API_URL=
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality
- `npm run test` - Run tests

## Next Steps

- Implement authentication with NextAuth.js
- Create database models and API routes
- Add product and service listing functionality
- Implement search and filtering
- Create user profiles and seller dashboards
- Set up cart and checkout functionality
- Add payment gateway integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
