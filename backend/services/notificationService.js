import axios from 'axios';
import { supabase } from '../app.js';

const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const ARKESEL_ENDPOINT = 'https://sms.arkesel.com/api/v2/sms/send';

const config = {
  emailServiceId: process.env.EMAILJS_SERVICE_ID,
  emailTemplateId: process.env.EMAILJS_TEMPLATE_ID,
  emailPublicKey: process.env.EMAILJS_PUBLIC_KEY,
  smsApiKey: process.env.ARKESEL_API_KEY,
  smsSender: process.env.ARKESEL_SENDER || 'AgroFresh'
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatMoney = (value) => `GH₵ ${Number(value || 0).toFixed(2)}`;

const getDeliveryInfo = (order) => {
  if (!order.delivery_info) return {};
  if (typeof order.delivery_info === 'string') {
    try {
      return JSON.parse(order.delivery_info);
    } catch {
      return {};
    }
  }
  return order.delivery_info;
};

const buildReceiptHtml = ({ order, payment, crop, recipient }) => {
  const delivery = getDeliveryInfo(order);
  const total = Number(payment.amount || crop?.price || 0);
  const quantity = Number(order.quantity || 0);
  const unitPrice = quantity ? total / quantity : 0;

  return `
    <div style="font-family:Arial,sans-serif;color:#183024;max-width:640px;margin:auto;border:1px solid #dce8df;border-radius:12px;overflow:hidden">
      <div style="background:#208b4b;color:#fff;padding:24px 28px">
        <div style="font-size:24px;font-weight:700">AgroFresh GH</div>
        <div style="margin-top:6px;opacity:.9">Payment receipt and order confirmation</div>
      </div>
      <div style="padding:26px 28px">
        <p style="font-size:16px">Hello ${escapeHtml(recipient.name || 'AgroFresh customer')},</p>
        <p>Your payment was confirmed successfully. Here are your order details:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:9px 0;color:#607268">Order ID</td><td style="padding:9px 0;text-align:right;font-weight:700">#${escapeHtml(order.id)}</td></tr>
          <tr><td style="padding:9px 0;color:#607268">Item</td><td style="padding:9px 0;text-align:right">${escapeHtml(crop?.name || 'Fresh produce')}</td></tr>
          <tr><td style="padding:9px 0;color:#607268">Quantity</td><td style="padding:9px 0;text-align:right">${escapeHtml(quantity)} ${escapeHtml(crop?.unit || 'unit(s)')}</td></tr>
          <tr><td style="padding:9px 0;color:#607268">Unit price</td><td style="padding:9px 0;text-align:right">${formatMoney(unitPrice)}</td></tr>
          <tr style="border-top:2px solid #dce8df"><td style="padding:14px 0;font-weight:700">Total paid</td><td style="padding:14px 0;text-align:right;font-size:18px;font-weight:700;color:#208b4b">${formatMoney(total)}</td></tr>
        </table>
        <h3 style="margin:22px 0 8px">Delivery details</h3>
        <p style="margin:4px 0">${escapeHtml(delivery.fullName || recipient.name || 'N/A')}</p>
        <p style="margin:4px 0">${escapeHtml(delivery.phone || 'N/A')}</p>
        <p style="margin:4px 0">${escapeHtml(delivery.address || delivery.pickupLocation || 'N/A')}</p>
        <p style="margin:22px 0 0;color:#607268;font-size:13px">Payment reference: ${escapeHtml(payment.reference_id || 'N/A')}<br>Payment status: Completed</p>
      </div>
      <div style="background:#f2f8f3;padding:16px 28px;color:#607268;font-size:12px">Thank you for choosing AgroFresh GH.</div>
    </div>`;
};

const sendEmail = async ({ recipient, subject, receiptHtml, order, payment }) => {
  if (!config.emailServiceId || !config.emailTemplateId || !config.emailPublicKey) {
    console.warn('[notifications] EmailJS is not configured; skipping email', { recipient: recipient.email });
    return { sent: false, reason: 'email_not_configured' };
  }
  if (!recipient.email) return { sent: false, reason: 'recipient_email_missing' };

  await axios.post(EMAILJS_ENDPOINT, {
    service_id: config.emailServiceId,
    template_id: config.emailTemplateId,
    user_id: config.emailPublicKey,
    template_params: {
      to_email: recipient.email,
      to_name: recipient.name || 'AgroFresh customer',
      subject,
      order_id: order.id,
      payment_reference: payment.reference_id,
      receipt_html: receiptHtml
    }
  }, { timeout: 15000 });

  return { sent: true };
};

const sendActivityEmail = async ({ recipient, subject, message, link }) => {
  if (!config.emailServiceId || !config.emailTemplateId || !config.emailPublicKey || !recipient.email) {
    return { sent: false, reason: 'email_not_configured_or_recipient_missing' };
  }
  await axios.post(EMAILJS_ENDPOINT, {
    service_id: config.emailServiceId,
    template_id: config.emailTemplateId,
    user_id: config.emailPublicKey,
    template_params: {
      to_email: recipient.email,
      to_name: recipient.name || 'AgroFresh user',
      subject,
      order_id: '',
      payment_reference: '',
      receipt_html: `<p>${escapeHtml(message)}</p><p><a href="${escapeHtml(link || '')}">Open AgroFresh</a></p>`
    }
  }, { timeout: 15000 });
  return { sent: true };
};

export const sendSms = async ({ recipient, message }) => {
  if (!config.smsApiKey) {
    console.warn('[notifications] Arkesel is not configured; skipping SMS', { phone: recipient.phone });
    return { sent: false, reason: 'sms_not_configured' };
  }
  if (!recipient.phone) return { sent: false, reason: 'recipient_phone_missing' };

  try {
    try {
      await axios.post(ARKESEL_ENDPOINT, {
        sender: config.smsSender,
        message,
        recipients: [recipient.phone]
      }, {
        headers: { 'api-key': config.smsApiKey, 'Content-Type': 'application/json' },
        timeout: 15000
      });
    } catch (error) {
      const status = error.response?.status;
      if (status === 402) throw new Error('Arkesel SMS credit is insufficient. Top up Arkesel to send verification codes.');
      if (status === 401 || status === 403) throw new Error('Arkesel rejected the SMS request. Check ARKESEL_API_KEY and ARKESEL_SENDER.');
      throw new Error(`Arkesel SMS delivery failed${status ? ` (${status})` : ''}.`);
    }
  } catch (error) {
    if (error.response?.status === 402) {
      throw new Error('Arkesel SMS credit is unavailable. Top up the Arkesel account linked to ARKESEL_API_KEY.');
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('Arkesel rejected the SMS request. Check ARKESEL_API_KEY and ARKESEL_SENDER.');
    }
    throw error;
  }

  return { sent: true };
};

export const createInAppNotifications = async ({ userIds, type, title, message, link = null }) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return;
  const { data: existing, error: existingError } = await supabase
    .from('notifications')
    .select('user_id')
    .in('user_id', ids)
    .eq('type', type)
    .eq('message', message);
  if (existingError) throw existingError;
  const existingIds = new Set((existing || []).map((row) => row.user_id));
  const newRows = ids
    .filter((user_id) => !existingIds.has(user_id))
    .map((user_id) => ({ user_id, type, title, message, link }));
  if (!newRows.length) return;
  const { error } = await supabase.from('notifications').insert(newRows);
  if (error) throw error;
};

const notifyUsersBySms = async (userIds, message) => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;
  const { data: users, error } = await supabase.from('users').select('id, name, phone').in('id', ids);
  if (error) throw error;
  await Promise.allSettled((users || []).map((recipient) => sendSms({ recipient, message })));
};

const getAdminIds = async () => {
  const { data, error } = await supabase.from('users').select('id').in('role', ['admin', 'vendor']);
  if (error) throw error;
  return (data || []).map((user) => user.id);
};

export const notifyRegistration = async (user) => {
  const adminIds = await getAdminIds();
  await createInAppNotifications({
    userIds: adminIds,
    type: 'registration',
    title: 'New account registered',
    message: `${user.name} registered as a ${user.role}.`,
    link: '/admin/users'
  });
  await notifyUsersBySms(adminIds, `AgroFresh: New ${user.role} account registered by ${user.name}. Review the account in the admin dashboard.`);
};

export const notifyVerificationSubmitted = async (userId) => {
  const { data: user, error } = await supabase.from('users').select('name').eq('id', userId).single();
  if (error) throw error;
  const adminIds = await getAdminIds();
  await createInAppNotifications({
    userIds: adminIds,
    type: 'verification_submitted',
    title: 'Farmer verification submitted',
    message: `${user.name} submitted farmer verification documents.`,
    link: '/admin/verifications'
  });
  await notifyUsersBySms(adminIds, `AgroFresh: Farmer verification submitted by ${user.name}. Please review the documents.`);
};

export const notifyVerificationDecision = async (userId, status) => {
  const { data: user, error } = await supabase.from('users').select('name, phone').eq('id', userId).single();
  if (error) throw error;
  await createInAppNotifications({
    userIds: [userId],
    type: 'verification_decision',
    title: `Farmer verification ${status}`,
    message: status === 'approved' ? 'Your farmer account is approved and can list products.' : 'Your farmer verification was rejected. Please review the feedback and resubmit.',
    link: '/profile'
  });
  await sendSms({
    recipient: user,
    message: `AgroFresh: Hello ${user.name}, your farmer verification was ${status}. ${status === 'approved' ? 'You can now list products.' : 'Please review the feedback and resubmit.'}`
  });
};

export const notifyCropSubmitted = async (cropId) => {
  const { data: crop, error } = await supabase.from('crops').select('name, farmer:users(name)').eq('id', cropId).single();
  if (error) throw error;
  const adminIds = await getAdminIds();
  await createInAppNotifications({
    userIds: adminIds,
    type: 'crop_submitted',
    title: 'Product awaiting approval',
    message: `${crop.farmer?.name || 'A farmer'} uploaded ${crop.name}.`,
    link: '/admin/crops'
  });
  await notifyUsersBySms(adminIds, `AgroFresh: Product "${crop.name}" uploaded by ${crop.farmer?.name || 'a farmer'} and awaiting approval.`);
};

export const notifyCropDecision = async (cropId, status) => {
  const { data: crop, error } = await supabase.from('crops').select('name, farmer:users(id, name, phone)').eq('id', cropId).single();
  if (error) throw error;
  const { data: farmer } = await supabase.from('users').select('id').eq('id', crop.farmer?.id).maybeSingle();
  await createInAppNotifications({
    userIds: [farmer?.id],
    type: 'crop_decision',
    title: `Product ${status}`,
    message: `Your product "${crop.name}" was ${status}.`,
    link: '/farmer-orders'
  });
  await sendSms({
    recipient: crop.farmer || {},
    message: `AgroFresh: Your product "${crop.name}" was ${status}. ${status === 'active' ? 'It is now visible to buyers.' : 'Please review the admin feedback.'}`
  });
};

export const notifyOrderCreated = async (orderId) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, quantity, crop:crops(name), buyer:users!orders_buyer_id_fkey(id, name, phone), farmer:users!orders_farmer_id_fkey(id, name, phone)')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  const message = `AgroFresh: Order #${order.id} created for ${order.crop?.name || 'produce'} x${order.quantity}. Payment is pending confirmation.`;
  await createInAppNotifications({
    userIds: [order.buyer?.id],
    type: 'order_created',
    title: `Order #${order.id} placed`,
    message: `Your order for ${order.crop?.name || 'produce'} is awaiting payment confirmation.`,
    link: '/buyer-orders'
  });
  await createInAppNotifications({
    userIds: [order.farmer?.id],
    type: 'order_created',
    title: `New order #${order.id}`,
    message: `A buyer ordered ${order.crop?.name || 'produce'} x${order.quantity}. Prepare it after payment confirmation.`,
    link: '/farmer-orders'
  });
  await Promise.allSettled([
    sendSms({ recipient: order.buyer || {}, message }),
    sendSms({ recipient: order.farmer || {}, message: `${message} Please prepare the order after payment confirmation.` })
  ]);
};

export const notifyOrderStatusChanged = async (orderId, status) => {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, quantity, crop:crops(name), buyer:users!orders_buyer_id_fkey(id, name, email, phone), farmer:users!orders_farmer_id_fkey(id, name, email, phone)')
    .eq('id', orderId)
    .single();
  if (error) throw error;

  const buyerMessage = `Your order #${order.id} for ${order.crop?.name || 'produce'} is now ${status}.`;
  const farmerMessage = `Order #${order.id} for ${order.crop?.name || 'produce'} is now ${status}.`;
  await createInAppNotifications({
    userIds: [order.buyer?.id],
    type: 'order_status_changed',
    title: `Order #${order.id} is ${status}`,
    message: buyerMessage,
    link: '/buyer-orders'
  });
  await createInAppNotifications({
    userIds: [order.farmer?.id],
    type: 'order_status_changed',
    title: `Order #${order.id} is ${status}`,
    message: farmerMessage,
    link: '/farmer-orders'
  });

  const recipients = [
    { user: order.buyer, message: buyerMessage },
    { user: order.farmer, message: farmerMessage }
  ];
  await Promise.allSettled(recipients.flatMap(({ user, message }) => [
    sendSms({ recipient: user || {}, message: `AgroFresh: ${message}` }),
    sendActivityEmail({ recipient: user || {}, subject: `AgroFresh order #${order.id} update`, message, link: user?.id === order.buyer?.id ? '/buyer-orders' : '/farmer-orders' })
  ]));
};

export const notifyPaymentCompleted = async (paymentId) => {
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, order_id, amount, reference_id, status, buyer_id, farmer_id')
    .eq('id', paymentId)
    .single();
  if (paymentError) throw paymentError;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, quantity, delivery_info, buyer_id, farmer_id, crop:crops(name, unit, price)')
    .eq('id', payment.order_id)
    .single();
  if (orderError) throw orderError;

  const { data: people, error: peopleError } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .in('id', [payment.buyer_id, payment.farmer_id]);
  if (peopleError) throw peopleError;

  const buyer = people.find((person) => person.id === payment.buyer_id) || {};
  const farmer = people.find((person) => person.id === payment.farmer_id) || {};
  const crop = order.crop;
  const subject = `AgroFresh payment confirmed - Order #${order.id}`;
  const smsMessage = `AgroFresh: Order #${order.id} payment confirmed. ${crop?.name || 'Produce'} x${order.quantity}. Total ${formatMoney(payment.amount)}. Ref ${payment.reference_id}.`;

  const recipients = [buyer, farmer];
  await createInAppNotifications({
    userIds: [buyer.id],
    type: 'payment_completed',
    title: `Your payment for order #${order.id} is confirmed`,
    message: `Your payment of ${formatMoney(payment.amount)} was successful.`,
    link: '/buyer-orders'
  });
  await createInAppNotifications({
    userIds: [farmer.id],
    type: 'payment_completed',
    title: `Payment received for order #${order.id}`,
    message: `Payment of ${formatMoney(payment.amount)} was received for your produce.`,
    link: '/farmer-orders'
  });
  const results = await Promise.allSettled(recipients.flatMap((recipient) => [
    sendEmail({ recipient, subject, receiptHtml: buildReceiptHtml({ order, payment, crop, recipient }), order, payment }),
    sendSms({ recipient, message: smsMessage })
  ]));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[notifications] delivery failed', { channelIndex: index, error: result.reason?.message || result.reason });
    }
  });

  return { recipients: recipients.length, results };
};
