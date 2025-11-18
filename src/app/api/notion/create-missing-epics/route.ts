import { NextResponse } from 'next/server';
import { createEpic } from '@/lib/notion/epicHelpers';
import type { CreateEpicInput } from '@/lib/notion/epicHelpers';

/**
 * POST /api/notion/create-missing-epics
 * 
 * Create missing epics identified from codebase analysis
 * This creates epics directly without needing to query the database first
 */
export async function POST(_request: Request) {
  try {
    // Missing epics to create based on codebase analysis
    const missingEpics: CreateEpicInput[] = [
      {
        name: 'Admin Panel for Provider Review',
        description: 'Admin panel for reviewing and approving provider applications. Includes UI for viewing pending providers, approving/rejecting with feedback, and email notifications.',
        moscow: 'Must have',
        status: 'Not started',
        labels: ['admin', 'provider-review'],
      },
      {
        name: 'Error Monitoring & Logging',
        description: 'Error tracking and monitoring system. Integration with error tracking service (e.g., Sentry), error boundaries, logging infrastructure, and error reporting.',
        moscow: 'Must have',
        status: 'Not started',
        labels: ['monitoring', 'infrastructure'],
      },
      {
        name: 'Performance Optimization',
        description: 'Performance optimization across the application. Image optimization, code splitting, lazy loading, caching strategies, and performance monitoring.',
        moscow: 'Should have',
        status: 'Not started',
        labels: ['performance', 'optimization'],
      },
      {
        name: 'Security Hardening',
        description: 'Security hardening and best practices. Security headers, input validation, rate limiting, CSRF protection, and security audit.',
        moscow: 'Must have',
        status: 'Not started',
        labels: ['security', 'compliance'],
      },
      {
        name: 'Accessibility (a11y) Improvements',
        description: 'Accessibility improvements. WCAG compliance, keyboard navigation, screen reader support, ARIA labels, and accessibility testing.',
        moscow: 'Should have',
        status: 'Not started',
        labels: ['accessibility', 'ux'],
      },
      {
        name: 'Analytics & User Behavior Tracking',
        description: 'Analytics and user behavior tracking. Integration with analytics service, user behavior tracking, conversion tracking, and reporting dashboard.',
        moscow: 'Should have',
        status: 'Not started',
        labels: ['analytics', 'monitoring'],
      },
      {
        name: 'Database Backup & Disaster Recovery',
        description: 'Database backup and disaster recovery. Automated backups, point-in-time recovery, backup testing, and disaster recovery procedures.',
        moscow: 'Must have',
        status: 'Not started',
        labels: ['infrastructure', 'security'],
      },
      {
        name: 'Content Moderation System',
        description: 'Content moderation system. Automated content filtering, manual review queue, reporting system, and moderation tools.',
        moscow: 'Should have',
        status: 'Not started',
        labels: ['moderation', 'safety'],
      },
      {
        name: 'User Profile Management',
        description: 'User profile editing, account deletion, provider management from profile. Already implemented but should be tracked as epic.',
        moscow: 'Must have',
        status: 'Done',
        labels: ['user-features'],
      },
      {
        name: 'Email Verification System',
        description: 'Email confirmation flow, check-email page, confirmation tokens. Already implemented but should be tracked as epic.',
        moscow: 'Must have',
        status: 'Done',
        labels: ['authentication'],
      },
      {
        name: 'Password Reset Flow',
        description: 'Forgot password, reset password functionality. Already implemented but should be tracked as epic.',
        moscow: 'Must have',
        status: 'Done',
        labels: ['authentication'],
      },
      {
        name: 'Quick Provider Import',
        description: 'Google Places and Instagram import for quick provider creation. Already implemented but should be tracked as epic.',
        moscow: 'Should have',
        status: 'Done',
        labels: ['provider-management'],
      },
      {
        name: 'Provider Image Management',
        description: 'Image upload, gallery management for providers. Already implemented but should be tracked as epic.',
        moscow: 'Must have',
        status: 'Done',
        labels: ['provider-management'],
      },
      {
        name: 'Provider Social Media Integration',
        description: 'Social media links and Instagram integration. Already implemented but should be tracked as epic.',
        moscow: 'Should have',
        status: 'Done',
        labels: ['provider-management'],
      },
      {
        name: 'Community Services Feature',
        description: 'Community service listings and detail pages. Already implemented but should be tracked as epic.',
        moscow: 'Should have',
        status: 'Done',
        labels: ['user-features'],
      },
      {
        name: 'Push Notifications',
        description: 'Push notification subscription and sending. Already implemented but should be tracked as epic.',
        moscow: 'Could have',
        status: 'Done',
        labels: ['user-features'],
      },
      {
        name: 'PWA Support',
        description: 'Progressive Web App with manifest, offline support. Already implemented but should be tracked as epic.',
        moscow: 'Should have',
        status: 'Done',
        labels: ['infrastructure'],
      },
      {
        name: 'SEO Optimization',
        description: 'Metadata generation, Open Graph, Twitter Cards, canonical URLs. Already implemented but should be tracked as epic.',
        moscow: 'Must have',
        status: 'Done',
        labels: ['infrastructure'],
      },
    ];

    const createdEpics: Array<{ id: string; url: string; name: string }> = [];
    const failedEpics: Array<{ name: string; error: string }> = [];

    for (const epicInput of missingEpics) {
      try {
        const epic = await createEpic(epicInput);
        createdEpics.push({
          id: epic.id,
          url: epic.url,
          name: epicInput.name,
        });
      } catch (error) {
        console.error(`Failed to create epic "${epicInput.name}":`, error);
        failedEpics.push({
          name: epicInput.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdEpics.length,
      failed: failedEpics.length,
      createdEpics,
      failedEpics: failedEpics.length > 0 ? failedEpics : undefined,
    });
  } catch (error) {
    console.error('Error creating missing epics:', error);
    return NextResponse.json(
      {
        error: 'Failed to create missing epics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

