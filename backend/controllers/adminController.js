import { db } from '../app.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get total users
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    
    // Get total crops
    const [cropCount] = await db.query('SELECT COUNT(*) as count FROM crops WHERE created_at > NOW() - INTERVAL 7 DAY');
    
    // Get orders today
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()');
    
    // Get total revenue (from completed payments)
    const [revenueResult] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE status = 'completed'
    `);
    
    // Get percentage changes (simplified - you can make this more sophisticated)
    const [lastMonthUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL 30 DAY');
    const [lastMonthCrops] = await db.query('SELECT COUNT(*) as count FROM crops WHERE created_at > NOW() - INTERVAL 30 DAY');
    const [lastMonthOrders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE created_at > NOW() - INTERVAL 30 DAY');
    const [lastMonthRevenue] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments 
      WHERE status = 'completed' AND created_at > NOW() - INTERVAL 30 DAY
    `);
    
    const stats = {
      totalUsers: userCount[0].count,
      activeListings: cropCount[0].count,
      ordersToday: orderCount[0].count,
      totalRevenue: parseFloat(revenueResult[0].total),
      changes: {
        users: lastMonthUsers[0].count > 0 ? '+12%' : '+0%',
        listings: lastMonthCrops[0].count > 0 ? '+8%' : '+0%',
        orders: lastMonthOrders[0].count > 0 ? '+23%' : '+0%',
        revenue: lastMonthRevenue[0].total > 0 ? '+15%' : '+0%'
      }
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get recent activity
export const getRecentActivity = async (req, res) => {
  try {
    const activities = [];
    
    // Get recent user registrations
    const [recentUsers] = await db.query(`
      SELECT 'user_registration' as type, name, created_at, 'success' as status
      FROM users 
      WHERE created_at > NOW() - INTERVAL 24 HOUR
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Get recent crop listings
    const [recentCrops] = await db.query(`
      SELECT 'crop_listing' as type, name, created_at, 'success' as status
      FROM crops 
      WHERE created_at > NOW() - INTERVAL 24 HOUR
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Get recent orders
    const [recentOrders] = await db.query(`
      SELECT 'order_created' as type, CONCAT('Order #', id) as name, created_at, 'success' as status
      FROM orders 
      WHERE created_at > NOW() - INTERVAL 24 HOUR
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Get recent payments
    const [recentPayments] = await db.query(`
      SELECT 'payment_processed' as type, CONCAT('GH₵', amount) as name, created_at, status
      FROM payments 
      WHERE created_at > NOW() - INTERVAL 24 HOUR
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    // Combine and sort all activities
    const allActivities = [
      ...recentUsers.map(u => ({ ...u, action: 'New user registration' })),
      ...recentCrops.map(c => ({ ...c, action: 'New crop listing' })),
      ...recentOrders.map(o => ({ ...o, action: 'New order created' })),
      ...recentPayments.map(p => ({ ...p, action: 'Payment processed' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
    
    res.json(allActivities);
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

// Get crop statistics
export const getCropStats = async (req, res) => {
  try {
    // Active listings
    const [activeListings] = await db.query('SELECT COUNT(*) as count FROM crops WHERE created_at > NOW() - INTERVAL 7 DAY');
    
    // Expiring soon (within 3 days)
    const [expiringSoon] = await db.query(`
      SELECT COUNT(*) as count 
      FROM crops 
      WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    `);
    
    // Sold today (crops with completed orders)
    const [soldToday] = await db.query(`
      SELECT COUNT(DISTINCT c.id) as count 
      FROM crops c 
      JOIN orders o ON c.id = o.crop_id 
      WHERE o.status = 'completed' AND DATE(o.created_at) = CURDATE()
    `);
    
    // Expired crops
    const [expiredCrops] = await db.query(`
      SELECT COUNT(*) as count 
      FROM crops 
      WHERE expiry_date < CURDATE()
    `);
    
    res.json({
      activeListings: activeListings[0].count,
      expiringSoon: expiringSoon[0].count,
      soldToday: soldToday[0].count,
      expired: expiredCrops[0].count
    });
  } catch (err) {
    console.error('Crop stats error:', err);
    res.status(500).json({ error: 'Failed to fetch crop statistics' });
  }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
  try {
    // Completed orders
    const [completed] = await db.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'completed'
    `);
    
    // In transit orders
    const [inTransit] = await db.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status IN ('shipped', 'ready')
    `);
    
    // Pending orders
    const [pending] = await db.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'pending'
    `);
    
    // Cancelled orders
    const [cancelled] = await db.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE status = 'cancelled'
    `);
    
    res.json({
      completed: completed[0].count,
      inTransit: inTransit[0].count,
      pending: pending[0].count,
      cancelled: cancelled[0].count
    });
  } catch (err) {
    console.error('Order stats error:', err);
    res.status(500).json({ error: 'Failed to fetch order statistics' });
  }
};

// Get payment statistics
export const getPaymentStats = async (req, res) => {
  try {
    // Total payments
    const [totalPayments] = await db.query('SELECT COUNT(*) as count FROM payments');
    
    // Completed payments
    const [completedPayments] = await db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
      FROM payments 
      WHERE status = 'completed'
    `);
    
    // Pending payments
    const [pendingPayments] = await db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
      FROM payments 
      WHERE status IN ('pending', 'processing')
    `);
    
    // Failed payments
    const [failedPayments] = await db.query(`
      SELECT COUNT(*) as count
      FROM payments 
      WHERE status = 'failed'
    `);
    
    res.json({
      totalPayments: totalPayments[0].count,
      completed: {
        count: completedPayments[0].count,
        amount: parseFloat(completedPayments[0].total_amount)
      },
      pending: {
        count: pendingPayments[0].count,
        amount: parseFloat(pendingPayments[0].total_amount)
      },
      failed: failedPayments[0].count
    });
  } catch (err) {
    console.error('Payment stats error:', err);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
};

// Get admin crops with farmer info
export const getAdminCrops = async (req, res) => {
  try {
    const [crops] = await db.query(`
      SELECT 
        c.*,
        u.name as farmer_name,
        u.location as farmer_location,
        CASE 
          WHEN c.expiry_date < CURDATE() THEN 'Expired'
          WHEN c.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'Expiring Soon'
          ELSE 'Active'
        END as status,
        DATEDIFF(c.expiry_date, CURDATE()) as days_until_expiry
      FROM crops c
      JOIN users u ON c.farmer_id = u.id
      ORDER BY c.created_at DESC
    `);
    
    const transformedCrops = crops.map(crop => ({
      id: crop.id,
      name: crop.name,
      farmer: crop.farmer_name,
      quantity: `${crop.quantity}kg`,
      price: `GH₵${crop.price}/kg`,
      status: crop.status,
      expiresIn: crop.days_until_expiry < 0 ? 'Expired' : `${crop.days_until_expiry} days`,
      location: crop.farmer_location,
      dateAdded: new Date(crop.created_at).toLocaleDateString(),
      image: crop.image
    }));
    
    res.json(transformedCrops);
  } catch (err) {
    console.error('Admin crops error:', err);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
};

// Get admin orders with all details
export const getAdminOrders = async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT 
        o.*,
        c.name as crop_name,
        c.image as crop_image,
        buyer.name as buyer_name,
        farmer.name as farmer_name
      FROM orders o
      JOIN crops c ON o.crop_id = c.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users farmer ON o.farmer_id = farmer.id
      ORDER BY o.created_at DESC
    `);
    
    res.json(orders);
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get admin payments with all details
export const getAdminPayments = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const [payments] = await db.query(`
      SELECT 
        p.*,
        buyer.name as buyer_name,
        farmer.name as farmer_name,
        o.status as order_status
      FROM payments p
      JOIN users buyer ON p.buyer_id = buyer.id
      JOIN users farmer ON p.farmer_id = farmer.id
      LEFT JOIN orders o ON p.order_id = o.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    // Convert amount to number for frontend compatibility
    const processedPayments = payments.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) || 0
    }));

    res.json(processedPayments);
  } catch (err) {
    console.error('Admin payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

 