/**
 * Icon loader utility for optimized icon imports
 * 
 * This utility helps reduce bundle size by:
 * - Enabling better tree-shaking for lucide-react icons
 * - Providing a consistent API for icon loading
 * - Supporting dynamic icon loading when needed
 */

// Re-export commonly used icons from lucide-react for better tree-shaking
export {
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Moon,
  Building2,
  Tag,
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

/**
 * Dynamically load an icon from lucide-react
 * Use this for icons that are rarely used or conditionally rendered
 */
export async function loadLucideIcon(iconName: string) {
  try {
    const module = await import('lucide-react');
    const Icon = (module as Record<string, React.ComponentType>)[iconName];
    if (!Icon) {
      console.warn(`Icon "${iconName}" not found in lucide-react`);
      return null;
    }
    return Icon;
  } catch (error) {
    console.error(`Failed to load icon "${iconName}":`, error);
    return null;
  }
}
