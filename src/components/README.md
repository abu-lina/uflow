# Components Directory Structure

This directory contains all React components used in the application, organized by their purpose and reusability.

## Directory Structure

```
src/components/
├── ui/                    # Reusable UI components
│   ├── button/           # Button components
│   ├── card/             # Card components
│   ├── form/             # Form components and inputs
│   ├── input/            # Input components
│   ├── label/            # Label components
│   ├── loading/          # Loading states and spinners
│   ├── select/           # Select/dropdown components
│   ├── skeleton/         # Skeleton loading components
│   ├── textarea/         # Textarea components
│   └── visuals/          # Visual components (icons, images)
├── layout/               # Layout components
│   ├── Header.tsx        # Main header component
│   ├── Grid.tsx          # Grid layout component
│   ├── navbar.tsx        # Navigation bar component
│   └── PageLayout.tsx    # Page layout wrapper
├── features/            # Feature-specific components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard components
│   └── marketplace/    # Marketplace components
└── shared/             # Shared components across features
    ├── common/         # Common utilities and helpers
    ├── profile/        # Profile-related components
    └── pwa/            # PWA-specific components
```

## Component Categories

### UI Components (`/ui`)
- Reusable, presentational components
- Should be framework-agnostic where possible
- Follow atomic design principles
- Include proper TypeScript types and documentation

### Layout Components (`/layout`)
- Components that define the overall structure
- Handle responsive layouts
- Manage page-level organization
- Include navigation and header components

### Feature Components (`/features`)
- Components specific to a particular feature
- May combine multiple UI components
- Handle feature-specific logic
- Should be co-located with their feature's routes

### Shared Components (`/shared`)
- Components used across multiple features
- Common utilities and helpers
- Cross-cutting concerns
- Should be well-documented and tested

## Best Practices

1. **Component Organization**
   - Keep components small and focused
   - Use index files for cleaner imports
   - Follow consistent naming conventions

2. **File Structure**
   - One component per file
   - Include tests in the same directory
   - Use TypeScript for type safety

3. **Documentation**
   - Include JSDoc comments
   - Document props and their types
   - Provide usage examples

4. **Testing**
   - Write tests for complex logic
   - Include storybook stories for UI components
   - Test accessibility features

## Import Guidelines

```typescript
// UI Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Layout Components
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/navbar';

// Feature Components
import { SignupForm } from '@/components/features/auth/SignupForm';

// Shared Components
import { ProfileCard } from '@/components/shared/profile/ProfileCard';
```

## Adding New Components

1. Determine the component category
2. Create appropriate directory if needed
3. Add component with proper documentation
4. Update relevant index files
5. Add tests and stories 