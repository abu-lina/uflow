/**
 * Components
 * 
 * This is the main entry point for all components in the application.
 * Components are organized into four main categories:
 * - UI: Reusable UI components built with Tailwind CSS and Radix UI
 * - Features: Feature-specific components that implement business logic
 * - Shared: Components shared across multiple features
 * - Layout: Components that define the application's structure
 */

// UI Components
// Reusable UI components built with Tailwind CSS and Radix UI primitives
export * from './ui';

// Feature Components
// Components specific to application features (auth, marketplace, etc.)
export * from './features';

// Shared Components
// Components shared across multiple features (common, profile, etc.)
export * from './shared';

// Layout Components
// Components that define the application's structure and layout
export * from './layout'; 