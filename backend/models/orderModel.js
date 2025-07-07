import { db } from '../app.js';

export async function createOrdersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      buyer_id INT NOT NULL,
      farmer_id INT NOT NULL,
      crop_id INT NOT NULL,
      quantity INT NOT NULL,
      delivery_info JSON NULL,
      status ENUM('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'completed', 'paid', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      delivery_service VARCHAR(50),
      delivery_address TEXT,
      delivery_status VARCHAR(50),
      tracking_number VARCHAR(100),
      delivery_eta DATETIME,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
    )
  `);
} 