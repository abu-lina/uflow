'use client';

import { Header } from './Header';

/**
 * Client-side wrapper for the Header component.
 * This ensures the Header's interactive elements (dropdowns, buttons)
 * are properly hydrated in both server and client component contexts.
 *
 * This pattern is used to maintain interactivity across all pages,
 * including those that are server components by default.
 */
export function ClientHeader() {
  return <Header />;
}
