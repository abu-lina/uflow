/**
 * Epic Gap Analysis - Identify missing epics from codebase
 */

import { getAllEpics } from './epicHelpers';
import { createEpic } from './epicHelpers';
import type { CreateEpicInput } from './epicHelpers';

export interface ImplementedFeature {
  name: string;
  description: string;
  files: string[];
  category: 'authentication' | 'provider-management' | 'search-browse' | 'user-features' | 'admin' | 'infrastructure' | 'security' | 'performance' | 'compliance' | 'monitoring';
  moscow: 'Must have' | 'Should have' | 'Could have' | "Won't have";
  status: 'Fully Implemented' | 'Partially Implemented';
}

/**
 * Features that are implemented but may not have epics
 */
const IMPLEMENTED_FEATURES: ImplementedFeature[] = [
  {
    name: 'User Profile Management',
    description: 'User profile editing, account deletion, provider management from profile',
    files: ['src/app/(public)/profile', 'src/app/(public)/profile/edit', 'src/app/(public)/profile/delete'],
    category: 'user-features',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
  {
    name: 'Email Verification System',
    description: 'Email confirmation flow, check-email page, confirmation tokens',
    files: ['src/app/api/confirm-email', 'src/app/api/generate-confirmation-token', 'src/app/(public)/signup/check-email'],
    category: 'authentication',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
  {
    name: 'Password Reset Flow',
    description: 'Forgot password, reset password functionality',
    files: ['src/app/(public)/forgot-password', 'src/app/(public)/reset-password', 'src/app/api/auth/reset-password'],
    category: 'authentication',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
  {
    name: 'Quick Provider Import',
    description: 'Google Places and Instagram import for quick provider creation',
    files: ['src/app/(public)/create-quick', 'src/app/api/instagram/scrape'],
    category: 'provider-management',
    moscow: 'Should have',
    status: 'Fully Implemented',
  },
  {
    name: 'Provider Image Management',
    description: 'Image upload, gallery management for providers',
    files: ['src/app/(public)/create/media/images', 'src/app/(public)/profile/providers/[provider_id]/edit/images'],
    category: 'provider-management',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
  {
    name: 'Provider Social Media Integration',
    description: 'Social media links and Instagram integration',
    files: ['src/app/(public)/create/media/social', 'src/app/(public)/profile/providers/[provider_id]/edit/social'],
    category: 'provider-management',
    moscow: 'Should have',
    status: 'Fully Implemented',
  },
  {
    name: 'Community Services Feature',
    description: 'Community service listings and detail pages',
    files: ['src/app/(public)/community-services'],
    category: 'user-features',
    moscow: 'Should have',
    status: 'Fully Implemented',
  },
  {
    name: 'Push Notifications',
    description: 'Push notification subscription and sending',
    files: ['src/app/api/push/subscribe', 'src/app/api/push/send'],
    category: 'user-features',
    moscow: 'Could have',
    status: 'Fully Implemented',
  },
  {
    name: 'PWA Support',
    description: 'Progressive Web App with manifest, offline support',
    files: ['src/app/api/manifest', 'public/manifest.json'],
    category: 'infrastructure',
    moscow: 'Should have',
    status: 'Fully Implemented',
  },
  {
    name: 'API Documentation',
    description: 'Swagger/OpenAPI documentation for API endpoints',
    files: ['src/app/api/swagger', 'src/app/api-docs'],
    category: 'infrastructure',
    moscow: 'Could have',
    status: 'Fully Implemented',
  },
  {
    name: 'Health Check Endpoint',
    description: 'Health check API for monitoring and deployment',
    files: ['src/app/api/health'],
    category: 'infrastructure',
    moscow: 'Should have',
    status: 'Fully Implemented',
  },
  {
    name: 'Error Monitoring & Logging',
    description: 'Error handling, logging infrastructure, error boundaries',
    files: ['src/app/error.tsx'],
    category: 'monitoring',
    moscow: 'Must have',
    status: 'Partially Implemented',
  },
  {
    name: 'Internationalization (i18n)',
    description: 'Multi-language support, language detection, localized content',
    files: ['src/utils/languageUtils.ts', 'src/utils/serverLanguageUtils.ts', 'src/utils/metadataUtils.ts'],
    category: 'user-features',
    moscow: 'Should have',
    status: 'Partially Implemented',
  },
  {
    name: 'SEO Optimization',
    description: 'Metadata generation, Open Graph, Twitter Cards, canonical URLs',
    files: ['src/utils/metadataUtils.ts', 'src/app/layout.tsx'],
    category: 'infrastructure',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
  {
    name: 'Session Management',
    description: 'Server-side session handling, auth state sync',
    files: ['src/lib/auth.ts', 'src/providers/AuthSyncer.tsx'],
    category: 'authentication',
    moscow: 'Must have',
    status: 'Fully Implemented',
  },
];

/**
 * Critical features that should be epics but might be missing
 */
const CRITICAL_MISSING_EPICS: Omit<CreateEpicInput, 'name'>[] = [
  {
    description: 'Admin panel for reviewing and approving provider applications. Includes UI for viewing pending providers, approving/rejecting with feedback, and email notifications.',
    moscow: 'Must have',
    status: 'Not started',
    labels: ['admin', 'provider-review'],
  },
  {
    description: 'Error tracking and monitoring system. Integration with error tracking service (e.g., Sentry), error boundaries, logging infrastructure, and error reporting.',
    moscow: 'Must have',
    status: 'Not started',
    labels: ['monitoring', 'infrastructure'],
  },
  {
    description: 'Performance optimization across the application. Image optimization, code splitting, lazy loading, caching strategies, and performance monitoring.',
    moscow: 'Should have',
    status: 'Not started',
    labels: ['performance', 'optimization'],
  },
  {
    description: 'Security hardening and best practices. Security headers, input validation, rate limiting, CSRF protection, and security audit.',
    moscow: 'Must have',
    status: 'Not started',
    labels: ['security', 'compliance'],
  },
  {
    description: 'Accessibility (a11y) improvements. WCAG compliance, keyboard navigation, screen reader support, ARIA labels, and accessibility testing.',
    moscow: 'Should have',
    status: 'Not started',
    labels: ['accessibility', 'ux'],
  },
  {
    description: 'Analytics and user behavior tracking. Integration with analytics service, user behavior tracking, conversion tracking, and reporting dashboard.',
    moscow: 'Should have',
    status: 'Not started',
    labels: ['analytics', 'monitoring'],
  },
  {
    description: 'Database backup and disaster recovery. Automated backups, point-in-time recovery, backup testing, and disaster recovery procedures.',
    moscow: 'Must have',
    status: 'Not started',
    labels: ['infrastructure', 'security'],
  },
  {
    description: 'Content moderation system. Automated content filtering, manual review queue, reporting system, and moderation tools.',
    moscow: 'Should have',
    status: 'Not started',
    labels: ['moderation', 'safety'],
  },
];

export interface GapAnalysisResult {
  existingEpicNames: string[];
  missingEpics: Array<{
    name: string;
    input: CreateEpicInput;
    reason: string;
  }>;
  createdEpics: Array<{
    id: string;
    url: string;
    name: string;
  }>;
}

/**
 * Analyze codebase and identify missing epics
 */
export async function analyzeEpicGaps(
  databaseId?: string
): Promise<GapAnalysisResult> {
  // Try to fetch all existing epics, but handle errors gracefully
  let existingEpicNames: string[] = [];
  try {
    let dbId = databaseId;
    if (!dbId) {
      // Use default from DATABASE_IDS.md
      dbId = '2366163f450b8045985af4f66be56792';
    }
    const existingEpics = await getAllEpics(dbId);
    existingEpicNames = existingEpics.map((epic: { properties: Record<string, unknown> }) => {
      const props = epic.properties as Record<string, unknown>;
      return (props.Name as { title?: Array<{ text?: { content?: string } }> })?.title?.[0]?.text?.content || '';
    }).filter((name: string) => Boolean(name));
  } catch (error) {
    // If query fails, we'll still create missing epics based on our analysis
    // This allows the function to work even if database query has issues
    console.warn('Could not fetch existing epics for comparison:', error);
    console.warn('Will create all identified missing epics without duplicate checking');
  }

  const missingEpics: GapAnalysisResult['missingEpics'] = [];

  // Check implemented features
  for (const feature of IMPLEMENTED_FEATURES) {
    const normalizedName = feature.name.toLowerCase().trim();
    const exists = existingEpicNames.some((name) => 
      name.toLowerCase().trim() === normalizedName ||
      name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(name.toLowerCase())
    );

    if (!exists) {
      missingEpics.push({
        name: feature.name,
        input: {
          name: feature.name,
          description: feature.description,
          moscow: feature.moscow,
          status: feature.status === 'Fully Implemented' ? 'Done' : 'In progress',
          labels: [feature.category],
        },
        reason: `Feature is ${feature.status.toLowerCase()} but no epic exists`,
      });
    }
  }

  // Check critical missing epics
  for (const epicInput of CRITICAL_MISSING_EPICS) {
    const normalizedName = (epicInput.description || '').toLowerCase().substring(0, 50);
    const exists = existingEpicNames.some((name) => 
      name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(name.toLowerCase())
    );

    if (!exists) {
      // Extract name from description (first sentence or first 50 chars)
      const name = epicInput.description?.split('.')[0] || 'Untitled Epic';
      missingEpics.push({
        name,
        input: {
          name,
          ...epicInput,
        },
        reason: 'Critical feature identified from codebase analysis',
      });
    }
  }

  return {
    existingEpicNames,
    missingEpics,
    createdEpics: [],
  };
}

/**
 * Create missing epics in Notion
 */
export async function createMissingEpics(
  gapAnalysis: GapAnalysisResult,
  _databaseId?: string
): Promise<GapAnalysisResult> {
  const createdEpics: GapAnalysisResult['createdEpics'] = [];

  for (const missing of gapAnalysis.missingEpics) {
    try {
      const epic = await createEpic(missing.input);
      createdEpics.push({
        id: epic.id,
        url: epic.url,
        name: missing.name,
      });
    } catch (error) {
      console.error(`Failed to create epic "${missing.name}":`, error);
    }
  }

  return {
    ...gapAnalysis,
    createdEpics,
  };
}

