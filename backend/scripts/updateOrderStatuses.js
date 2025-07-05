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

async function updateOrderStatuses() {
  try {
    // Update the status column to include new enum values
    await db.query(`
      ALTER TABLE orders 
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'completed', 'paid', 'cancelled') DEFAULT 'pending'
    `);
    
    console.log('Successfully updated orders table with new status values');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error updating order statuses:', error);
    await db.end();
    process.exit(1);
  }
}

updateOrderStatuses(); 