/**
 * Memory Store Implementation
 *
 * Local-first agent memory backend using SQLite with WAL mode
 * for multi-window safe concurrent access.
 *
 * @see Plan 032 — DIY Agent Memory System
 */
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type {
  MemoryStoreConfig,
  StoreMemoryInput,
  StoreMemoryResult,
  RetrieveMemoryInput,
  RetrieveMemoryResult,
  MemoryEntry,
  RankingConfig,
} from './types';

import {
  STORAGE_DIR,
  DB_FILENAME,
  VALIDATION,
  DEFAULT_RANKING_CONFIG,
} from './types';

/**
 * SQLite-based memory store with WAL mode for multi-window safety.
 */
export class MemoryStore {
  private db: Database.Database | null = null;
  private readonly config: MemoryStoreConfig;
  private readonly rankingConfig: RankingConfig;
  private readonly dbPath: string;
  private readonly storageDir: string;

  constructor(
    config: MemoryStoreConfig,
    rankingConfig: RankingConfig = DEFAULT_RANKING_CONFIG
  ) {
    this.config = config;
    this.rankingConfig = rankingConfig;
    this.storageDir = join(config.workspacePath, STORAGE_DIR);
    this.dbPath = join(this.storageDir, DB_FILENAME);
  }

  /**
   * Initialize the memory store: create directory, database, and tables.
   */
  async initialize(): Promise<void> {
    // Create storage directory if it doesn't exist
    if (!existsSync(this.storageDir)) {
      await mkdir(this.storageDir, { recursive: true });
    }

    // Open SQLite database with WAL mode for multi-window safety
    this.db = new Database(this.dbPath);

    // Enable WAL mode (Write-Ahead Logging) for concurrent access
    this.db.pragma('journal_mode = WAL');

    // Create tables if they don't exist
    this.createTables();

    if (this.config.debug) {
      console.log(`[MemoryStore] Initialized at ${this.dbPath}`);
    }
  }

  /**
   * Create database tables.
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        context TEXT NOT NULL,
        decisions TEXT,
        rationale TEXT,
        plan_id TEXT,
        status TEXT DEFAULT 'Active',
        content_hash TEXT NOT NULL,
        embedding_version INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_plan_id ON memories(plan_id);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(content_hash);
    `);
  }

  /**
   * Get the current journal mode (for testing WAL is enabled).
   */
  getJournalMode(): string {
    if (!this.db) throw new Error('Database not initialized');
    const result = this.db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    return result[0]?.journal_mode ?? 'unknown';
  }

  /**
   * Store a memory entry.
   */
  async store(input: StoreMemoryInput): Promise<StoreMemoryResult> {
    const startTime = performance.now();

    try {
      // Validate input
      const validationError = this.validateStoreInput(input);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          duration_ms: performance.now() - startTime,
        };
      }

      if (!this.db) {
        return {
          success: false,
          error: 'Database not initialized',
          duration_ms: performance.now() - startTime,
        };
      }

      const now = new Date().toISOString();
      const id = randomUUID();
      const contentHash = this.computeContentHash(input);
      const status = input.metadata?.status ?? 'Active';

      const memory: MemoryEntry = {
        id,
        topic: input.topic,
        context: input.context,
        decisions: input.decisions,
        rationale: input.rationale,
        metadata: {
          plan_id: input.metadata?.plan_id,
          status,
        },
        created_at: now,
        updated_at: now,
        content_hash: contentHash,
        embedding_version: null,
      };

      // Insert into database
      const stmt = this.db.prepare(`
        INSERT INTO memories (
          id, topic, context, decisions, rationale, plan_id, status,
          content_hash, embedding_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        memory.id,
        memory.topic,
        memory.context,
        memory.decisions ? JSON.stringify(memory.decisions) : null,
        memory.rationale ? JSON.stringify(memory.rationale) : null,
        memory.metadata?.plan_id ?? null,
        status,
        memory.content_hash,
        memory.embedding_version,
        memory.created_at,
        memory.updated_at
      );

      if (this.config.debug) {
        console.log(`[MemoryStore] Stored memory ${id}: ${input.topic}`);
      }

      return {
        success: true,
        memory,
        duration_ms: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: performance.now() - startTime,
      };
    }
  }

  /**
   * Retrieve memories matching a query.
   */
  async retrieve(input: RetrieveMemoryInput): Promise<RetrieveMemoryResult> {
    const startTime = performance.now();

    try {
      if (!this.db) {
        return {
          memories: [],
          count: 0,
          duration_ms: performance.now() - startTime,
        };
      }

      const maxResults = Math.min(
        Math.max(input.maxResults ?? VALIDATION.DEFAULT_MAX_RESULTS, 1),
        VALIDATION.MAX_RESULTS
      );

      // Tokenize query into keywords (simple keyword search for v1)
      const keywords = this.tokenizeQuery(input.query);

      // Get all memories that might match
      const stmt = this.db.prepare(`
        SELECT
          id, topic, context, decisions, rationale, plan_id, status,
          content_hash, embedding_version, created_at, updated_at
        FROM memories
        ORDER BY created_at DESC
      `);

      const rows = stmt.all() as Array<{
        id: string;
        topic: string;
        context: string;
        decisions: string | null;
        rationale: string | null;
        plan_id: string | null;
        status: string;
        content_hash: string;
        embedding_version: number | null;
        created_at: string;
        updated_at: string;
      }>;

      // Convert rows to MemoryEntry objects and compute rankings
      const scoredMemories: Array<{ memory: MemoryEntry; score: number }> = [];

      for (const row of rows) {
        const memory = this.rowToMemory(row);
        const score = this.computeScore(memory, keywords);

        if (score > 0) {
          scoredMemories.push({ memory, score });
        }
      }

      // Sort by score descending
      scoredMemories.sort((a, b) => b.score - a.score);

      // Take top results
      const topMemories = scoredMemories.slice(0, maxResults).map((s) => s.memory);

      if (this.config.debug) {
        console.log(
          `[MemoryStore] Retrieved ${topMemories.length} memories for query: ${input.query}`
        );
      }

      return {
        memories: topMemories,
        count: topMemories.length,
        duration_ms: performance.now() - startTime,
      };
    } catch (error) {
      if (this.config.debug) {
        console.error(`[MemoryStore] Retrieve error:`, error);
      }
      return {
        memories: [],
        count: 0,
        duration_ms: performance.now() - startTime,
      };
    }
  }

  /**
   * Close the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Validate store input.
   */
  private validateStoreInput(input: StoreMemoryInput): string | null {
    if (!input.topic || input.topic.length < VALIDATION.MIN_TOPIC_LENGTH) {
      return `topic must be at least ${VALIDATION.MIN_TOPIC_LENGTH} characters`;
    }

    if (input.topic.length > VALIDATION.MAX_TOPIC_LENGTH) {
      return `topic must be at most ${VALIDATION.MAX_TOPIC_LENGTH} characters`;
    }

    if (!input.context || input.context.length < VALIDATION.MIN_CONTEXT_LENGTH) {
      return `context must be at least ${VALIDATION.MIN_CONTEXT_LENGTH} characters`;
    }

    if (input.decisions && input.decisions.length > VALIDATION.MAX_DECISIONS) {
      return `decisions must have at most ${VALIDATION.MAX_DECISIONS} items`;
    }

    if (input.rationale && input.rationale.length > VALIDATION.MAX_RATIONALE) {
      return `rationale must have at most ${VALIDATION.MAX_RATIONALE} items`;
    }

    return null;
  }

  /**
   * Compute SHA-256 hash of content for change detection.
   */
  private computeContentHash(input: StoreMemoryInput): string {
    const content = JSON.stringify({
      topic: input.topic,
      context: input.context,
      decisions: input.decisions ?? [],
      rationale: input.rationale ?? [],
    });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Tokenize query into lowercase keywords.
   */
  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= 2)
      .map((word) => word.replace(/[^a-z0-9]/g, ''));
  }

  /**
   * Convert a database row to a MemoryEntry.
   */
  private rowToMemory(row: {
    id: string;
    topic: string;
    context: string;
    decisions: string | null;
    rationale: string | null;
    plan_id: string | null;
    status: string;
    content_hash: string;
    embedding_version: number | null;
    created_at: string;
    updated_at: string;
  }): MemoryEntry {
    return {
      id: row.id,
      topic: row.topic,
      context: row.context,
      decisions: row.decisions ? JSON.parse(row.decisions) : undefined,
      rationale: row.rationale ? JSON.parse(row.rationale) : undefined,
      metadata: {
        plan_id: row.plan_id ?? undefined,
        status: row.status as 'Active' | 'Superseded' | 'DecisionRecord',
      },
      content_hash: row.content_hash,
      embedding_version: row.embedding_version,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Compute relevance score for a memory.
   * Score = keyword_match_score × recency_multiplier × status_multiplier
   */
  private computeScore(memory: MemoryEntry, keywords: string[]): number {
    // Keyword matching score (v1 simple approach)
    const searchText = [
      memory.topic,
      memory.context,
      ...(memory.decisions ?? []),
      ...(memory.rationale ?? []),
    ]
      .join(' ')
      .toLowerCase();

    let keywordScore = 0;
    for (const keyword of keywords) {
      if (searchText.includes(keyword)) {
        keywordScore += 1;
      }
    }

    if (keywordScore === 0) {
      return 0;
    }

    // Normalize keyword score
    const normalizedKeywordScore = keywordScore / Math.max(keywords.length, 1);

    // Recency decay: score × 2^(-age/halfLife)
    const ageMs = Date.now() - new Date(memory.created_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyMultiplier = Math.pow(
      2,
      -ageDays / this.rankingConfig.recencyHalfLifeDays
    );

    // Status multiplier
    const status = memory.metadata?.status ?? 'Active';
    const statusMultiplier =
      this.rankingConfig.statusMultipliers[status] ??
      this.rankingConfig.statusMultipliers.Active;

    return normalizedKeywordScore * recencyMultiplier * statusMultiplier;
  }
}
