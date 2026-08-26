-- Associations
CREATE TABLE IF NOT EXISTS associations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  region VARCHAR(100),
  district VARCHAR(120),
  town_village VARCHAR(120),
  address TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_associations_name ON associations(name);
CREATE INDEX IF NOT EXISTS idx_associations_region ON associations(region);

-- Farmer-to-association membership
CREATE TABLE IF NOT EXISTS association_members (
  id SERIAL PRIMARY KEY,
  association_id INT NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  farmer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_number VARCHAR(100),
  status VARCHAR(30) DEFAULT 'pending',
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (association_id, farmer_id)
);

CREATE INDEX IF NOT EXISTS idx_association_members_farmer_id ON association_members(farmer_id);
CREATE INDEX IF NOT EXISTS idx_association_members_status ON association_members(status);

-- Phone OTP verification log
CREATE TABLE IF NOT EXISTS phone_verifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(30) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_status ON phone_verifications(status);

-- Farmer verification submissions
CREATE TABLE IF NOT EXISTS user_verifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(30),
  farm_name VARCHAR(200),
  farmers_association_address TEXT,
  ghana_card_number VARCHAR(50),
  identity_name VARCHAR(200),
  name_match_status VARCHAR(20),
  ghana_card_front_url TEXT,
  ghana_card_back_url TEXT,
  location_text TEXT,
  region VARCHAR(100),
  district VARCHAR(120),
  town_village VARCHAR(120),
  years_farming INT,
  crops_produced TEXT,
  fda_registration_number VARCHAR(120),
  fda_document_url TEXT,
  didit_request_id VARCHAR(120),
  didit_status VARCHAR(30),
  didit_result JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_submitted_at ON user_verifications(submitted_at);
