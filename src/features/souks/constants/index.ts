// Service-related constants
export const SERVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  REJECTED: 'rejected'
} as const;

export const SERVICE_CATEGORIES = {
  EDUCATION: 'education',
  HEALTH: 'health',
  FINANCE: 'finance',
  LEGAL: 'legal',
  TECHNOLOGY: 'technology',
  OTHER: 'other'
} as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const SOUK_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  SUSPENDED: 'suspended'
} as const;

export const SOUK_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
} as const;

export const SOUK_SETTINGS = {
  pagination: {
    defaultSize: 9,
    maxSize: 100,
    initialPage: 1,
  },
  limits: {
    maxTitleLength: 100,
    maxDescriptionLength: 2000,
    maxImagesCount: 10,
    maxTagsCount: 5,
  },
  sorting: {
    options: ['newest', 'popular', 'price-asc', 'price-desc'] as const,
    default: 'newest' as const,
  },
} as const; 