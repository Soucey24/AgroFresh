import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkPasswordChangeRequired } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import cropsRoutes from './routes/crops.js';
import ordersRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import payoutsRoutes from './routes/payouts.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import webhooksRouter from './routes/webhooks.js';
import otpRoutes from './routes/otp.js';
import notificationsRoutes from './routes/notifications.js';
import complaintsRoutes from './routes/complaints.js';
import qualityChecksRoutes from './routes/qualityChecks.js';
import verificationRoutes from './routes/verification.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('[sendstack] credentials loaded', {
  appIdConfigured: Boolean(String(process.env.SENDSTACK_APP_ID || '').trim()),
  appIdLength: String(process.env.SENDSTACK_APP_ID || '').trim().length,
  appSecretConfigured: Boolean(String(process.env.SENDSTACK_APP_SECRET || '').trim()),
  appSecretLength: String(process.env.SENDSTACK_APP_SECRET || '').trim().length,
  apiKeyIgnored: true
});

if (isProduction) {
  app.set('trust proxy', 1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

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

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

app.use(session(sessionConfig));

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'https://agrofresh-theta.vercel.app',
  'https://agro-fresh-seven.vercel.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5173'
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    const isCodespacesPreview = /^https:\/\/[a-z0-9-]+\.app\.github\.dev$/i.test(origin || '');
    const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin || '');
    if (!origin || allowedOrigins.has(origin) || isVercelPreview || (!isProduction && isCodespacesPreview)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS blocked for this origin'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(uploadsDirectory));

// Check if password change is required for authenticated users
app.use('/api', checkPasswordChangeRequired);

app.use('/api/auth', authRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRouter);
app.use('/api', otpRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/quality-checks', qualityChecksRoutes);
app.use('/api/verification', verificationRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.use((err, _req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
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