/**
 * Memory Store Tests
 *
 * TDD: These tests are written BEFORE implementation.
 * Run these tests: they should FAIL initially.
 *
 * @see Plan 032 — M1, M2, M3
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Import the module we're about to create (will fail until implemented)
import { MemoryStore } from '../src/store.js';
import type {
  StoreMemoryInput,
  MemoryEntry,
  RetrieveMemoryInput,
} from '../src/types.js';
import { STORAGE_DIR, DB_FILENAME, VALIDATION } from '../src/types.js';

describe('MemoryStore', () => {
  let tempDir: string;
  let store: MemoryStore;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'uflow-memory-test-'));
    store = new MemoryStore({ workspacePath: tempDir });
  });

  afterEach(async () => {
    // Close store and clean up temp directory
    await store.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('initialization', () => {
    it('creates storage directory if it does not exist', async () => {
      await store.initialize();
      const { existsSync } = await import('node:fs');
      expect(existsSync(join(tempDir, STORAGE_DIR))).toBe(true);
    });

    it('creates SQLite database file', async () => {
      await store.initialize();
      const { existsSync } = await import('node:fs');
      expect(existsSync(join(tempDir, STORAGE_DIR, DB_FILENAME))).toBe(true);
    });

    it('enables WAL mode for multi-window safety', async () => {
      await store.initialize();
      // WAL mode creates a -wal file alongside the db
      // We verify by checking the journal mode
      const mode = store.getJournalMode();
      expect(mode).toBe('wal');
    });
  });

  describe('store()', () => {
    beforeEach(async () => {
      await store.initialize();
    });

    it('stores a memory entry with required fields', async () => {
      const input: StoreMemoryInput = {
        topic: 'Test memory entry',
        context:
          'This is a test context with enough characters to pass validation. ' +
          'It describes the goal, findings, and reasoning behind the work.',
      };

      const result = await store.store(input);

      expect(result.success).toBe(true);
      expect(result.memory).toBeDefined();
      expect(result.memory!.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
      expect(result.memory!.topic).toBe(input.topic);
      expect(result.memory!.context).toBe(input.context);
      expect(result.memory!.created_at).toBeDefined();
      expect(result.memory!.updated_at).toBeDefined();
      expect(result.memory!.content_hash).toBeDefined();
    });

    it('stores a memory entry with all optional fields', async () => {
      const input: StoreMemoryInput = {
        topic: 'Full memory entry',
        context:
          'This context describes a complete memory with all optional fields populated.',
        decisions: ['Decision 1', 'Decision 2'],
        rationale: ['Rationale 1', 'Rationale 2'],
        metadata: {
          plan_id: 'plan-032',
          status: 'Active',
        },
      };

      const result = await store.store(input);

      expect(result.success).toBe(true);
      expect(result.memory!.decisions).toEqual(input.decisions);
      expect(result.memory!.rationale).toEqual(input.rationale);
      expect(result.memory!.metadata?.plan_id).toBe('plan-032');
      expect(result.memory!.metadata?.status).toBe('Active');
    });

    it('defaults status to Active when not provided', async () => {
      const input: StoreMemoryInput = {
        topic: 'Memory without status',
        context: 'This memory has no explicit status set in metadata.',
      };

      const result = await store.store(input);

      expect(result.success).toBe(true);
      expect(result.memory!.metadata?.status).toBe('Active');
    });

    it('rejects topic that is too short', async () => {
      const input: StoreMemoryInput = {
        topic: 'AB', // Less than MIN_TOPIC_LENGTH
        context: 'Valid context content with sufficient length for storage.',
      };

      const result = await store.store(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('topic');
    });

    it('rejects context that is too short', async () => {
      const input: StoreMemoryInput = {
        topic: 'Valid topic',
        context: 'Short', // Less than MIN_CONTEXT_LENGTH
      };

      const result = await store.store(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('context');
    });

    it('rejects more than MAX_DECISIONS', async () => {
      const input: StoreMemoryInput = {
        topic: 'Too many decisions',
        context: 'Valid context content with sufficient length for storage.',
        decisions: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'], // More than MAX_DECISIONS
      };

      const result = await store.store(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('decisions');
    });

    it('generates consistent content_hash for same content', async () => {
      const input: StoreMemoryInput = {
        topic: 'Hash test memory',
        context: 'This content should produce the same hash every time.',
        decisions: ['Decision A'],
      };

      const result1 = await store.store(input);
      const result2 = await store.store(input);

      expect(result1.memory!.content_hash).toBe(result2.memory!.content_hash);
    });

    it('generates different content_hash for different content', async () => {
      const input1: StoreMemoryInput = {
        topic: 'Memory A',
        context: 'First memory content for hash comparison.',
      };
      const input2: StoreMemoryInput = {
        topic: 'Memory B',
        context: 'Different memory content for hash comparison.',
      };

      const result1 = await store.store(input1);
      const result2 = await store.store(input2);

      expect(result1.memory!.content_hash).not.toBe(result2.memory!.content_hash);
    });

    it('stores entries that are human-inspectable via JSON', async () => {
      const input: StoreMemoryInput = {
        topic: 'Inspectable entry',
        context: 'This entry should be readable when exported as JSON.',
      };

      const result = await store.store(input);
      const json = JSON.stringify(result.memory, null, 2);

      // Should be valid JSON that a human can read
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).toContain('Inspectable entry');
    });
  });

  describe('retrieve()', () => {
    beforeEach(async () => {
      await store.initialize();
      // Seed some test data
      await store.store({
        topic: 'Redis caching implementation',
        context:
          'Implemented Redis caching for the user session data. Used TTL of 3600 seconds.',
        decisions: ['Use Redis over Memcached'],
        metadata: { status: 'Active' },
      });
      await store.store({
        topic: 'Authentication refactor',
        context:
          'Refactored authentication to use JWT tokens instead of session cookies.',
        decisions: ['JWT over sessions', 'RS256 algorithm'],
        metadata: { status: 'DecisionRecord' },
      });
      await store.store({
        topic: 'Old caching approach',
        context: 'Previously used in-memory caching which was replaced by Redis.',
        metadata: { status: 'Superseded' },
      });
    });

    it('retrieves memories matching query keywords', async () => {
      const input: RetrieveMemoryInput = {
        query: 'Redis caching',
        maxResults: 5,
      };

      const result = await store.retrieve(input);

      expect(result.count).toBeGreaterThan(0);
      expect(result.memories.some((m) => m.topic.includes('Redis'))).toBe(true);
    });

    it('returns empty array when no matches found', async () => {
      const input: RetrieveMemoryInput = {
        query: 'nonexistent topic that should not match anything',
      };

      const result = await store.retrieve(input);

      expect(result.count).toBe(0);
      expect(result.memories).toEqual([]);
    });

    it('respects maxResults limit', async () => {
      const input: RetrieveMemoryInput = {
        query: 'caching implementation authentication',
        maxResults: 2,
      };

      const result = await store.retrieve(input);

      expect(result.memories.length).toBeLessThanOrEqual(2);
    });

    it('defaults to DEFAULT_MAX_RESULTS when maxResults not specified', async () => {
      const input: RetrieveMemoryInput = {
        query: 'caching',
      };

      const result = await store.retrieve(input);

      expect(result.memories.length).toBeLessThanOrEqual(
        VALIDATION.DEFAULT_MAX_RESULTS
      );
    });

    it('clamps maxResults to MAX_RESULTS', async () => {
      const input: RetrieveMemoryInput = {
        query: 'caching',
        maxResults: 100, // Exceeds MAX_RESULTS
      };

      const result = await store.retrieve(input);

      expect(result.memories.length).toBeLessThanOrEqual(VALIDATION.MAX_RESULTS);
    });

    it('ranks DecisionRecord higher than Active', async () => {
      // Both should match "authentication" or similar
      const input: RetrieveMemoryInput = {
        query: 'authentication JWT decisions',
        maxResults: 10,
      };

      const result = await store.retrieve(input);
      const decisionRecord = result.memories.find(
        (m) => m.metadata?.status === 'DecisionRecord'
      );
      const activeMemory = result.memories.find(
        (m) =>
          m.metadata?.status === 'Active' && m.topic !== decisionRecord?.topic
      );

      if (decisionRecord && activeMemory) {
        const drIndex = result.memories.indexOf(decisionRecord);
        const activeIndex = result.memories.indexOf(activeMemory);
        // DecisionRecord should appear before Active (lower index = higher rank)
        expect(drIndex).toBeLessThan(activeIndex);
      }
    });

    it('ranks Superseded lower than Active', async () => {
      const input: RetrieveMemoryInput = {
        query: 'caching',
        maxResults: 10,
      };

      const result = await store.retrieve(input);
      const superseded = result.memories.find(
        (m) => m.metadata?.status === 'Superseded'
      );
      const active = result.memories.find(
        (m) => m.metadata?.status === 'Active'
      );

      if (superseded && active) {
        const supersededIndex = result.memories.indexOf(superseded);
        const activeIndex = result.memories.indexOf(active);
        // Active should appear before Superseded
        expect(activeIndex).toBeLessThan(supersededIndex);
      }
    });

    it('applies recency decay to ranking', async () => {
      // Store an old memory (we'll simulate by checking the ranking behavior)
      // For now, just verify newer memories rank higher when keywords match equally
      const newerMemory = await store.store({
        topic: 'Recent caching update',
        context: 'Just updated the caching configuration for better performance.',
        metadata: { status: 'Active' },
      });

      const input: RetrieveMemoryInput = {
        query: 'caching',
        maxResults: 10,
      };

      const result = await store.retrieve(input);

      // The most recent memory with "caching" should be ranked higher
      if (result.memories.length > 1) {
        const recentEntry = result.memories.find(
          (m) => m.id === newerMemory.memory?.id
        );
        if (recentEntry) {
          const recentIndex = result.memories.indexOf(recentEntry);
          // Recent entry should be in top positions
          expect(recentIndex).toBeLessThan(result.memories.length / 2 + 1);
        }
      }
    });

    it('includes duration_ms in result', async () => {
      const input: RetrieveMemoryInput = {
        query: 'caching',
      };

      const result = await store.retrieve(input);

      expect(result.duration_ms).toBeDefined();
      expect(typeof result.duration_ms).toBe('number');
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('multi-window safety', () => {
    it('allows concurrent reads from multiple store instances', async () => {
      await store.initialize();

      // Store a memory
      await store.store({
        topic: 'Shared memory',
        context: 'This memory should be readable from multiple instances.',
      });

      // Create a second store instance (simulating another VS Code window)
      const store2 = new MemoryStore({ workspacePath: tempDir });
      await store2.initialize();

      // Both should be able to read
      const result1 = await store.retrieve({ query: 'Shared memory' });
      const result2 = await store2.retrieve({ query: 'Shared memory' });

      expect(result1.count).toBeGreaterThan(0);
      expect(result2.count).toBeGreaterThan(0);
      expect(result1.memories[0].id).toBe(result2.memories[0].id);

      await store2.close();
    });

    it('allows concurrent writes from multiple store instances', async () => {
      await store.initialize();

      const store2 = new MemoryStore({ workspacePath: tempDir });
      await store2.initialize();

      // Both instances write concurrently
      const [result1, result2] = await Promise.all([
        store.store({
          topic: 'Memory from instance 1',
          context: 'Written by the first store instance concurrently.',
        }),
        store2.store({
          topic: 'Memory from instance 2',
          context: 'Written by the second store instance concurrently.',
        }),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Verify both memories exist
      const allMemories = await store.retrieve({
        query: 'Memory from instance',
        maxResults: 10,
      });
      expect(allMemories.count).toBe(2);

      await store2.close();
    });

    it('handles read-write interleaving without corruption', async () => {
      await store.initialize();

      const store2 = new MemoryStore({ workspacePath: tempDir });
      await store2.initialize();

      // Interleave reads and writes
      const operations = [
        store.store({
          topic: 'Write 1',
          context: 'First write operation from store 1.',
        }),
        store2.retrieve({ query: 'anything' }),
        store2.store({
          topic: 'Write 2',
          context: 'Second write operation from store 2.',
        }),
        store.retrieve({ query: 'anything' }),
        store.store({
          topic: 'Write 3',
          context: 'Third write operation from store 1.',
        }),
      ];

      const results = await Promise.all(operations);

      // All operations should complete without errors
      expect(results[0].success).toBe(true); // store result
      expect(results[2].success).toBe(true); // store result
      expect(results[4].success).toBe(true); // store result

      await store2.close();
    });

    it('does not use single-owner daemon lock', async () => {
      await store.initialize();

      // Verify there's no lock file blocking other instances
      const { existsSync } = await import('node:fs');
      const lockFile = join(tempDir, STORAGE_DIR, 'daemon.lock');
      const ownerFile = join(tempDir, STORAGE_DIR, 'owner.json');

      expect(existsSync(lockFile)).toBe(false);
      expect(existsSync(ownerFile)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('returns error result instead of throwing for invalid input', async () => {
      await store.initialize();

      const input: StoreMemoryInput = {
        topic: '', // Invalid: empty topic
        context: '', // Invalid: empty context
      };

      // Should not throw, should return error result
      const result = await store.store(input);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles database connection gracefully when workspace is invalid', async () => {
      const invalidStore = new MemoryStore({
        workspacePath: '/nonexistent/path/that/does/not/exist',
      });

      // Should handle gracefully, not throw unhandled exception
      await expect(invalidStore.initialize()).rejects.toThrow();
    });
  });
});
