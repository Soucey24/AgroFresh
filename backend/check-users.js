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

async function checkUsers() {
  try {
    console.log('Checking users and their roles...\n');
    
    // Get all users with their roles
    const [users] = await db.query('SELECT id, name, email, role FROM users ORDER BY id');
    
    console.log('👥 All Users:');
    users.forEach(user => {
      console.log(`  ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Role: ${user.role}`);
    });
    
    // Count users by role
    const [roleCounts] = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    
    console.log('\n📊 Users by Role:');
    roleCounts.forEach(role => {
      console.log(`  ${role.role}: ${role.count} users`);
    });
    
    // Check if there are any vendor users
    const [vendors] = await db.query('SELECT id, name, email FROM users WHERE role = "vendor"');
    
    if (vendors.length > 0) {
      console.log('\n✅ Vendor users found:');
      vendors.forEach(vendor => {
        console.log(`  ID: ${vendor.id} | Name: ${vendor.name} | Email: ${vendor.email}`);
      });
      console.log('\n💡 To access admin pages, log in with one of these vendor accounts.');
    } else {
      console.log('\n❌ No vendor users found!');
      console.log('💡 You need to either:');
      console.log('   1. Create a vendor user, or');
      console.log('   2. Update an existing user to have "vendor" role');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    process.exit(0);
  }
}

checkUsers(); 