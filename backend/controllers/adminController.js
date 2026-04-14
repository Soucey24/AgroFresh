import { supabase } from '../app.js';

const defaultSettings = {
  platformName: 'AgroFresh GH',
  platformDescription: 'Connecting farmers and buyers for fresh agricultural products',
  contactEmail: 'support@agrofreshgh.com',
  supportPhone: '+233 24 123 4567',
  timezone: 'Africa/Accra',
  currency: 'GHS',
  enablePayments: true,
  paymentMethods: ['mtn-momo', 'vodafone-cash', 'airteltigo-money', 'card'],
  transactionFee: 2.5,
  minimumPayout: 50,
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: false,
  requireEmailVerification: true,
  requirePhoneVerification: false,
  maxLoginAttempts: 5,
  sessionTimeout: 24,
  maintenanceMode: false,
  debugMode: false,
  autoBackup: true,
  backupFrequency: 'daily'
};

const handleError = (res, status, message, details) => {
  if (details) {
    console.error(message, details);
  }
  res.status(status).json({ error: message });
};

const normalizeSettings = (row) => ({
  platformName: row.platform_name,
  platformDescription: row.platform_description,
  contactEmail: row.contact_email,
  supportPhone: row.support_phone,
  timezone: row.timezone,
  currency: row.currency,
  enablePayments: row.enable_payments,
  paymentMethods: row.payment_methods || [],
  transactionFee: Number(row.transaction_fee || 0),
  minimumPayout: Number(row.minimum_payout || 0),
  emailNotifications: row.email_notifications,
  smsNotifications: row.sms_notifications,
  pushNotifications: row.push_notifications,
  requireEmailVerification: row.require_email_verification,
  requirePhoneVerification: row.require_phone_verification,
  maxLoginAttempts: row.max_login_attempts,
  sessionTimeout: row.session_timeout,
  maintenanceMode: row.maintenance_mode,
  debugMode: row.debug_mode,
  autoBackup: row.auto_backup,
  backupFrequency: row.backup_frequency
});

const sumAmount = (rows) => (rows || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

export const getDashboardStats = async (_req, res) => {
  try {
    const [
      { count: totalUsers, error: userErr },
      { count: activeListings, error: cropErr },
      { count: ordersToday, error: orderErr },
      { data: completedPayments, error: revenueErr }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase
        .from('crops')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from('payments').select('amount').eq('status', 'completed')
    ]);

    if (userErr || cropErr || orderErr || revenueErr) {
      throw new Error(userErr?.message || cropErr?.message || orderErr?.message || revenueErr?.message);
    }

    res.json({
      totalUsers: totalUsers || 0,
      activeListings: activeListings || 0,
      ordersToday: ordersToday || 0,
      totalRevenue: sumAmount(completedPayments),
      changes: {
        users: '+0%',
        listings: '+0%',
        orders: '+0%',
        revenue: '+0%'
      }
    });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch dashboard statistics', err.message);
  }
};

export const getRecentActivity = async (_req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, cropsRes, ordersRes, paymentsRes] = await Promise.all([
      supabase.from('users').select('name, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5),
      supabase.from('crops').select('name, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5),
      supabase.from('orders').select('id, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5),
      supabase.from('payments').select('amount, created_at, status').gte('created_at', since).order('created_at', { ascending: false }).limit(5)
    ]);

    const errors = [usersRes.error, cropsRes.error, ordersRes.error, paymentsRes.error].filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    const activities = [
      ...(usersRes.data || []).map((row) => ({
        type: 'user_registration',
        name: row.name,
        created_at: row.created_at,
        status: 'success',
        action: 'New user registration'
      })),
      ...(cropsRes.data || []).map((row) => ({
        type: 'crop_listing',
        name: row.name,
        created_at: row.created_at,
        status: 'success',
        action: 'New crop listing'
      })),
      ...(ordersRes.data || []).map((row) => ({
        type: 'order_created',
        name: `Order #${row.id}`,
        created_at: row.created_at,
        status: 'success',
        action: 'New order created'
      })),
      ...(paymentsRes.data || []).map((row) => ({
        type: 'payment_processed',
        name: `GH₵${Number(row.amount || 0)}`,
        created_at: row.created_at,
        status: row.status,
        action: 'Payment processed'
      }))
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.json(activities);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch recent activity', err.message);
  }
};

export const getCropStats = async (_req, res) => {
  try {
    const now = new Date();
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const [activeRes, expiringRes, expiredRes, soldOrdersRes] = await Promise.all([
      supabase
        .from('crops')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('crops').select('*', { count: 'exact', head: true }).gte('expiry_date', today).lte('expiry_date', threeDaysAhead),
      supabase.from('crops').select('*', { count: 'exact', head: true }).lt('expiry_date', today),
      supabase
        .from('orders')
        .select('crop_id')
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    ]);

    const errors = [activeRes.error, expiringRes.error, expiredRes.error, soldOrdersRes.error].filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    const soldToday = new Set((soldOrdersRes.data || []).map((row) => row.crop_id)).size;

    res.json({
      activeListings: activeRes.count || 0,
      expiringSoon: expiringRes.count || 0,
      soldToday,
      expired: expiredRes.count || 0
    });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crop statistics', err.message);
  }
};

export const getOrderStats = async (_req, res) => {
  try {
    const [completed, inTransit, pending, cancelled] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['shipped', 'ready']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')
    ]);

    const errors = [completed.error, inTransit.error, pending.error, cancelled.error].filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    res.json({
      completed: completed.count || 0,
      inTransit: inTransit.count || 0,
      pending: pending.count || 0,
      cancelled: cancelled.count || 0
    });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch order statistics', err.message);
  }
};

export const getPaymentStats = async (_req, res) => {
  try {
    const [allRes, completedRes, pendingRes, failedRes] = await Promise.all([
      supabase.from('payments').select('amount'),
      supabase.from('payments').select('amount').eq('status', 'completed'),
      supabase.from('payments').select('amount').in('status', ['pending', 'processing']),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    const errors = [allRes.error, completedRes.error, pendingRes.error, failedRes.error].filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    res.json({
      totalPayments: (allRes.data || []).length,
      completed: {
        count: (completedRes.data || []).length,
        amount: sumAmount(completedRes.data)
      },
      pending: {
        count: (pendingRes.data || []).length,
        amount: sumAmount(pendingRes.data)
      },
      failed: failedRes.count || 0
    });
  } catch (err) {
    handleError(res, 500, 'Failed to fetch payment statistics', err.message);
  }
};

export const getAdminCrops = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*, farmer:users!crops_farmer_id_fkey(name, location)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date();
    const inThreeDays = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const transformed = (data || []).map((crop) => {
      const expiry = crop.expiry_date ? new Date(crop.expiry_date) : null;
      let status = 'Active';
      if (expiry && expiry < today) status = 'Expired';
      if (expiry && expiry >= today && expiry <= inThreeDays) status = 'Expiring Soon';
      const days = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        id: crop.id,
        name: crop.name,
        farmer: crop.farmer?.name || 'Unknown',
        quantity: `${crop.quantity}kg`,
        price: `GH₵${Number(crop.price)}/kg`,
        status,
        expiresIn: days === null ? 'N/A' : days < 0 ? 'Expired' : `${days} days`,
        location: crop.farmer?.location || 'Unknown',
        dateAdded: new Date(crop.created_at).toLocaleDateString(),
        image: crop.image
      };
    });

    res.json(transformed);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch crops', err.message);
  }
};

export const getAdminOrders = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, crop:crops(name, image), buyer:users!orders_buyer_id_fkey(name), farmer:users!orders_farmer_id_fkey(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch orders', err.message);
  }
};

export const getAdminPayments = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 500);
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('payments')
      .select('*, buyer:users!payments_buyer_id_fkey(name), farmer:users!payments_farmer_id_fkey(name), order:orders(status)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const processed = (data || []).map((payment) => ({
      ...payment,
      amount: Number(payment.amount || 0),
      buyer_name: payment.buyer?.name,
      farmer_name: payment.farmer?.name,
      order_status: payment.order?.status
    }));

    res.json(processed);
  } catch (err) {
    handleError(res, 500, 'Failed to fetch payments', err.message);
  }
};

export const getAdminSettings = async (_req, res) => {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.json(defaultSettings);
    }

    res.json(normalizeSettings(data));
  } catch (err) {
    if (String(err.message || '').includes('platform_settings')) {
      return res.json(defaultSettings);
    }
    handleError(res, 500, 'Failed to fetch settings', err.message);
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const settings = req.body || {};
    if (!settings.platformName || !settings.contactEmail) {
      return handleError(res, 400, 'Platform name and contact email are required');
    }

    const payload = {
      id: 1,
      platform_name: settings.platformName,
      platform_description: settings.platformDescription || defaultSettings.platformDescription,
      contact_email: settings.contactEmail,
      support_phone: settings.supportPhone || null,
      timezone: settings.timezone || 'Africa/Accra',
      currency: settings.currency || 'GHS',
      enable_payments: settings.enablePayments !== false,
      payment_methods: settings.paymentMethods || defaultSettings.paymentMethods,
      transaction_fee: Number(settings.transactionFee ?? defaultSettings.transactionFee),
      minimum_payout: Number(settings.minimumPayout ?? defaultSettings.minimumPayout),
      email_notifications: settings.emailNotifications !== false,
      sms_notifications: settings.smsNotifications !== false,
      push_notifications: Boolean(settings.pushNotifications),
      require_email_verification: settings.requireEmailVerification !== false,
      require_phone_verification: Boolean(settings.requirePhoneVerification),
      max_login_attempts: Number(settings.maxLoginAttempts ?? defaultSettings.maxLoginAttempts),
      session_timeout: Number(settings.sessionTimeout ?? defaultSettings.sessionTimeout),
      maintenance_mode: Boolean(settings.maintenanceMode),
      debug_mode: Boolean(settings.debugMode),
      auto_backup: settings.autoBackup !== false,
      backup_frequency: settings.backupFrequency || 'daily',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('platform_settings').upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    handleError(res, 500, 'Failed to update settings', err.message);
  }
};
