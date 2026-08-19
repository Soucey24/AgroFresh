-- Safe migration for the live Agrofresh database.
-- Run in Supabase SQL editor or local Postgres console.

ALTER TABLE IF EXISTS crops
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS planting_date DATE,
  ADD COLUMN IF NOT EXISTS harvest_date_predicted DATE,
  ADD COLUMN IF NOT EXISTS predicted_expiry DATE,
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(30) DEFAULT 'fresh',
  ADD COLUMN IF NOT EXISTS last_prediction_run TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by INT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT FALSE;

UPDATE crops
SET status = 'draft'
WHERE status IS NULL;

UPDATE crops
SET available = FALSE
WHERE available IS NULL;

UPDATE crops
SET unit = 'kg'
WHERE unit IS NULL;

UPDATE crops
SET freshness_status = 'fresh'
WHERE freshness_status IS NULL;
