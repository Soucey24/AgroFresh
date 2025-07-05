import mysql from 'mysql2/promise';

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Dela',
  password: process.env.DB_PASS || 'RockZ@1234',
  database: process.env.DB_NAME || 'agrofresh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const [result] = await db.query('SELECT 1 as test');
    console.log('✅ Database connection successful');
    
    // Check tables
    const [tables] = await db.query('SHOW TABLES');
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // Check users count
    const [usersCount] = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Users: ${usersCount[0].count}`);
    
    // Check crops count
    const [cropsCount] = await db.query('SELECT COUNT(*) as count FROM crops');
    console.log(`🌾 Crops: ${cropsCount[0].count}`);
    
    // Check orders count
    const [ordersCount] = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📦 Orders: ${ordersCount[0].count}`);
    
    // Check payments count
    const [paymentsCount] = await db.query('SELECT COUNT(*) as count FROM payments');
    console.log(`💰 Payments: ${paymentsCount[0].count}`);
    
    // Show sample data
    if (paymentsCount[0].count > 0) {
      console.log('\n💳 Sample payments:');
      const [payments] = await db.query('SELECT * FROM payments LIMIT 3');
      payments.forEach(payment => {
        console.log(`  - ID: ${payment.id}, Amount: ${payment.amount}, Status: ${payment.status}, Method: ${payment.payment_method}`);
      });
    }
    
    if (cropsCount[0].count > 0) {
      console.log('\n🌾 Sample crops:');
      const [crops] = await db.query('SELECT * FROM crops LIMIT 3');
      crops.forEach(crop => {
        console.log(`  - ID: ${crop.id}, Name: ${crop.name}, Price: ${crop.price}, Quantity: ${crop.quantity}`);
      });
    }
    
    if (ordersCount[0].count > 0) {
      console.log('\n📦 Sample orders:');
      const [orders] = await db.query('SELECT * FROM orders LIMIT 3');
      orders.forEach(order => {
        console.log(`  - ID: ${order.id}, Status: ${order.status}, Amount: ${order.amount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testDatabase(); 