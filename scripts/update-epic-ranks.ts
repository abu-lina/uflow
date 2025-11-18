/**
 * Script to prioritize and update epic ranks in Notion
 * 
 * Prioritization logic:
 * 1. MoSCoW priority: Must have/Must (4) > Should have/Should (3) > Could have/Could (2) > Won't (v1) (1)
 * 2. Status priority: In progress (3) > Not started (2) > Done (1)
 * 3. Current Rank as tiebreaker (lower rank = higher priority)
 */

interface EpicData {
  id: string;
  name: string;
  currentRank: number | null;
  moscow: string | null;
  status: string | null;
}

// MoSCoW priority mapping
const MOSCOW_PRIORITY: Record<string, number> = {
  "Must have": 4,
  "Must": 4,
  "Should have": 3,
  "Should": 3,
  "Could have": 2,
  "Could": 2,
  "Won't (v1)": 1,
};

// Status priority mapping
const STATUS_PRIORITY: Record<string, number> = {
  "In progress": 3,
  "Not started": 2,
  "Done": 1,
};

function getMoscowPriority(moscow: string | null): number {
  if (!moscow) return 0;
  return MOSCOW_PRIORITY[moscow] || 0;
}

function getStatusPriority(status: string | null): number {
  if (!status) return 0;
  return STATUS_PRIORITY[status] || 0;
}

function prioritizeEpics(epics: EpicData[]): Array<EpicData & { newRank: number }> {
  // Sort epics by priority
  const sorted = [...epics].sort((a, b) => {
    // First, sort by MoSCoW priority (descending)
    const moscowDiff = getMoscowPriority(b.moscow) - getMoscowPriority(a.moscow);
    if (moscowDiff !== 0) return moscowDiff;

    // Then, sort by Status priority (descending)
    const statusDiff = getStatusPriority(b.status) - getStatusPriority(a.status);
    if (statusDiff !== 0) return statusDiff;

    // Finally, use current Rank as tiebreaker (lower rank = higher priority, but null ranks go last)
    if (a.currentRank === null && b.currentRank === null) return 0;
    if (a.currentRank === null) return 1;
    if (b.currentRank === null) return -1;
    return a.currentRank - b.currentRank;
  });

  // Assign new ranks (1 = highest priority)
  return sorted.map((epic, index) => ({
    ...epic,
    newRank: index + 1,
  }));
}

// Epic data collected from Notion
const epics: EpicData[] = [
  { id: "2ae6163f-450b-8150-a95d-d151aa0a0885", name: "Admin panel for reviewing and approving provider applications", currentRank: 1, moscow: "Must have", status: "Not started" },
  { id: "2ae6163f-450b-81ae-bf35-d8484c12dbf5", name: "Admin Panel for Provider Review", currentRank: 2, moscow: "Must have", status: "Not started" },
  { id: "2ae6163f-450b-8191-a21b-fdf5ccad3d5a", name: "Database Backup & Disaster Recovery", currentRank: 3, moscow: "Must have", status: "Not started" },
  { id: "2ae6163f-450b-8185-88ba-eebad164ce20", name: "Error tracking and monitoring system", currentRank: 4, moscow: "Must have", status: "Not started" },
  { id: "2366163f-450b-8010-842c-d31644e8e2e7", name: "Report Content", currentRank: 5, moscow: "Must", status: "Not started" },
  { id: "2ae6163f-450b-81e8-bc1b-f969d78d062e", name: "Security Hardening", currentRank: 6, moscow: "Must have", status: "Not started" },
  { id: "2366163f-450b-8012-9c89-cd524b49c6b3", name: "Approve/Reject Provider Applications", currentRank: 7, moscow: "Must", status: "In progress" },
  { id: "2ae6163f-450b-81b4-bc00-fa0882cc2290", name: "Error Monitoring & Logging", currentRank: 8, moscow: "Must have", status: "In progress" },
  { id: "2366163f-450b-80f1-a37f-da4da4b281ec", name: "Browse Offers by Category", currentRank: 9, moscow: "Must", status: "Done" },
  { id: "2ae6163f-450b-81be-8e0b-e28044b60f3d", name: "Email Verification System", currentRank: 10, moscow: "Must have", status: "Done" },
  { id: "2ae6163f-450b-819d-9296-e907f3cc7773", name: "Password Reset Flow", currentRank: 11, moscow: "Must have", status: "Done" },
  { id: "2ae6163f-450b-81e7-be24-ce7a81a07e38", name: "Provider Image Management", currentRank: 12, moscow: "Must have", status: "Done" },
  { id: "2ae6163f-450b-81f4-bd47-eab705a4f1d3", name: "SEO Optimization", currentRank: 14, moscow: "Must have", status: "Done" },
  { id: "2ae6163f-450b-8175-aec9-dc68e3f87212", name: "Session Management", currentRank: 15, moscow: "Must have", status: "Done" },
  { id: "2366163f-450b-80fe-9fea-cfa6e590267a", name: "User Registration & Authentication", currentRank: 16, moscow: "Must", status: "Done" },
  { id: "2ae6163f-450b-81b3-8484-d2ba8d8e99b3", name: "User Profile Management", currentRank: 17, moscow: "Must have", status: "Done" },
  { id: "2ae6163f-450b-813e-ae6c-c316e1f8c7c8", name: "Accessibility (a11y) improvements", currentRank: 18, moscow: "Should have", status: "Not started" },
  { id: "2ae6163f-450b-8118-988c-d834f5b4c142", name: "Analytics and user behavior tracking", currentRank: 19, moscow: "Should have", status: "Not started" },
  { id: "2ae6163f-450b-81a3-b48a-d5d142b00c42", name: "Analytics & User Behavior Tracking", currentRank: 20, moscow: "Should have", status: "Not started" },
  { id: "2ae6163f-450b-81e6-a5c1-d3744bb7d060", name: "Content moderation system", currentRank: 21, moscow: "Should have", status: "Not started" },
  { id: "2366163f-450b-80c2-86e1-da91ec74878c", name: "Muslim-Owned Verification Badge", currentRank: 22, moscow: "Should", status: "Not started" },
  { id: "2366163f-450b-8089-bc9c-cdb4e2e80632", name: "Post Gesuche (Requests)", currentRank: 23, moscow: "Should", status: "Not started" },
  { id: "2ae6163f-450b-8190-8477-e74286986aa3", name: "Performance Optimization", currentRank: 24, moscow: "Should have", status: "Not started" },
  { id: "2366163f-450b-80be-8851-c663b0b7a472", name: "Smart Matching Engine", currentRank: 25, moscow: "Should", status: "Not started" },
  { id: "2366163f-450b-80a8-8fff-e2fb5d33e805", name: "View Purchase Counts", currentRank: 26, moscow: "Should", status: "Not started" },
  { id: "2366163f-450b-808f-b3d8-ffe71ab37b01", name: "Zakat Calculator", currentRank: 27, moscow: "Should", status: "Not started" },
  { id: "2ae6163f-450b-8186-b15e-d90d8db56962", name: "Internationalization (i18n)", currentRank: 28, moscow: "Should have", status: "In progress" },
  { id: "2366163f-450b-80e9-955b-db435076ad2e", name: "Bookmark Offers & Providers", currentRank: 29, moscow: "Should", status: "Done" },
  { id: "2ae6163f-450b-81cf-b6a0-c9ccfb5634d1", name: "Health Check Endpoint", currentRank: 31, moscow: "Should have", status: "Done" },
  { id: "2ae6163f-450b-8151-9038-ffadb5dfab6d", name: "Provider Social Media Integration", currentRank: 32, moscow: "Should have", status: "Done" },
  { id: "2ae6163f-450b-812f-a5fc-f558a201f7fc", name: "PWA Support", currentRank: 33, moscow: "Should have", status: "Done" },
  { id: "2ae6163f-450b-8186-8d8d-d37d97fada44", name: "Quick Provider Import", currentRank: 34, moscow: "Should have", status: "Done" },
  { id: "2366163f-450b-80dc-849b-d7b0c3d1e27d", name: "Halal Badge for Products", currentRank: 35, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-804f-851e-ee866465890c", name: "In-App Messaging", currentRank: 36, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-80b9-bee4-f9bfe3e39ebc", name: "Multilingual Support", currentRank: 37, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-8008-bb4a-eb9ab1d7cf0c", name: "Paid Promotions", currentRank: 38, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-800e-a5f8-c8f8519441c1", name: "Seller Dashboard", currentRank: 39, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-80d1-9f77-e86331ac24d7", name: "Tag Suggestions & Filters", currentRank: 40, moscow: "Could", status: "Not started" },
  { id: "2366163f-450b-8074-ad0a-db5f7afe4d73", name: "Zakat Projects Marketplace", currentRank: 41, moscow: "Could", status: "Not started" },
  { id: "2ae6163f-450b-81c9-a07b-d50e92e71741", name: "API Documentation", currentRank: 42, moscow: "Could have", status: "Done" },
  { id: "2ae6163f-450b-81dd-be63-d5592fd53ae7", name: "Push Notifications", currentRank: 43, moscow: "Could have", status: "Done" },
  { id: "2366163f-450b-80c3-9fcb-f29a39fd889b", name: "Admin Panel (Roles & Moderation)", currentRank: 45, moscow: "Won't (v1)", status: "Not started" },
  { id: "2366163f-450b-80b5-92f7-f99b867c03f4", name: "Content & Events Section", currentRank: 46, moscow: "Won't (v1)", status: "Not started" },
  { id: "2366163f-450b-8015-a24b-eceb1a717ec1", name: "External Payment Integration", currentRank: 47, moscow: "Won't (v1)", status: "Not started" },
  { id: "2366163f-450b-809b-b662-f5a25ef24d88", name: "Reviews & Ratings", currentRank: 48, moscow: "Won't (v1)", status: "Not started" },
  { id: "2366163f-450b-8001-85d8-d2ab02ff803a", name: "Seller Identity Verification (Official)", currentRank: 49, moscow: "Won't (v1)", status: "Not started" },
];

// Prioritize epics
const prioritizedEpics = prioritizeEpics(epics);

// Display prioritized results
console.log("Prioritized Epics:");
prioritizedEpics.forEach((epic) => {
  console.log(`Rank ${epic.newRank}: ${epic.name} (MoSCoW: ${epic.moscow}, Status: ${epic.status}, Old Rank: ${epic.currentRank})`);
});

export { prioritizeEpics, epics };

