-- PostgreSQL Schema for Agrofresh (Supabase)
-- Run this in Supabase SQL Editor

-- Create ENUM types first
CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'vendor', 'admin');
CREATE TYPE user_status AS ENUM ('Active', 'Inactive');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'completed', 'paid', 'cancelled');
CREATE TYPE payment_method AS ENUM ('mtn-momo', 'vodafone-cash', 'airteltigo-money', 'card', 'bank-transfer');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');
CREATE TYPE webhook_status AS ENUM ('pending', 'processed', 'failed');
CREATE TYPE session_status AS ENUM ('active', 'completed', 'expired', 'cancelled');
CREATE TYPE backup_frequency AS ENUM ('hourly', 'daily', 'weekly', 'monthly');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  location VARCHAR(100),
  phone VARCHAR(50),
  bio TEXT,
  avatar VARCHAR(255),
  pending_email VARCHAR(100),
  email_verification_token VARCHAR(255),
  status user_status DEFAULT 'Active',
  last_login TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, role)
);

-- Create crops table
CREATE TABLE IF NOT EXISTS crops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  unit VARCHAR(20) DEFAULT 'kg',
  expiry_date DATE,
  available BOOLEAN DEFAULT TRUE,
  farmer_id INT NOT NULL,
  image VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  crop_id INT NOT NULL,
  quantity INT NOT NULL,
  delivery_info JSONB NULL,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivery_service VARCHAR(50),
  delivery_address TEXT,
  delivery_status VARCHAR(50),
  tracking_number VARCHAR(100),
  tracking_url VARCHAR(255),
  delivery_eta TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL,
  buyer_id INT NOT NULL,
  farmer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  phone_number VARCHAR(20),
  transaction_id VARCHAR(255),
  reference_id VARCHAR(255) UNIQUE,
  status payment_status DEFAULT 'pending',
  payment_provider VARCHAR(50),
  provider_response JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create payment_webhooks table
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id SERIAL PRIMARY KEY,
  payment_id INT NOT NULL,
  webhook_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status webhook_status DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Create payment_sessions table
CREATE TABLE IF NOT EXISTS payment_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  payment_id INT NOT NULL,
  buyer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status session_status DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  farmer_id INT NOT NULL,
  order_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  reference_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id SERIAL PRIMARY KEY,
  platform_name VARCHAR(255) NOT NULL DEFAULT 'AgroFresh GH',
  platform_description TEXT,
  contact_email VARCHAR(255) NOT NULL,
  support_phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'Africa/Accra',
  currency VARCHAR(10) DEFAULT 'GHS',
  enable_payments BOOLEAN DEFAULT TRUE,
  payment_methods JSONB,
  transaction_fee DECIMAL(5,2) DEFAULT 2.50,
  minimum_payout DECIMAL(10,2) DEFAULT 50.00,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT FALSE,
  require_email_verification BOOLEAN DEFAULT TRUE,
  require_phone_verification BOOLEAN DEFAULT FALSE,
  max_login_attempts INT DEFAULT 5,
  session_timeout INT DEFAULT 24,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  debug_mode BOOLEAN DEFAULT FALSE,
  auto_backup BOOLEAN DEFAULT TRUE,
  backup_frequency backup_frequency DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO platform_settings (
  id,
  platform_name,
  platform_description,
  contact_email,
  support_phone,
  payment_methods
) VALUES (
  1,
  'AgroFresh GH',
  'Connecting farmers and buyers for fresh agricultural products',
  'support@agrofreshgh.com',
  '+233 24 123 4567',
  '["mtn-momo", "vodafone-cash", "airteltigo-money", "card"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_crops_farmer_id ON crops(farmer_id);
CREATE INDEX idx_crops_available ON crops(available);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX idx_orders_crop_id ON orders(crop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX idx_payments_farmer_id ON payments(farmer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_reference_id ON payments(reference_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payment_webhooks_payment_id ON payment_webhooks(payment_id);
CREATE INDEX idx_payment_webhooks_status ON payment_webhooks(status);
CREATE INDEX idx_payment_sessions_session_id ON payment_sessions(session_id);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions(expires_at);
CREATE INDEX idx_payouts_farmer_id ON payouts(farmer_id);
CREATE INDEX idx_payouts_order_id ON payouts(order_id);
CREATE INDEX idx_payouts_status ON payouts(status);
