ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS surname VARCHAR(80),
  ADD COLUMN IF NOT EXISTS other_names VARCHAR(120),
  ADD COLUMN IF NOT EXISTS digital_address VARCHAR(120);

ALTER TABLE user_verifications
  ADD COLUMN IF NOT EXISTS ghana_card_front_url TEXT,
  ADD COLUMN IF NOT EXISTS ghana_card_back_url TEXT,
  ADD COLUMN IF NOT EXISTS years_farming INT,
  ADD COLUMN IF NOT EXISTS crops_produced TEXT,
  ADD COLUMN IF NOT EXISTS fda_registration_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS fda_document_url TEXT;