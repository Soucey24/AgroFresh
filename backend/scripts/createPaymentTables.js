import mysql from 'mysql2/promise';

// Direct database connection for migration
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Dela',
  password: process.env.DB_PASS || 'RockZ@1234',
  database: process.env.DB_NAME || 'agrofresh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createPaymentTables() {
  try {
    console.log('Creating payment tables...');

    // Create payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        buyer_id INT NOT NULL,
        farmer_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('mtn-momo', 'vodafone-cash', 'airteltigo-money', 'card', 'bank-transfer') NOT NULL,
        phone_number VARCHAR(20),
        transaction_id VARCHAR(255),
        reference_id VARCHAR(255) UNIQUE,
        status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
        payment_provider VARCHAR(50),
        provider_response JSON,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_transaction_id (transaction_id),
        INDEX idx_reference_id (reference_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Created payments table');

    // Create payment_sessions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        payment_id INT NOT NULL,
        buyer_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status ENUM('active', 'completed', 'expired', 'cancelled') DEFAULT 'active',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_id (session_id),
        INDEX idx_status (status),
        INDEX idx_expires_at (expires_at)
      )
    `);
    console.log('✅ Created payment_sessions table');

    // Create payment_webhooks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_webhooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        webhook_type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        status ENUM('pending', 'processed', 'failed') DEFAULT 'pending',
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        INDEX idx_payment_id (payment_id),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Created payment_webhooks table');

    console.log('🎉 All payment tables created successfully!');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating payment tables:', error);
    await db.end();
    process.exit(1);
  }
}

createPaymentTables(); 