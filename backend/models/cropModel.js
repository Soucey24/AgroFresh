import { db } from '../app.js';

export async function createCropsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crops (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      unit VARCHAR(20) DEFAULT 'kg',
      expiry_date DATE,
      available BOOLEAN DEFAULT TRUE,
      farmer_id INT NOT NULL,
      image VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
} 