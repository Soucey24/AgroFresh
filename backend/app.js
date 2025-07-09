import express from 'express';
import session from 'express-session';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import { createUsersTable } from './models/userModel.js';
import { createCropsTable } from './models/cropModel.js';
import { createOrdersTable } from './models/orderModel.js';
import { createPaymentsTable, createPaymentSessionsTable } from './models/paymentModel.js';
import cropsRoutes from './routes/crops.js';
import ordersRoutes from './routes/orders.js';
import uploadRoutes from './routes/upload.js';
import usersRoutes from './routes/users.js';
import payoutsRoutes from './routes/payouts.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import webhooksRouter from './routes/webhooks.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MySQLStore = require('express-mysql-session')(session);

const app = express();
const PORT = process.env.PORT || 4000;

// For ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL connection pool
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Dela',
  password: process.env.DB_PASS || 'RockZ@1234',
  database: process.env.DB_NAME || 'agrofresh',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  store: new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'Dela',
    password: process.env.DB_PASS || 'RockZ@1234',
    database: process.env.DB_NAME || 'agrofresh'
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize database tables
async function initializeDatabase() {
  try {
    await createUsersTable();
    await createCropsTable();
    await createOrdersTable();
    await createPaymentsTable();
    await createPaymentSessionsTable();
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
}

initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crops', cropsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhooksRouter);

// Add /api/logout route
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 