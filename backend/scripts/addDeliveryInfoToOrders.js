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

async function addDeliveryInfoToOrders() {
  try {
    console.log('Adding delivery_info column to orders table...');

    // Check if column already exists
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'agrofresh' 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'delivery_info'
    `);

    if (columns.length === 0) {
      // Add delivery_info column
      await db.query(`
        ALTER TABLE orders 
        ADD COLUMN delivery_info JSON NULL 
        AFTER quantity
      `);
      console.log('✅ Added delivery_info column to orders table');
    } else {
      console.log('✅ delivery_info column already exists');
    }

    console.log('🎉 Migration completed successfully!');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding delivery_info column:', error);
    await db.end();
    process.exit(1);
  }
}

addDeliveryInfoToOrders(); 