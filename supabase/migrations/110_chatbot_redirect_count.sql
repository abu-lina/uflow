-- Migration 110: Add redirect_count to conversations for Tier 2 guardrail escalation
-- Plan 176: Chatbot Feature — Fix G2 (UAT blocker)

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS redirect_count INTEGER NOT NULL DEFAULT 0;
