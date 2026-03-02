# Changelog

All notable changes to UFlow Memory will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-02

### Added

- Initial release of UFlow Memory extension
- SQLite-based local storage with WAL mode for multi-window safety
- Two language model tools:
  - `flowbaby_storeMemory` — Store structured summaries
  - `flowbaby_retrieveMemory` — Retrieve memories with keyword search
- Recency-based ranking with 7-day half-life decay
- Status-based ranking multipliers (DecisionRecord > Active > Superseded)
- Input validation (topic length, context length, decisions count)
- Content hashing for future embedding support
- Show Status command for debugging

### Technical Details

- Storage location: `.uflow-memory/memories.db` in workspace root
- SQLite WAL mode ensures safe concurrent access across VS Code windows
- No daemon process or single-owner lock
- Compatible with existing Flowbaby tool contract (same tool names)

## [Unreleased]

### Planned (v1.1)

- Local semantic embeddings for improved retrieval quality
- Optional migration from Flowbaby storage
