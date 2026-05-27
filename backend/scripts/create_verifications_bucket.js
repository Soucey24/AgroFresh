import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Loaded env from', envPath);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  try {
    console.log('Creating bucket: verifications (if not exists)');
    const { data, error } = await supabase.storage.createBucket('verifications', { public: false });
    if (error) {
      // if bucket exists, API may return an error — detect and report
      if (error.message && error.message.toLowerCase().includes('already exists')) {
        console.log('Bucket already exists. OK.');
      } else {
        throw error;
      }
    } else {
      console.log('Bucket created:', data);
    }
    console.log('Done.');
    // allow Node to exit naturally to avoid Windows libuv assertion on open handles
    return;
  } catch (err) {
    console.error('Failed to create bucket:', err.message || err);
    // rethrow so the process exits with non-zero code if run with node
    throw err;
  }
}

run();
