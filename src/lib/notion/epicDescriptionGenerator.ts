/**
 * Generate structured epic descriptions using a consistent template
 */

import { createTask, type CreateTaskInput } from './taskHelpers';
import type { MoSCoW, EpicStatus } from './epicHelpers';

export interface EpicData {
  id: string;
  name: string;
  moscow: MoSCoW | null;
  status: EpicStatus | null;
  labels: string[];
  rank?: number | null;
  targetDelivery?: string | null;
}

export interface GeneratedDescription {
  description: string;
  stories: Array<{ name: string; description: string }>;
}

/**
 * Generate a structured epic description using the template format
 */
export function generateEpicDescription(epicData: EpicData): GeneratedDescription {
  const { name, moscow, status, labels } = epicData;

  // Generate Purpose based on epic name
  const purpose = generatePurpose(name, labels);

  // Generate Metrics based on epic type
  const metrics = generateMetrics(name, labels);

  // Generate Why Now based on MoSCoW and context
  const whyNow = generateWhyNow(name, moscow, labels, status);

  // Generate In Scope and Out of Scope
  const { inScope, outOfScope } = generateScope(name, labels);

  // Generate initial stories
  const stories = generateStories(name, labels);

  // Generate Dependencies
  const dependencies = generateDependencies(name, labels);

  // Generate Risks
  const risks = generateRisks(name, labels, moscow);

  // Build the description markdown
  const description = buildDescriptionTemplate({
    title: name,
    purpose,
    metrics,
    whyNow,
    inScope,
    outOfScope,
    stories,
    dependencies,
    risks,
  });

  return {
    description,
    stories,
  };
}

/**
 * Generate Purpose statement
 */
function generatePurpose(epicName: string, labels: string[]): string {
  // Infer user type from epic name and labels
  let userType = 'user';
  if (labels.includes('admin')) {
    userType = 'admin';
  } else if (labels.includes('provider-management')) {
    userType = 'provider';
  } else if (epicName.toLowerCase().includes('admin')) {
    userType = 'admin';
  } else if (epicName.toLowerCase().includes('provider')) {
    userType = 'provider';
  }

  // Infer what and outcome from epic name
  const epicLower = epicName.toLowerCase();
  let what = epicName;
  let outcome = 'improve the user experience';

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    what = 'authenticate and manage my account';
    outcome = 'access the platform securely';
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    what = 'manage and review content';
    outcome = 'maintain platform quality and compliance';
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    what = 'manage my business listing';
    outcome = 'reach more customers';
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    what = 'find and discover providers';
    outcome = 'quickly locate what I need';
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    userType = 'developer';
    what = 'monitor system health and errors';
    outcome = 'ensure platform reliability';
  } else if (epicLower.includes('backup') || epicLower.includes('disaster')) {
    userType = 'developer';
    what = 'backup and recover data';
    outcome = 'protect against data loss';
  } else if (epicLower.includes('security') || epicLower.includes('hardening')) {
    userType = 'developer';
    what = 'secure the platform';
    outcome = 'protect user data and prevent attacks';
  } else if (epicLower.includes('performance') || epicLower.includes('optimization')) {
    userType = 'developer';
    what = 'optimize platform performance';
    outcome = 'deliver a fast and responsive experience';
  } else if (epicLower.includes('seo')) {
    what = 'discover the platform through search';
    outcome = 'find the platform organically';
  } else if (epicLower.includes('accessibility') || epicLower.includes('a11y')) {
    what = 'access the platform';
    outcome = 'use the platform regardless of abilities';
  } else if (epicLower.includes('analytics') || epicLower.includes('tracking')) {
    userType = 'product manager';
    what = 'track user behavior and metrics';
    outcome = 'make data-driven decisions';
  } else if (epicLower.includes('i18n') || epicLower.includes('internationalization') || epicLower.includes('multilingual')) {
    what = 'use the platform in my language';
    outcome = 'access content in my preferred language';
  } else if (epicLower.includes('pwa') || epicLower.includes('progressive web app')) {
    what = 'install and use the platform as an app';
    outcome = 'access the platform offline and with app-like experience';
  } else if (epicLower.includes('moderation') || epicLower.includes('content moderation')) {
    what = 'report and moderate content';
    outcome = 'maintain a safe and compliant platform';
  }

  return `As a ${userType}, I need ${what} to ${outcome}.`;
}

/**
 * Generate Metrics
 */
function generateMetrics(epicName: string, _labels: string[]): string[] {
  const epicLower = epicName.toLowerCase();
  const metrics: string[] = [];

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    metrics.push('User registration rate: 0% → 5%');
    metrics.push('Login success rate: 0% → 95%');
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    metrics.push('Content review time: N/A → < 5 min');
    metrics.push('Approval rate: 0% → 80%');
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    metrics.push('Provider signup rate: 0% → 10/month');
    metrics.push('Listing completion rate: 0% → 70%');
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    metrics.push('Search success rate: 0% → 85%');
    metrics.push('Time to find provider: N/A → < 30s');
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    metrics.push('Error detection time: N/A → < 1 min');
    metrics.push('System uptime: 0% → 99.9%');
  } else if (epicLower.includes('performance') || epicLower.includes('optimization')) {
    metrics.push('Page load time: N/A → < 2s');
    metrics.push('API response time: N/A → < 500ms');
  } else if (epicLower.includes('seo')) {
    metrics.push('Organic search traffic: 0 → 1000/month');
    metrics.push('Search ranking: N/A → Top 10');
  } else if (epicLower.includes('analytics') || epicLower.includes('tracking')) {
    metrics.push('Event tracking coverage: 0% → 90%');
    metrics.push('Dashboard load time: N/A → < 1s');
  } else if (epicLower.includes('i18n') || epicLower.includes('internationalization') || epicLower.includes('multilingual')) {
    metrics.push('Language coverage: 1 → 3 languages');
    metrics.push('Translation completeness: 0% → 100%');
  } else if (epicLower.includes('pwa')) {
    metrics.push('PWA install rate: 0% → 10%');
    metrics.push('Offline usage: 0% → 30%');
  } else if (epicLower.includes('moderation') || epicLower.includes('content moderation')) {
    metrics.push('Content review time: N/A → < 24h');
    metrics.push('False positive rate: N/A → < 5%');
  } else {
    // Default metrics
    metrics.push('User engagement: 0% → TBD');
    metrics.push('Feature adoption: 0% → TBD');
  }

  return metrics;
}

/**
 * Generate Why Now statement
 */
function generateWhyNow(
  epicName: string,
  moscow: MoSCoW | null,
  _labels: string[],
  _status: EpicStatus | null
): string {
  const urgency = (moscow === 'Must have' || (moscow as string) === 'Must') ? 'critical' :
                  (moscow === 'Should have' || (moscow as string) === 'Should') ? 'important' :
                  'nice to have';

  const epicLower = epicName.toLowerCase();
  let context1 = '';
  let context2 = '';

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    context1 = 'User registration and authentication is foundational to all platform features.';
    context2 = 'Without this, users cannot access the platform or create accounts.';
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    context1 = 'Content moderation and provider review is essential for platform quality and compliance.';
    context2 = 'We need administrative tools to manage the growing number of providers and listings.';
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    context1 = 'System monitoring is critical for maintaining platform reliability and catching issues early.';
    context2 = 'Without proper monitoring, we cannot identify and resolve problems before they impact users.';
  } else if (epicLower.includes('backup') || epicLower.includes('disaster')) {
    context1 = 'Data backup and disaster recovery is essential for business continuity.';
    context2 = 'We need to protect against data loss and ensure quick recovery from incidents.';
  } else if (epicLower.includes('security') || epicLower.includes('hardening')) {
    context1 = 'Security hardening is critical to protect user data and prevent breaches.';
    context2 = 'As we scale, security vulnerabilities become more attractive targets for attackers.';
  } else if (epicLower.includes('performance') || epicLower.includes('optimization')) {
    context1 = 'Performance optimization improves user experience and reduces infrastructure costs.';
    context2 = 'Slow load times lead to user frustration and increased bounce rates.';
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    context1 = 'Provider management is core to the platform\'s value proposition.';
    context2 = 'We need robust tools for providers to manage their listings and reach customers.';
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    context1 = 'Discovery is fundamental to user engagement and provider visibility.';
    context2 = 'Users need efficient ways to find relevant providers and services.';
  } else {
    context1 = `This feature is ${urgency} for the platform's success.`;
    context2 = 'It addresses key user needs and supports our business objectives.';
  }

  return `${context1} ${context2}`;
}

/**
 * Generate In Scope and Out of Scope items
 */
function generateScope(epicName: string, _labels: string[]): { inScope: string[]; outOfScope: string[] } {
  const epicLower = epicName.toLowerCase();
  const inScope: string[] = [];
  const outOfScope: string[] = [];

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    inScope.push('Email/password registration');
    inScope.push('Email verification');
    inScope.push('Password reset flow');
    inScope.push('Session management');
    outOfScope.push('Social login (OAuth)');
    outOfScope.push('Two-factor authentication');
    outOfScope.push('Biometric authentication');
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    inScope.push('Provider application review');
    inScope.push('Content moderation tools');
    inScope.push('User management');
    outOfScope.push('Advanced analytics dashboard');
    outOfScope.push('Bulk operations');
    outOfScope.push('Custom workflows');
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    inScope.push('Error tracking and alerting');
    inScope.push('Application performance monitoring');
    inScope.push('Log aggregation');
    outOfScope.push('Custom dashboards');
    outOfScope.push('Advanced analytics');
    outOfScope.push('Machine learning insights');
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    inScope.push('Provider registration');
    inScope.push('Listing management');
    inScope.push('Profile management');
    outOfScope.push('Payment processing');
    outOfScope.push('Advanced analytics');
    outOfScope.push('Multi-location support');
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    inScope.push('Category browsing');
    inScope.push('Basic filtering');
    inScope.push('Search functionality');
    outOfScope.push('Advanced search filters');
    outOfScope.push('Recommendation engine');
    outOfScope.push('Saved searches');
  } else if (epicLower.includes('performance') || epicLower.includes('optimization')) {
    inScope.push('Database query optimization');
    inScope.push('Caching strategy');
    inScope.push('Asset optimization');
    outOfScope.push('CDN implementation');
    outOfScope.push('Advanced caching layers');
    outOfScope.push('Database sharding');
  } else if (epicLower.includes('seo')) {
    inScope.push('Meta tags optimization');
    inScope.push('Structured data');
    inScope.push('Sitemap generation');
    outOfScope.push('Advanced schema markup');
    outOfScope.push('International SEO');
    outOfScope.push('Content optimization');
  } else if (epicLower.includes('analytics') || epicLower.includes('tracking')) {
    inScope.push('Basic event tracking');
    inScope.push('User behavior analytics');
    inScope.push('Conversion tracking');
    outOfScope.push('Advanced segmentation');
    outOfScope.push('Predictive analytics');
    outOfScope.push('Real-time dashboards');
  } else if (epicLower.includes('i18n') || epicLower.includes('internationalization') || epicLower.includes('multilingual')) {
    inScope.push('Translation infrastructure');
    inScope.push('Language switcher');
    inScope.push('Key content translation');
    outOfScope.push('RTL language support');
    outOfScope.push('Currency localization');
    outOfScope.push('Date/time localization');
  } else if (epicLower.includes('pwa')) {
    inScope.push('Service worker implementation');
    inScope.push('Offline functionality');
    inScope.push('App-like experience');
    outOfScope.push('Push notifications');
    outOfScope.push('Background sync');
    outOfScope.push('App store distribution');
  } else if (epicLower.includes('moderation') || epicLower.includes('content moderation')) {
    inScope.push('Content flagging');
    inScope.push('Review queue');
    inScope.push('Basic moderation tools');
    outOfScope.push('Automated moderation');
    outOfScope.push('AI-powered detection');
    outOfScope.push('Advanced reporting');
  } else {
    inScope.push('Core functionality');
    inScope.push('Basic user experience');
    outOfScope.push('Advanced features');
    outOfScope.push('Third-party integrations');
  }

  return { inScope, outOfScope };
}

/**
 * Generate initial stories
 */
function generateStories(epicName: string, _labels: string[]): Array<{ name: string; description: string }> {
  const epicLower = epicName.toLowerCase();
  const stories: Array<{ name: string; description: string }> = [];

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    stories.push({
      name: 'User Registration',
      description: 'As a new user, I want to create an account so that I can access the platform.',
    });
    stories.push({
      name: 'Email Verification',
      description: 'As a user, I want to verify my email address so that my account is secure.',
    });
    stories.push({
      name: 'Password Reset',
      description: 'As a user, I want to reset my password so that I can regain access to my account.',
    });
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    stories.push({
      name: 'Review Provider Applications',
      description: 'As an admin, I want to review provider applications so that I can approve or reject them.',
    });
    stories.push({
      name: 'Content Moderation',
      description: 'As an admin, I want to moderate content so that I can maintain platform quality.',
    });
    stories.push({
      name: 'User Management',
      description: 'As an admin, I want to manage users so that I can handle support issues.',
    });
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    stories.push({
      name: 'Error Tracking Setup',
      description: 'As a developer, I want error tracking so that I can identify and fix issues quickly.',
    });
    stories.push({
      name: 'Performance Monitoring',
      description: 'As a developer, I want performance monitoring so that I can optimize slow queries.',
    });
    stories.push({
      name: 'Alert Configuration',
      description: 'As a developer, I want alerts so that I am notified of critical issues.',
    });
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    stories.push({
      name: 'Provider Registration',
      description: 'As a provider, I want to register my business so that I can list my services.',
    });
    stories.push({
      name: 'Listing Management',
      description: 'As a provider, I want to manage my listings so that I can keep information up to date.',
    });
    stories.push({
      name: 'Profile Management',
      description: 'As a provider, I want to manage my profile so that customers can find me.',
    });
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    stories.push({
      name: 'Browse by Category',
      description: 'As a user, I want to browse providers by category so that I can find what I need.',
    });
    stories.push({
      name: 'Search Functionality',
      description: 'As a user, I want to search for providers so that I can find specific services.',
    });
    stories.push({
      name: 'Filter Results',
      description: 'As a user, I want to filter search results so that I can narrow down my options.',
    });
  } else {
    // Default stories based on epic name
    stories.push({
      name: `${epicName} - Core Functionality`,
      description: `As a user, I want ${epicName.toLowerCase()} so that I can benefit from this feature.`,
    });
    stories.push({
      name: `${epicName} - User Experience`,
      description: `As a user, I want a smooth experience with ${epicName.toLowerCase()} so that it is easy to use.`,
    });
  }

  return stories;
}

/**
 * Generate Dependencies
 */
function generateDependencies(epicName: string, _labels: string[]): string[] {
  const epicLower = epicName.toLowerCase();
  const dependencies: string[] = [];

  if (epicLower.includes('admin') || epicLower.includes('panel')) {
    dependencies.push('User Authentication System');
    dependencies.push('Provider Registration System');
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    dependencies.push('Error tracking service (e.g., Sentry)');
    dependencies.push('Logging infrastructure');
  } else if (epicLower.includes('backup') || epicLower.includes('disaster')) {
    dependencies.push('Database infrastructure');
    dependencies.push('Backup storage solution');
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    dependencies.push('User Authentication System');
    dependencies.push('Image upload functionality');
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    dependencies.push('Provider data structure');
    dependencies.push('Category taxonomy');
  } else if (epicLower.includes('analytics') || epicLower.includes('tracking')) {
    dependencies.push('Analytics service (e.g., Google Analytics)');
    dependencies.push('Event tracking infrastructure');
  } else if (epicLower.includes('i18n') || epicLower.includes('internationalization') || epicLower.includes('multilingual')) {
    dependencies.push('Translation service or content');
    dependencies.push('i18n library integration');
  } else if (epicLower.includes('pwa')) {
    dependencies.push('Service worker support');
    dependencies.push('HTTPS configuration');
  } else if (epicLower.includes('seo')) {
    dependencies.push('Content management system');
    dependencies.push('Sitemap generation tool');
  }

  if (dependencies.length === 0) {
    dependencies.push('None identified');
  }

  return dependencies;
}

/**
 * Generate Risks
 */
function generateRisks(epicName: string, labels: string[], moscow: MoSCoW | null): string[] {
  const epicLower = epicName.toLowerCase();
  const risks: string[] = [];

  if (epicLower.includes('authentication') || epicLower.includes('login') || epicLower.includes('register')) {
    risks.push('Security vulnerabilities in authentication flow');
    risks.push('User data privacy concerns');
    risks.push('Email delivery issues affecting verification');
  } else if (epicLower.includes('admin') || epicLower.includes('panel')) {
    risks.push('Unauthorized access to admin features');
    risks.push('Performance impact of moderation operations');
    risks.push('Scalability of review process');
  } else if (epicLower.includes('monitoring') || epicLower.includes('error') || epicLower.includes('logging')) {
    risks.push('Service downtime affecting monitoring');
    risks.push('Data retention and storage costs');
    risks.push('Alert fatigue from too many notifications');
  } else if (epicLower.includes('backup') || epicLower.includes('disaster')) {
    risks.push('Backup failure or corruption');
    risks.push('Recovery time objectives not met');
    risks.push('Storage costs scaling with data growth');
  } else if (epicLower.includes('security') || epicLower.includes('hardening')) {
    risks.push('Breaking changes affecting existing functionality');
    risks.push('Performance impact of security measures');
    risks.push('Incomplete security coverage');
  } else if (epicLower.includes('performance') || epicLower.includes('optimization')) {
    risks.push('Optimization breaking existing functionality');
    risks.push('Increased complexity in codebase');
    risks.push('Premature optimization');
  } else if (epicLower.includes('provider') || epicLower.includes('seller')) {
    risks.push('Provider onboarding friction');
    risks.push('Data quality issues from user input');
    risks.push('Scalability of provider management');
  } else if (epicLower.includes('search') || epicLower.includes('browse') || epicLower.includes('category')) {
    risks.push('Search performance with large datasets');
    risks.push('Inaccurate search results');
    risks.push('Category taxonomy complexity');
  } else if (epicLower.includes('analytics') || epicLower.includes('tracking')) {
    risks.push('Privacy compliance (GDPR, etc.)');
    risks.push('Performance impact of tracking');
    risks.push('Data accuracy and completeness');
  } else if (epicLower.includes('i18n') || epicLower.includes('internationalization') || epicLower.includes('multilingual')) {
    risks.push('Translation quality and accuracy');
    risks.push('Maintenance overhead of multiple languages');
    risks.push('UI layout issues with different languages');
  } else if (epicLower.includes('pwa')) {
    risks.push('Browser compatibility issues');
    risks.push('Offline data synchronization complexity');
    risks.push('Service worker update management');
  } else if (epicLower.includes('moderation') || epicLower.includes('content moderation')) {
    risks.push('False positives in content moderation');
    risks.push('Moderation backlog and delays');
    risks.push('Bias in moderation decisions');
  } else {
    risks.push('Scope creep during implementation');
    risks.push('Technical complexity exceeding estimates');
    risks.push('User adoption and engagement');
  }

  // Add MoSCoW-specific risks
  if (moscow === 'Must have' || (moscow as string) === 'Must') {
    risks.push('Critical path dependency - delays impact other features');
  }

  if (risks.length === 0) {
    risks.push('None identified');
  }

  return risks;
}

/**
 * Build the description template
 */
function buildDescriptionTemplate(params: {
  title: string;
  purpose: string;
  metrics: string[];
  whyNow: string;
  inScope: string[];
  outOfScope: string[];
  stories: Array<{ name: string; description: string }>;
  dependencies: string[];
  risks: string[];
}): string {
  const { title, purpose, metrics, whyNow, inScope, outOfScope, stories, dependencies, risks } = params;

  let description = `## ${title}\n\n`;
  description += `**Purpose**: ${purpose}\n\n`;
  description += `**Metrics**:\n`;
  metrics.forEach((metric) => {
    description += `- ${metric}\n`;
  });
  description += `\n**Why Now**: ${whyNow}\n\n`;
  description += `**In Scope**:\n`;
  inScope.forEach((item) => {
    description += `- ${item}\n`;
  });
  description += `\n**Out of Scope**:\n`;
  outOfScope.forEach((item) => {
    description += `- ${item}\n`;
  });
  description += `\n**Stories**:\n`;
  stories.forEach((story) => {
    description += `- [ ] ${story.name}\n`;
  });
  description += `\n**Dependencies**: ${dependencies.join(', ')}\n\n`;
  description += `**Risks**: ${risks.join(', ')}\n\n`;
  description += `**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]\n`;

  return description;
}

/**
 * Create stories in Notion Issues database
 */
export async function createEpicStories(
  epicId: string,
  stories: Array<{ name: string; description: string }>
): Promise<Array<{ id: string; url: string; name: string }>> {
  const createdStories: Array<{ id: string; url: string; name: string }> = [];

  for (const story of stories) {
    try {
      const taskInput: CreateTaskInput = {
        name: story.name,
        type: 'Story',
        description: story.description,
        status: 'Not started',
        epicId: epicId,
      };

      const task = await createTask(taskInput);
      createdStories.push({
        id: task.id,
        url: task.url,
        name: story.name,
      });

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to create story "${story.name}":`, error);
      // Continue with next story
    }
  }

  return createdStories;
}

