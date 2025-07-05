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

async function updateRole() {
  try {
    console.log('Updating vendor role to admin...\n');
    
    // Update all users with 'vendor' role to 'admin'
    const [result] = await db.query("UPDATE users SET role = 'admin' WHERE role = 'vendor'");
    
    console.log(`✅ Updated ${result.affectedRows} user(s) from 'vendor' to 'admin' role`);
    
    // Verify the change
    const [users] = await db.query('SELECT id, name, email, role FROM users WHERE role = "admin"');
    
    console.log('\n👑 Admin users:');
    users.forEach(user => {
      console.log(`  ID: ${user.id} | Name: ${user.name} | Email: ${user.email} | Role: ${user.role}`);
    });
    
    // Show updated role distribution
    const [roleCounts] = await db.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    
    console.log('\n📊 Updated Users by Role:');
    roleCounts.forEach(role => {
      console.log(`  ${role.role}: ${role.count} users`);
    });
    
    console.log('\n🎉 Role update completed! You can now log in with admin role.');
    
  } catch (error) {
    console.error('❌ Error updating role:', error.message);
  } finally {
    process.exit(0);
  }
}

updateRole(); 