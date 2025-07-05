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

async function addMissingColumns() {
  try {
    // Check if status column exists
    const [columns] = await db.query(`
      SHOW COLUMNS FROM users LIKE 'status'
    `);
    
    if (columns.length === 0) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN status ENUM('Active', 'Inactive') DEFAULT 'Active'
      `);
      console.log('Added status column');
    } else {
      console.log('status column already exists');
    }
    
    // Check if last_login column exists
    const [lastLoginColumns] = await db.query(`
      SHOW COLUMNS FROM users LIKE 'last_login'
    `);
    
    if (lastLoginColumns.length === 0) {
      await db.query(`
        ALTER TABLE users 
        ADD COLUMN last_login TIMESTAMP NULL
      `);
      console.log('Added last_login column');
    } else {
      console.log('last_login column already exists');
    }
    
    console.log('Successfully checked/added missing columns to users table');
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error adding columns:', error);
    await db.end();
    process.exit(1);
  }
}

addMissingColumns(); 