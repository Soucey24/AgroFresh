import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const allowNoMysql = String(process.env.ALLOW_NO_MYSQL || 'true').toLowerCase() === 'true';

const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'agrofresh',
  connectTimeout: 5000
};

let mysqlConnection = null;

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function connectMysqlIfAvailable() {
  try {
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('Connected to MySQL source successfully.');
    return true;
  } catch (error) {
    const code = error?.code || 'UNKNOWN';
    console.warn(`MySQL source unavailable (${code}).`);

    if (!allowNoMysql) {
      throw new Error(
        `MySQL connection failed with ${code}. Set ALLOW_NO_MYSQL=true to continue without source data.`
      );
    }

    console.log('Proceeding without MySQL source (bootstrap mode).');
    return false;
  }
}

async function seedAdminIfMissing() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || 'Platform Admin';

  if (!adminEmail || !adminPassword) {
    console.log('No SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD provided. Skipping admin seed.');
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('email', adminEmail)
    .eq('role', 'admin')
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  if (existing) {
    console.log('Admin seed skipped: admin already exists.');
    return;
  }

  const password_hash = await bcrypt.hash(adminPassword, 12);

  const { error } = await supabase.from('users').insert([
    {
      name: adminName,
      email: adminEmail,
      password_hash,
      role: 'admin',
      status: 'Active'
    }
  ]);

  if (error) {
    throw error;
  }

  console.log('Admin user seeded successfully.');
}

async function migrateTable(tableName, mapper) {
  if (!mysqlConnection) return;

  console.log(`Migrating ${tableName}...`);
  const [rows] = await mysqlConnection.query(`SELECT * FROM ${tableName}`);

  for (const row of rows) {
    const mapped = mapper(row);
    const { error } = await supabase.from(tableName).upsert([mapped], { onConflict: 'id' });

    if (error) {
      console.error(`Error migrating ${tableName} row ${row.id}:`, error.message);
    }
  }

  console.log(`${tableName} migration complete (${rows.length} rows).`);
}

async function migrateWithMysqlSource() {
  await migrateTable('users', (row) => ({ ...row }));
  await migrateTable('crops', (row) => ({ ...row }));
  await migrateTable('orders', (row) => ({ ...row, delivery_info: parseJson(row.delivery_info) }));
  await migrateTable('payments', (row) => ({
    ...row,
    provider_response: parseJson(row.provider_response),
    metadata: parseJson(row.metadata)
  }));
  await migrateTable('payment_webhooks', (row) => ({ ...row, payload: parseJson(row.payload) }));
  await migrateTable('payment_sessions', (row) => ({ ...row }));
}

async function migrate() {
  try {
    console.log('Starting Supabase migration...');

    const hasMysqlSource = await connectMysqlIfAvailable();

    if (hasMysqlSource) {
      await migrateWithMysqlSource();
      console.log('Data migration from MySQL completed.');
    } else {
      await seedAdminIfMissing();
      console.log('Bootstrap mode completed (no MySQL data source).');
    }

    console.log('Migration script finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message || error);
    process.exit(1);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

migrate();
