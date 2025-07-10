import { db } from './app.js';

async function checkAndFixDatabase() {
  try {
    console.log('🔧 Checking database schema...');
    
    // Check if unit column exists
    const [columns] = await db.query("SHOW COLUMNS FROM crops LIKE 'unit'");
    
    if (columns.length === 0) {
      console.log('❌ Unit column not found, adding it...');
      await db.query('ALTER TABLE crops ADD COLUMN unit VARCHAR(20) DEFAULT "kg"');
      console.log('✅ Unit column added successfully');
      
      // Update existing crops to have default unit
      const [result] = await db.query('UPDATE crops SET unit = "kg" WHERE unit IS NULL');
      console.log(`✅ Updated ${result.affectedRows} existing crops with default unit`);
    } else {
      console.log('✅ Unit column already exists');
    }
    
    // Check if 'available' column exists in crops
    const [availableCol] = await db.query("SHOW COLUMNS FROM crops LIKE 'available'");
    if (availableCol.length === 0) {
      await db.query('ALTER TABLE crops ADD COLUMN available BOOLEAN DEFAULT TRUE');
      console.log('✅ Added available column to crops table');
    }
    
    // Check if there are any crops without category/description
    const [cropsWithoutCategory] = await db.query('SELECT COUNT(*) as count FROM crops WHERE description IS NULL OR description = ""');
    console.log(`ℹ️  Found ${cropsWithoutCategory[0].count} crops without category/description`);
    
    if (cropsWithoutCategory[0].count > 0) {
      console.log('⚠️  Some crops may not have categories set');
    }
    
    console.log('✅ Database check completed successfully');
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    process.exit(0);
  }
}

checkAndFixDatabase(); 