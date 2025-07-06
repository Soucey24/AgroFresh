-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  platformName VARCHAR(255) NOT NULL DEFAULT 'AgroFresh GH',
  platformDescription TEXT,
  contactEmail VARCHAR(255) NOT NULL,
  supportPhone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'Africa/Accra',
  currency VARCHAR(10) DEFAULT 'GHS',
  enablePayments BOOLEAN DEFAULT TRUE,
  paymentMethods JSON,
  transactionFee DECIMAL(5,2) DEFAULT 2.50,
  minimumPayout DECIMAL(10,2) DEFAULT 50.00,
  emailNotifications BOOLEAN DEFAULT TRUE,
  smsNotifications BOOLEAN DEFAULT TRUE,
  pushNotifications BOOLEAN DEFAULT FALSE,
  requireEmailVerification BOOLEAN DEFAULT TRUE,
  requirePhoneVerification BOOLEAN DEFAULT FALSE,
  maxLoginAttempts INT DEFAULT 5,
  sessionTimeout INT DEFAULT 24,
  maintenanceMode BOOLEAN DEFAULT FALSE,
  debugMode BOOLEAN DEFAULT FALSE,
  autoBackup BOOLEAN DEFAULT TRUE,
  backupFrequency ENUM('hourly', 'daily', 'weekly', 'monthly') DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO platform_settings (
  platformName, 
  platformDescription, 
  contactEmail, 
  supportPhone,
  paymentMethods
) VALUES (
  'AgroFresh GH',
  'Connecting farmers and buyers for fresh agricultural products',
  'support@agrofreshgh.com',
  '+233 24 123 4567',
  '["mtn-momo", "vodafone-cash", "airteltigo-money", "card"]'
) ON DUPLICATE KEY UPDATE id = id; 