import mysql from 'mysql2/promise';

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Dela',
  password: process.env.DB_PASS || 'RockZ@1234',
  database: process.env.DB_NAME || 'agrofresh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addProfileFields() {
  try {
    // Add phone column if it doesn't exist
    const [phoneCol] = await db.query(`SHOW COLUMNS FROM users LIKE 'phone'`);
    if (phoneCol.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(32)`);
      console.log('Added phone column');
    } else {
      console.log('phone column already exists');
    }
    // Add bio column if it doesn't exist
    const [bioCol] = await db.query(`SHOW COLUMNS FROM users LIKE 'bio'`);
    if (bioCol.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN bio TEXT`);
      console.log('Added bio column');
    } else {
      console.log('bio column already exists');
    }
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error adding profile fields:', error);
    await db.end();
    process.exit(1);
  }
}

addProfileFields(); 