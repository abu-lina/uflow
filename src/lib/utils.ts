import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names and merges Tailwind classes efficiently.
 * This utility helps prevent class conflicts and maintains consistent styling.
 *
 * @example
 * cn('px-2 py-1', 'bg-red-500', { 'text-white': isActive })
 *
 * @param inputs - Class names to combine (strings, objects, or arrays)
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string contains valid Tailwind classes.
 * This is useful for debugging and ensuring class consistency.
 *
 * @param className - The class string to validate
 * @returns boolean indicating if all classes are valid
 */
export function isValidTailwindClass(className: string): boolean {
  // Basic validation - can be enhanced with actual Tailwind class checking
  return className.split(' ').every((cls) => {
    // Check for common Tailwind patterns
    return (
      /^[a-z-]+$/.test(cls) || // Basic classes like 'flex', 'p-4'
      /^[a-z-]+-[0-9]+$/.test(cls) || // Classes with numbers like 'p-4', 'text-2xl'
      /^[a-z-]+-[a-z-]+$/.test(cls) || // Classes with modifiers like 'hover:bg-red-500'
      /^[a-z-]+-[a-z-]+-[0-9]+$/.test(cls)
    ); // Complex classes like 'hover:bg-red-500'
  });
}
