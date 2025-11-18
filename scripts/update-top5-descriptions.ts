/**
 * Script to update descriptions for the first 5 epics
 * Uses the Notion API client directly
 * 
 * Run with: npx tsx scripts/update-top5-descriptions.ts
 * Requires: NOTION_API_TOKEN in .env.local
 */

// Load environment variables from .env.local if available
// For Next.js projects, environment variables are typically loaded automatically
// If running standalone, ensure NOTION_API_TOKEN is set in your environment

import { updateEpic } from '../src/lib/notion/epicHelpers';

// Top 5 epics with generated descriptions
const top5Epics = [
  {
    id: '2ae6163f-450b-8150-a95d-d151aa0a0885',
    name: 'Admin panel for reviewing and approving provider applications',
    description: `## Admin panel for reviewing and approving provider applications

**Purpose**: As an admin, I need to manage and review content to maintain platform quality and compliance.

**Metrics**:
- Content review time: N/A → < 5 min
- Approval rate: 0% → 80%

**Why Now**: Content moderation and provider review is essential for platform quality and compliance. We need administrative tools to manage the growing number of providers and listings.

**In Scope**:
- Provider application review
- Content moderation tools
- User management

**Out of Scope**:
- Advanced analytics dashboard
- Bulk operations
- Custom workflows

**Stories**:
- [ ] Review Provider Applications
- [ ] Content Moderation
- [ ] User Management

**Dependencies**: User Authentication System, Provider Registration System

**Risks**: Unauthorized access to admin features, Performance impact of moderation operations, Scalability of review process

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]`,
  },
  {
    id: '2ae6163f-450b-81ae-bf35-d8484c12dbf5',
    name: 'Admin Panel for Provider Review',
    description: `## Admin Panel for Provider Review

**Purpose**: As an admin, I need to manage and review content to maintain platform quality and compliance.

**Metrics**:
- Content review time: N/A → < 5 min
- Approval rate: 0% → 80%

**Why Now**: Content moderation and provider review is essential for platform quality and compliance. We need administrative tools to manage the growing number of providers and listings.

**In Scope**:
- Provider application review
- Content moderation tools
- User management

**Out of Scope**:
- Advanced analytics dashboard
- Bulk operations
- Custom workflows

**Stories**:
- [ ] Review Provider Applications
- [ ] Content Moderation
- [ ] User Management

**Dependencies**: User Authentication System, Provider Registration System

**Risks**: Unauthorized access to admin features, Performance impact of moderation operations, Scalability of review process

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]`,
  },
  {
    id: '2ae6163f-450b-8191-a21b-fdf5ccad3d5a',
    name: 'Database Backup & Disaster Recovery',
    description: `## Database Backup & Disaster Recovery

**Purpose**: As a developer, I need to backup and recover data to protect against data loss.

**Metrics**:
- Backup frequency: N/A → Daily
- Recovery time objective: N/A → < 4 hours
- Data retention: 0 days → 30 days

**Why Now**: Data backup and disaster recovery is essential for business continuity. We need to protect against data loss and ensure quick recovery from incidents.

**In Scope**:
- Automated daily backups
- Backup storage solution
- Disaster recovery procedures
- Backup verification

**Out of Scope**:
- Real-time replication
- Multi-region backups
- Point-in-time recovery beyond 30 days

**Stories**:
- [ ] Database Backup & Disaster Recovery - Core Functionality
- [ ] Database Backup & Disaster Recovery - User Experience

**Dependencies**: Database infrastructure, Backup storage solution

**Risks**: Backup failure or corruption, Recovery time objectives not met, Storage costs scaling with data growth, Critical path dependency - delays impact other features

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]`,
  },
  {
    id: '2ae6163f-450b-8185-88ba-eebad164ce20',
    name: 'Error tracking and monitoring system',
    description: `## Error tracking and monitoring system

**Purpose**: As a developer, I need to monitor system health and errors to ensure platform reliability.

**Metrics**:
- Error detection time: N/A → < 1 min
- System uptime: 0% → 99.9%

**Why Now**: System monitoring is critical for maintaining platform reliability and catching issues early. Without proper monitoring, we cannot identify and resolve problems before they impact users.

**In Scope**:
- Error tracking and alerting
- Application performance monitoring
- Log aggregation

**Out of Scope**:
- Custom dashboards
- Advanced analytics
- Machine learning insights

**Stories**:
- [ ] Error Tracking Setup
- [ ] Performance Monitoring
- [ ] Alert Configuration

**Dependencies**: Error tracking service (e.g., Sentry), Logging infrastructure

**Risks**: Service downtime affecting monitoring, Data retention and storage costs, Alert fatigue from too many notifications, Critical path dependency - delays impact other features

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]`,
  },
  {
    id: '2366163f-450b-8010-842c-d31644e8e2e7',
    name: 'Report Content',
    description: `## Report Content

**Purpose**: As a user, I need to report content or owners to maintain a safe and compliant platform.

**Metrics**:
- Content review time: N/A → < 24h
- False positive rate: N/A → < 5%

**Why Now**: This feature is critical for the platform's success. It addresses key user needs and supports our business objectives.

**In Scope**:
- Content flagging
- Review queue
- Basic moderation tools

**Out of Scope**:
- Automated moderation
- AI-powered detection
- Advanced reporting

**Stories**:
- [ ] Report Content - Core Functionality
- [ ] Report Content - User Experience

**Dependencies**: None identified

**Risks**: False positives in content moderation, Moderation backlog and delays, Bias in moderation decisions, Critical path dependency - delays impact other features

**Owner**: [Name] | **Q**: [Quarter] | **Stakeholders**: [Names]`,
  },
];

async function updateEpicDescriptions() {
  console.log('Updating descriptions for top 5 epics...\n');

  for (let i = 0; i < top5Epics.length; i++) {
    const epic = top5Epics[i];
    try {
      await updateEpic(epic.id, {
        description: epic.description,
      });

      console.log(`✓ Updated: ${epic.name}`);
      
      // Add delay to avoid rate limiting
      if (i < top5Epics.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`✗ Failed to update ${epic.name}:`, error);
    }
  }

  console.log('\n✓ Done!');
}

// Run if called directly
if (require.main === module) {
  updateEpicDescriptions()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { updateEpicDescriptions, top5Epics };

