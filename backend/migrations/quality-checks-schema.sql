-- Add quality_checks table to Supabase
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quality_checks (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  crop_id INT NOT NULL,
  analyzed_by INT NOT NULL,
  quality_score DECIMAL(5,2) DEFAULT 0,
  defects JSONB NULL,
  color_analysis JSONB NULL,
  image_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending_review',
  decision VARCHAR(20),
  notes TEXT,
  quantity_accepted INT,
  quantity_rejected INT DEFAULT 0,
  rejection_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
  FOREIGN KEY (analyzed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_order
  ON quality_checks(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_checks_status
  ON quality_checks(status, created_at DESC);
