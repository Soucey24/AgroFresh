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
import { createUsersTable } from './models/userModel.js';
import { createCropsTable } from './models/cropModel.js';
import { createOrdersTable } from './models/orderModel.js';
import { createPaymentsTable } from './models/paymentModel.js';
import cropsRoutes from './routes/crops.js';
import ordersRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import payoutsRoutes from './routes/payouts.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import webhooksRouter from './routes/webhooks.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// For ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client for data operations
export const supabase = createClient(
  process.env.SUPABASE_URL || 'https://xxxxx.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'your_anon_key'
);

// PostgreSQL connection pool for session store
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires SSL
});

// Session configuration
const PgSession = pgSession(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: [
    'https://agrofresh.vercel.app/', // Vercel frontend
    'http://localhost:3000',            // local dev
    'http://localhost:5173'             // Vite dev server
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables (call after schema is created in Supabase)
// Uncomment if you want to auto-create tables from code
// await Promise.all([
//   createUsersTable(),
//   createCropsTable(),
//   createOrdersTable(),
//   createPaymentsTable()
// ]);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', environment: process.env.NODE_ENV });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { details: err })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
