import { db } from '../app.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const requiredVars = [
    'SENDSTACK_APP_ID',
    'SENDSTACK_APP_SECRET',
    'SENDSTACK_API_KEY'
  ];
  
  const missing = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      console.log(`✅ ${varName}: ${process.env[varName].substring(0, 8)}...`);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:', missing.join(', '));
    console.log('Please add them to your .env file');
    return false;
  }
  
  console.log('✅ All environment variables are set');
  return true;
}

async function checkDatabaseConnection() {
  console.log('\n🔍 Checking database connection...');
  
  try {
    await db.query('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function checkOrdersTable() {
  console.log('\n🔍 Checking orders table structure...');
  
  try {
    const [columns] = await db.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'orders' 
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    const requiredColumns = [
      'delivery_info',
      'tracking_number',
      'tracking_url',
      'delivery_status'
    ];
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    const missing = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missing.length > 0) {
      console.log('❌ Missing columns in orders table:', missing.join(', '));
      console.log('Run the migration scripts to add missing columns');
      return false;
    }
    
    console.log('✅ Orders table has all required columns');
    return true;
  } catch (error) {
    console.log('❌ Error checking orders table:', error.message);
    return false;
  }
}

async function testSendstackConnection() {
  console.log('\n🔍 Testing Sendstack API connection...');
  
  if (!process.env.SENDSTACK_APP_ID || !process.env.SENDSTACK_APP_SECRET) {
    console.log('⚠️  Skipping Sendstack test - credentials not configured');
    return true;
  }
  
  try {
    const response = await fetch('https://api.sendstack.africa/api/v1/deliveries', {
      method: 'POST',
      headers: {
        'app_id': process.env.SENDSTACK_APP_ID,
        'app_secret': process.env.SENDSTACK_APP_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderType: "PROCESSING",
        pickup: {
          address: "Accra, Ghana",
          pickupName: "AgroFresh Test",
          pickupNumber: "0243404515"
        },
        drops: [
          {
            address: "Test Address",
            recipientName: "Test User",
            recipientNumber: "0243404515",
            note: "Test delivery"
          }
        ]
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.status === true) {
      console.log('✅ Sendstack API connection successful');
      console.log('📦 Test delivery created with tracking ID:', data.data?.drops?.[0]?.trackingId);
      return true;
    } else {
      console.log('❌ Sendstack API test failed:', data.message || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.log('❌ Sendstack API connection error:', error.message);
    return false;
  }
}

async function checkWebhookEndpoint() {
  console.log('\n🔍 Checking webhook endpoint...');
  
  try {
    const response = await fetch('http://localhost:4000/api/webhooks/sendstack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tracking_number: 'TEST123',
        status: 'Test Status'
      }),
    });
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible');
      return true;
    } else {
      console.log('❌ Webhook endpoint returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook endpoint not accessible:', error.message);
    console.log('Make sure the backend server is running on port 4000');
    return false;
  }
}

async function main() {
  console.log('🚀 AgroFresh Delivery System Setup Check\n');
  
  const checks = [
    checkEnvironmentVariables,
    checkDatabaseConnection,
    checkOrdersTable,
    testSendstackConnection,
    checkWebhookEndpoint
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = await check();
    if (!result) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your delivery system is ready.');
    console.log('\nNext steps:');
    console.log('1. Configure webhook URL in Sendstack dashboard');
    console.log('2. Test order creation and delivery booking');
    console.log('3. Monitor logs for any issues');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above.');
    console.log('\nTroubleshooting:');
    console.log('1. Check your .env file configuration');
    console.log('2. Ensure database is running and accessible');
    console.log('3. Verify Sendstack API credentials');
    console.log('4. Make sure backend server is running');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Setup check failed:', error);
  process.exit(1);
}); 