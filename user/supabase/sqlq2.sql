-- Migration script to add Civic Department Routing columns (Pipeline 2)
-- Run this script in the Supabase SQL Editor to update your existing citizen_reports table.

ALTER TABLE citizen_reports 
ADD COLUMN IF NOT EXISTS routed_department text;

ALTER TABLE citizen_reports 
ADD COLUMN IF NOT EXISTS routing_priority text;

ALTER TABLE citizen_reports 
ADD COLUMN IF NOT EXISTS routing_reason text;

ALTER TABLE citizen_reports 
ADD COLUMN IF NOT EXISTS escalation_required boolean DEFAULT false;
