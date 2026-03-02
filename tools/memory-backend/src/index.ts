/**
 * Memory Backend - Local-first agent memory system
 *
 * @module @uflow/memory-backend
 * @see Plan 032 — DIY Agent Memory System
 */

export { MemoryStore } from './store.js';
export type {
  MemoryStatus,
  MemoryMetadata,
  StoreMemoryInput,
  MemoryEntry,
  RetrieveMemoryInput,
  RetrieveMemoryResult,
  StoreMemoryResult,
  MemoryStoreConfig,
  RankingConfig,
} from './types.js';
export {
  DEFAULT_RANKING_CONFIG,
  STORAGE_DIR,
  DB_FILENAME,
  VALIDATION,
} from './types.js';
