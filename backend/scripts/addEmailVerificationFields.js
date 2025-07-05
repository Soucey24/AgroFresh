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

async function addEmailVerificationFields() {
  try {
    // Add pending_email column if it doesn't exist
    const [pendingEmailCol] = await db.query(`SHOW COLUMNS FROM users LIKE 'pending_email'`);
    if (pendingEmailCol.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN pending_email VARCHAR(100)`);
      console.log('Added pending_email column');
    } else {
      console.log('pending_email column already exists');
    }
    // Add email_verification_token column if it doesn't exist
    const [tokenCol] = await db.query(`SHOW COLUMNS FROM users LIKE 'email_verification_token'`);
    if (tokenCol.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255)`);
      console.log('Added email_verification_token column');
    } else {
      console.log('email_verification_token column already exists');
    }
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Error adding email verification fields:', error);
    await db.end();
    process.exit(1);
  }
}

addEmailVerificationFields(); 