ALTER TABLE user_verifications
  ADD COLUMN IF NOT EXISTS didit_request_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS didit_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS didit_result JSONB;