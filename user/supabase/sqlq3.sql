-- Migration: Add AI pipeline v2.1 columns (Pipelines 1, 3, Trust Score)
-- Run in Supabase SQL Editor after sqlq1.sql and sqlq2.sql

ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS ai_verdict text;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS fake_prob float;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS confidence_level text;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS faces_detected integer;

ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS estimated_resolution_days integer;

ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS trust_score float;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS civic_urgency_score float;

ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS scene_detected boolean;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS detected_issues jsonb;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS temporal_consistency float;
ALTER TABLE citizen_reports ADD COLUMN IF NOT EXISTS dominant_class text;
