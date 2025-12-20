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











