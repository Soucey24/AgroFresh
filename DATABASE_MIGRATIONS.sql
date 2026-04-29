-- AgroFresh AI/ML Database Schema Migrations
-- Execute these SQL commands in Supabase SQL Editor
-- Target: PostgreSQL (Supabase)

-- Phase 1: Create Lookup Tables
-- ============================================

CREATE TABLE IF NOT EXISTS crop_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50),
  description TEXT,
  avg_days_to_harvest INT,
  avg_freshness_days INT,
  typical_storage_temp_min INT DEFAULT 5,
  typical_storage_temp_max INT DEFAULT 25,
  optimal_humidity INT DEFAULT 85,
  emoji VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert common Ghana crops
INSERT INTO crop_types (name, category, avg_days_to_harvest, avg_freshness_days, description, emoji)
VALUES
  ('tomato', 'vegetables', 70, 10, 'Solanum lycopersicum', '🍅'),
  ('lettuce', 'vegetables', 50, 12, 'Lactuca sativa', '🥬'),
  ('carrot', 'vegetables', 75, 30, 'Daucus carota', '🥕'),
  ('onion', 'vegetables', 120, 60, 'Allium cepa', '🧅'),
  ('cabbage', 'vegetables', 80, 45, 'Brassica oleracea', '🥬'),
  ('yam', 'roots', 150, 180, 'Dioscorea spp.', '🍠'),
  ('cassava', 'roots', 300, 200, 'Manihot esculenta', '🥔'),
  ('maize', 'grains', 120, 30, 'Zea mays', '🌽'),
  ('okra', 'vegetables', 60, 3, 'Abelmoschus esculentus', '🌱'),
  ('pepper', 'vegetables', 90, 14, 'Capsicum annuum', '🌶️'),
  ('watermelon', 'fruits', 80, 14, 'Citrullus lanatus', '🍉'),
  ('pumpkin', 'vegetables', 100, 60, 'Cucurbita moschata', '🎃'),
  ('banana', 'fruits', 270, 7, 'Musa spp.', '🍌'),
  ('plantain', 'fruits', 270, 7, 'Musa x paradisiaca', '🍌'),
  ('mango', 'fruits', 100, 14, 'Mangifera indica', '🥭'),
  ('pineapple', 'fruits', 480, 14, 'Ananas comosus', '🍍'),
  ('avocado', 'fruits', 365, 5, 'Persea americana', '🥑'),
  ('cocoa', 'specialty', 365, 180, 'Theobroma cacao', '🍫'),
  ('groundnut', 'legumes', 120, 200, 'Arachis hypogaea', '🥜'),
  ('cowpea', 'legumes', 90, 365, 'Vigna unguiculata', '🫘')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX idx_crop_types_category ON crop_types(category);
CREATE INDEX idx_crop_types_name ON crop_types(name);

-- ============================================
-- Phase 2: Update Existing Crops Table
-- ============================================

-- Add ML-related columns to crops table
ALTER TABLE crops ADD COLUMN IF NOT EXISTS crop_type_id INT REFERENCES crop_types(id);
ALTER TABLE crops ADD COLUMN IF NOT EXISTS planting_date DATE;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS harvest_date_predicted DATE;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS quality_score FLOAT DEFAULT NULL;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS freshness_status VARCHAR(20) DEFAULT 'unknown';
ALTER TABLE crops ADD COLUMN IF NOT EXISTS storage_temperature INT DEFAULT NULL;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS storage_humidity INT DEFAULT NULL;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS predicted_expiry DATE DEFAULT NULL;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS last_prediction_run TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create indexes on new columns
CREATE INDEX idx_crops_crop_type_id ON crops(crop_type_id);
CREATE INDEX idx_crops_planting_date ON crops(planting_date);
CREATE INDEX idx_crops_quality_score ON crops(quality_score);
CREATE INDEX idx_crops_freshness_status ON crops(freshness_status);
CREATE INDEX idx_crops_predicted_expiry ON crops(predicted_expiry);

-- ============================================
-- Phase 3: Create AI Predictions Table
-- ============================================

CREATE TABLE IF NOT EXISTS ai_predictions (
  id SERIAL PRIMARY KEY,
  crop_id INT NOT NULL,
  prediction_type VARCHAR(50) NOT NULL,
  -- prediction_type values: 'harvest_timing', 'freshness', 'expiry', 'price', 'quality', 'market_demand'
  predicted_value FLOAT NOT NULL,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  reasoning TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  model_version VARCHAR(50),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
  CONSTRAINT valid_prediction_type CHECK (prediction_type IN ('harvest_timing', 'freshness', 'expiry', 'price', 'quality', 'market_demand'))
);

CREATE INDEX idx_ai_predictions_crop_id ON ai_predictions(crop_id);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_generated ON ai_predictions(generated_at);
CREATE INDEX idx_ai_predictions_valid_until ON ai_predictions(valid_until);

-- ============================================
-- Phase 4: Create Image Analysis Table
-- ============================================

CREATE TABLE IF NOT EXISTS image_analysis (
  id SERIAL PRIMARY KEY,
  crop_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  image_hash VARCHAR(64), -- SHA256 hash to avoid duplicates
  quality_score FLOAT NOT NULL DEFAULT 0,
  confidence_score FLOAT DEFAULT 0.5,
  detected_defects TEXT[] DEFAULT '{}',
  -- color analysis
  color_saturation FLOAT,
  color_brightness FLOAT,
  dominant_color VARCHAR(50),
  -- freshness indicators
  freshness_indicator FLOAT,
  ripeness_level VARCHAR(20), -- 'unripe', 'ripe', 'overripe'
  -- metadata
  analysis_model VARCHAR(50) DEFAULT 'yolov5s',
  processing_time_ms INT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

CREATE INDEX idx_image_analysis_crop_id ON image_analysis(crop_id);
CREATE INDEX idx_image_analysis_quality ON image_analysis(quality_score);
CREATE INDEX idx_image_analysis_hash ON image_analysis(image_hash);
CREATE INDEX idx_image_analysis_analyzed ON image_analysis(analyzed_at);

-- ============================================
-- Phase 5: Create Market Forecasts Table
-- ============================================

CREATE TABLE IF NOT EXISTS market_forecasts (
  id SERIAL PRIMARY KEY,
  crop_type_id INT NOT NULL,
  region VARCHAR(100) NOT NULL,
  -- demand signals
  demand_level VARCHAR(20) DEFAULT 'medium',
  -- demand_level: 'low', 'medium', 'high'
  demand_score FLOAT CHECK (demand_score >= 0 AND demand_score <= 100),
  -- pricing
  avg_market_price DECIMAL(10,2),
  min_market_price DECIMAL(10,2),
  max_market_price DECIMAL(10,2),
  recommended_price DECIMAL(10,2),
  price_trend VARCHAR(20) DEFAULT 'stable',
  -- price_trend: 'rising', 'stable', 'falling'
  price_change_percent FLOAT,
  -- forecast period
  forecast_period_start DATE NOT NULL,
  forecast_period_end DATE NOT NULL,
  -- metadata
  data_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_type_id) REFERENCES crop_types(id),
  CONSTRAINT valid_demand CHECK (demand_level IN ('low', 'medium', 'high')),
  CONSTRAINT valid_trend CHECK (price_trend IN ('rising', 'stable', 'falling'))
);

CREATE INDEX idx_market_forecasts_crop_type ON market_forecasts(crop_type_id);
CREATE INDEX idx_market_forecasts_region ON market_forecasts(region);
CREATE INDEX idx_market_forecasts_period START ON market_forecasts(forecast_period_start);
CREATE INDEX idx_market_forecasts_updated ON market_forecasts(updated_at);

-- ============================================
-- Phase 6: Create Prediction History Table
-- ============================================

CREATE TABLE IF NOT EXISTS prediction_history (
  id SERIAL PRIMARY KEY,
  crop_id INT NOT NULL,
  prediction_type VARCHAR(50) NOT NULL,
  predicted_value FLOAT,
  actual_value FLOAT DEFAULT NULL,
  accuracy_metric FLOAT DEFAULT NULL,
  -- 'MAE', 'RMSE', 'accuracy_percent', etc.
  prediction_date TIMESTAMP WITH TIME ZONE,
  realization_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  -- 'pending', 'realized', 'failed', 'inconclusive'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

CREATE INDEX idx_prediction_history_crop ON prediction_history(crop_id);
CREATE INDEX idx_prediction_history_type ON prediction_history(prediction_type);
CREATE INDEX idx_prediction_history_status ON prediction_history(status);
CREATE INDEX idx_prediction_history_date ON prediction_history(prediction_date);

-- ============================================
-- Phase 7: Create ML Metrics & Monitoring Table
-- ============================================

CREATE TABLE IF NOT EXISTS ml_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,
  -- 'harvest_accuracy', 'quality_accuracy', 'price_forecast_rmse', etc.
  metric_value FLOAT NOT NULL,
  model_version VARCHAR(50),
  evaluation_dataset VARCHAR(100),
  sample_size INT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_ml_metrics_type ON ml_metrics(metric_type);
CREATE INDEX idx_ml_metrics_date ON ml_metrics(evaluated_at);

-- ============================================
-- Phase 8: Create Views for Common Queries
-- ============================================

-- View: Recent predictions for a crop
CREATE OR REPLACE VIEW v_crop_latest_predictions AS
SELECT
  c.id as crop_id,
  c.name as crop_name,
  ct.name as crop_type,
  ap.prediction_type,
  ap.predicted_value,
  ap.confidence_score,
  ap.generated_at,
  ap.valid_until,
  ROW_NUMBER() OVER (PARTITION BY c.id, ap.prediction_type ORDER BY ap.generated_at DESC) as rank
FROM crops c
JOIN ai_predictions ap ON c.id = ap.crop_id
LEFT JOIN crop_types ct ON c.crop_type_id = ct.id;

-- View: Crops with predictions due for update
CREATE OR REPLACE VIEW v_crops_needing_predictions AS
SELECT
  c.id,
  c.name,
  c.farmer_id,
  ct.name as crop_type,
  c.last_prediction_run,
  CURRENT_TIMESTAMP - c.last_prediction_run as time_since_last_run
FROM crops c
LEFT JOIN crop_types ct ON c.crop_type_id = ct.id
WHERE c.last_prediction_run IS NULL 
   OR (CURRENT_TIMESTAMP - c.last_prediction_run) > INTERVAL '1 day'
   OR c.crop_type_id IS NULL;

-- View: Market insights by region
CREATE OR REPLACE VIEW v_market_insights AS
SELECT
  ct.name as crop_type,
  mf.region,
  mf.demand_level,
  mf.recommended_price,
  mf.price_trend,
  mf.price_change_percent,
  mf.forecast_period_start,
  mf.forecast_period_end,
  COUNT(DISTINCT c.id) as active_listings
FROM market_forecasts mf
JOIN crop_types ct ON mf.crop_type_id = ct.id
LEFT JOIN crops c ON c.crop_type_id = ct.id
  AND c.available = TRUE
  AND DATE(c.created_at) >= mf.forecast_period_start
GROUP BY ct.name, mf.region, mf.demand_level, mf.recommended_price, 
         mf.price_trend, mf.price_change_percent, mf.forecast_period_start, mf.forecast_period_end;

-- ============================================
-- Phase 9: Add Constraints & Triggers
-- ============================================

-- Update crops.predicted_expiry when new expiry prediction is added
CREATE OR REPLACE FUNCTION update_crop_predicted_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prediction_type = 'expiry' THEN
    UPDATE crops SET predicted_expiry = to_date(NEW.predicted_value::text, 'YYYY-MM-DD')
    WHERE id = NEW.crop_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_crop_expiry
AFTER INSERT ON ai_predictions
FOR EACH ROW
EXECUTE FUNCTION update_crop_predicted_expiry();

-- ============================================
-- Phase 10: Permissions (If Using RLS)
-- ============================================

-- Enable Row Level Security (RLS) for predictions
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_forecasts ENABLE ROW LEVEL SECURITY;

-- Policy: Farmers can only see their own crops' predictions
CREATE POLICY crops_predictions_farmer_policy ON ai_predictions
  USING (crop_id IN (
    SELECT id FROM crops WHERE farmer_id = auth.uid()
  ));

-- Policy: Public can see market forecasts
CREATE POLICY market_forecasts_public_policy ON market_forecasts
  FOR SELECT USING (TRUE);

-- ============================================
-- Rollback / Cleanup (If Needed)
-- ============================================
/*
-- To rollback, uncomment and run:

DROP TRIGGER IF EXISTS trg_update_crop_expiry ON ai_predictions;
DROP FUNCTION IF EXISTS update_crop_predicted_expiry();

DROP VIEW IF EXISTS v_market_insights;
DROP VIEW IF EXISTS v_crops_needing_predictions;
DROP VIEW IF EXISTS v_crop_latest_predictions;

DROP TABLE IF EXISTS ml_metrics;
DROP TABLE IF EXISTS prediction_history;
DROP TABLE IF EXISTS market_forecasts;
DROP TABLE IF EXISTS image_analysis;
DROP TABLE IF EXISTS ai_predictions;

ALTER TABLE crops DROP COLUMN IF EXISTS crop_type_id;
ALTER TABLE crops DROP COLUMN IF EXISTS planting_date;
ALTER TABLE crops DROP COLUMN IF EXISTS harvest_date_predicted;
ALTER TABLE crops DROP COLUMN IF EXISTS quality_score;
ALTER TABLE crops DROP COLUMN IF EXISTS freshness_status;
ALTER TABLE crops DROP COLUMN IF EXISTS storage_temperature;
ALTER TABLE crops DROP COLUMN IF EXISTS storage_humidity;
ALTER TABLE crops DROP COLUMN IF EXISTS predicted_expiry;
ALTER TABLE crops DROP COLUMN IF EXISTS last_prediction_run;

DROP TABLE IF EXISTS crop_types;
*/

-- ============================================
-- Verification Queries
-- ============================================

-- Check tables created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE '%prediction%' OR table_name LIKE '%forecast%' OR table_name LIKE '%image%';

-- Check crop_types populated
-- SELECT COUNT(*) as total_crops FROM crop_types;

-- Initial setup complete!
COMMIT;
