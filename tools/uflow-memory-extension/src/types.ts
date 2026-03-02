/**
 * Memory Backend Types
 *
 * These types define the data model for the DIY agent memory system.
 * They are designed to be compatible with the existing Flowbaby tool contract
 * (flowbaby_storeMemory / flowbaby_retrieveMemory) to avoid agent retraining.
 *
 * Storage: SQLite with WAL mode for multi-window safety.
 * Location: {workspace}/.uflow-memory/memories.db
 *
 * @see Plan 032 — DIY Agent Memory System
 */

/**
 * Memory entry status values.
 * - Active: Current approach or decision
 * - Superseded: Replaced by a newer entry
 * - DecisionRecord: Stable, long-lived decision
 */
export type MemoryStatus = 'Active' | 'Superseded' | 'DecisionRecord';

/**
 * Metadata attached to a memory entry.
 */
export interface MemoryMetadata {
  /** Optional identifier to group related memories (e.g., "plan-032") */
  plan_id?: string;
  /** Status of this memory entry (default: "Active") */
  status?: MemoryStatus;
}

/**
 * Input for storing a memory entry.
 * Matches the Flowbaby flowbaby_storeMemory input schema.
 */
export interface StoreMemoryInput {
  /** Short 3–7 word title identifying the work or decision */
  topic: string;
  /** Rich 300–1500 character summary describing the goal, findings, reasoning */
  context: string;
  /** Optional list (0–5 items) of durable decisions made */
  decisions?: string[];
  /** Optional list (0–5 items) explaining why decisions were made */
  rationale?: string[];
  /** Optional metadata about this memory entry */
  metadata?: MemoryMetadata;
}

/**
 * A stored memory entry with system-generated fields.
 */
export interface MemoryEntry extends StoreMemoryInput {
  /** Unique identifier (UUID v4) */
  id: string;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** SHA-256 hash of content for change detection (supports future embeddings) */
  content_hash: string;
  /** Embedding version, null until embeddings are added (v1.1 deferred) */
  embedding_version: number | null;
}

/**
 * Input for retrieving memories.
 * Matches the Flowbaby flowbaby_retrieveMemory input schema.
 */
export interface RetrieveMemoryInput {
  /** Natural-language description of what to recall */
  query: string;
  /** Maximum number of results (default: 3, max: 10) */
  maxResults?: number;
}

/**
 * Result of a memory retrieval operation.
 */
export interface RetrieveMemoryResult {
  /** Retrieved memories, ranked by relevance */
  memories: MemoryEntry[];
  /** Number of memories returned */
  count: number;
  /** Query duration in milliseconds */
  duration_ms: number;
}

/**
 * Result of a store operation.
 */
export interface StoreMemoryResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The stored memory entry (if successful) */
  memory?: MemoryEntry;
  /** Error message (if failed) */
  error?: string;
  /** Operation duration in milliseconds */
  duration_ms: number;
}

/**
 * Configuration for the memory store.
 */
export interface MemoryStoreConfig {
  /** Path to the workspace root directory */
  workspacePath: string;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Ranking configuration for retrieval.
 * Ported from Flowbaby's proven ranking behavior.
 */
export interface RankingConfig {
  /** Half-life for recency decay in days (default: 7) */
  recencyHalfLifeDays: number;
  /** Status multipliers for ranking */
  statusMultipliers: {
    Active: number;
    Superseded: number;
    DecisionRecord: number;
  };
}

/**
 * Default ranking configuration (ported from Flowbaby).
 */
export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  recencyHalfLifeDays: 7,
  statusMultipliers: {
    Active: 1.0,
    Superseded: 0.4,
    DecisionRecord: 1.1,
  },
};

/**
 * Storage directory name (relative to workspace root).
 */
export const STORAGE_DIR = '.uflow-memory';

/**
 * SQLite database filename.
 */
export const DB_FILENAME = 'memories.db';

/**
 * Validation constraints.
 */
export const VALIDATION = {
  /** Minimum context length */
  MIN_CONTEXT_LENGTH: 10,
  /** Maximum context length (soft limit, warn if exceeded) */
  MAX_CONTEXT_LENGTH: 1500,
  /** Maximum number of decisions */
  MAX_DECISIONS: 5,
  /** Maximum number of rationale items */
  MAX_RATIONALE: 5,
  /** Topic minimum length */
  MIN_TOPIC_LENGTH: 3,
  /** Topic maximum length */
  MAX_TOPIC_LENGTH: 100,
  /** Maximum results for retrieval */
  MAX_RESULTS: 10,
  /** Default results for retrieval */
  DEFAULT_MAX_RESULTS: 3,
};
