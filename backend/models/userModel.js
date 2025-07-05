import { db } from '../app.js';

export async function createUsersTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('farmer', 'buyer', 'vendor') NOT NULL,
      location VARCHAR(100),
      avatar VARCHAR(255),
      status ENUM('Active', 'Inactive') DEFAULT 'Active',
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_email_role (email, role)
    )
  `);
} 