import express from 'express';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import authRoutes from './routes/auth.js';
import cropsRoutes from './routes/crops.js';
import ordersRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import payoutsRoutes from './routes/payouts.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import webhooksRouter from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(supabaseUrl || 'https://invalid.local', supabaseKey || 'invalid-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'postgres'
    };

const pool = new Pool(poolConfig);
const PgSession = pgSession(session);

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'https://agrofresh.vercel.app',
  'https://agrofresh-vg65.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS blocked for this origin'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: err })
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;