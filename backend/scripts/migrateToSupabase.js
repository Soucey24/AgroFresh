import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection
const mysqlConnection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Dela',
  password: process.env.DB_PASS || 'RockZ@1234',
  database: process.env.DB_NAME || 'agrofresh'
});

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateUsers() {
  console.log('Migrating users...');
  const [users] = await mysqlConnection.query('SELECT * FROM users');
  
  for (const user of users) {
    const { id, ...userData } = user;
    const { error } = await supabase
      .from('users')
      .upsert([{ id, ...userData }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating user', user.id, error);
    else console.log(`Migrated user ${user.id}`);
  }
  console.log('Users migration complete\n');
}

async function migrateCrops() {
  console.log('Migrating crops...');
  const [crops] = await mysqlConnection.query('SELECT * FROM crops');
  
  for (const crop of crops) {
    const { id, ...cropData } = crop;
    const { error } = await supabase
      .from('crops')
      .upsert([{ id, ...cropData }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating crop', crop.id, error);
    else console.log(`Migrated crop ${crop.id}`);
  }
  console.log('Crops migration complete\n');
}

async function migrateOrders() {
  console.log('Migrating orders...');
  const [orders] = await mysqlConnection.query('SELECT * FROM orders');
  
  for (const order of orders) {
    const { id, delivery_info, ...orderData } = order;
    
    // Handle JSON field conversion
    let deliveryInfo = null;
    if (delivery_info) {
      // If it's already parsed
      if (typeof delivery_info === 'object') {
        deliveryInfo = delivery_info;
      } else {
        // If it's a string, parse it
        try {
          deliveryInfo = JSON.parse(delivery_info);
        } catch (e) {
          deliveryInfo = null;
        }
      }
    }

    const { error } = await supabase
      .from('orders')
      .upsert([{ id, delivery_info: deliveryInfo, ...orderData }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating order', order.id, error);
    else console.log(`Migrated order ${order.id}`);
  }
  console.log('Orders migration complete\n');
}

async function migratePayments() {
  console.log('Migrating payments...');
  const [payments] = await mysqlConnection.query('SELECT * FROM payments');
  
  for (const payment of payments) {
    const { id, provider_response, metadata, ...paymentData } = payment;
    
    // Handle JSON fields
    let providerResponse = null;
    let metadataObj = null;
    
    if (provider_response) {
      try {
        providerResponse = typeof provider_response === 'object' ? provider_response : JSON.parse(provider_response);
      } catch (e) {
        providerResponse = null;
      }
    }

    if (metadata) {
      try {
        metadataObj = typeof metadata === 'object' ? metadata : JSON.parse(metadata);
      } catch (e) {
        metadataObj = null;
      }
    }

    const { error } = await supabase
      .from('payments')
      .upsert([{ 
        id, 
        provider_response: providerResponse, 
        metadata: metadataObj, 
        ...paymentData 
      }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating payment', payment.id, error);
    else console.log(`Migrated payment ${payment.id}`);
  }
  console.log('Payments migration complete\n');
}

async function migratePaymentWebhooks() {
  console.log('Migrating payment webhooks...');
  const [webhooks] = await mysqlConnection.query('SELECT * FROM payment_webhooks');
  
  for (const webhook of webhooks) {
    const { id, payload, ...webhookData } = webhook;
    
    let payloadObj = null;
    if (payload) {
      try {
        payloadObj = typeof payload === 'object' ? payload : JSON.parse(payload);
      } catch (e) {
        payloadObj = null;
      }
    }

    const { error } = await supabase
      .from('payment_webhooks')
      .upsert([{ id, payload: payloadObj, ...webhookData }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating webhook', webhook.id, error);
    else console.log(`Migrated webhook ${webhook.id}`);
  }
  console.log('Payment webhooks migration complete\n');
}

async function migratePaymentSessions() {
  console.log('Migrating payment sessions...');
  const [sessions] = await mysqlConnection.query('SELECT * FROM payment_sessions');
  
  for (const session of sessions) {
    const { id, ...sessionData } = session;
    const { error } = await supabase
      .from('payment_sessions')
      .upsert([{ id, ...sessionData }], { onConflict: 'id' });
    
    if (error) console.error('Error migrating session', session.id, error);
    else console.log(`Migrated session ${session.id}`);
  }
  console.log('Payment sessions migration complete\n');
}

async function migrate() {
  try {
    console.log('Starting migration from MySQL to Supabase...\n');
    
    await migrateUsers();
    await migrateCrops();
    await migrateOrders();
    await migratePayments();
    await migratePaymentWebhooks();
    await migratePaymentSessions();
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mysqlConnection.end();
  }
}

migrate();
