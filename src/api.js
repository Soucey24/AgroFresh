const API_BASE = import.meta.env.VITE_API_URL || '';

export async function getUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { credentials: 'include' });
  return res.json();
}

export async function getProfile() {
  const res = await fetch(`${API_BASE}/api/users/profile/me`, { credentials: 'include' });
  return res.json();
}

export async function logout() {
  await fetch(`${API_BASE}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function login(email, password, role) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, role }),
  });
  return res.json();
}

export async function register({ name, email, password, userType, location }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password, role: userType, location }),
  });
  return res.json();
}

// Crop APIs
export async function listCrops() {
  const res = await fetch(`${API_BASE}/api/crops`, { credentials: 'include' });
  return res.json();
}

export async function createCrop(crop) {
  const res = await fetch(`${API_BASE}/api/crops`, {
    method: 'POST',
    credentials: 'include',
    body: crop,
  });
  return res.json();
}

export async function deleteCrop(id) {
  const res = await fetch(`${API_BASE}/api/crops/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function updateCrop(id, crop) {
  const isFormData = crop instanceof FormData;
  const res = await fetch(`${API_BASE}/api/crops/${id}`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: isFormData ? crop : JSON.stringify(crop),
  });
  return res.json();
}

export async function getCrops() {
  const res = await fetch(`${API_BASE}/api/crops`, { credentials: 'include' });
  return res.json();
}

export async function getCrop(id) {
  const res = await fetch(`${API_BASE}/api/crops/${id}`, { credentials: 'include' });
  return res.json();
}

// Order APIs
export async function createOrder(order) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(order),
  });
  return res.json();
}

export async function updateOrder(id, order) {
  const res = await fetch(`${API_BASE}/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(order),
  });
  return res.json();
}

export async function deleteOrder(id) {
  const res = await fetch(`${API_BASE}/api/orders/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function getOrders() {
  const res = await fetch(`${API_BASE}/api/orders`, { credentials: 'include' });
  return res.json();
}

export async function listOrders() {
  const res = await fetch(`${API_BASE}/api/orders`, { credentials: 'include' });
  return res.json();
}

export async function updateOrderTracking(id, tracking) {
  const res = await fetch(`${API_BASE}/api/orders/${id}/tracking`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(tracking),
  });
  return res.json();
}

export async function getOrderTracking(id) {
  const res = await fetch(`${API_BASE}/api/orders/${id}/tracking`, {
    credentials: 'include'
  });
  return res.json();
}

// Admin User Management APIs
export async function listUsers() {
  const res = await fetch(`${API_BASE}/api/users`, { credentials: 'include' });
  return res.json();
}

export async function createUser(user) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function updateUser(id, user) {
  const isFormData = user instanceof FormData;
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: isFormData ? user : JSON.stringify(user),
  });
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function getSalesReport() {
  const res = await fetch(`${API_BASE}/api/orders/sales-report`, { credentials: 'include' });
  return res.json();
}

export async function requestPayout({ order_id, amount }) {
  const res = await fetch(`${API_BASE}/api/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ order_id, amount }),
  });
  return res.json();
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_BASE}/api/users/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return res.json();
}

export async function updateProfile(userData) {
  const isFormData = userData instanceof FormData;
  const res = await fetch(`${API_BASE}/api/users/profile/update`, {
    method: 'PUT',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: isFormData ? userData : JSON.stringify(userData),
  });
  return res.json();
}

export async function createPayment(paymentData) {
  const res = await fetch(`${API_BASE}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(paymentData),
  });
  return res.json();
}

export async function getPaymentStatus(paymentId) {
  const res = await fetch(`${API_BASE}/api/payments/${paymentId}/status`, {
    credentials: 'include',
  });
  return res.json();
}

export async function simulatePaymentCompletion(paymentId, status = 'completed') {
  const res = await fetch(`${API_BASE}/api/payments/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ payment_id: paymentId, status }),
  });
  return res.json();
}

export async function getPaymentHistory(page = 1, limit = 10, status = null) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) params.append('status', status);
  
  const res = await fetch(`${API_BASE}/api/payments/history?${params}`, {
    credentials: 'include',
  });
  return res.json();
}

export async function cancelPayment(paymentId) {
  const res = await fetch(`${API_BASE}/api/payments/${paymentId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

// Admin Dashboard APIs
export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/api/admin/dashboard/stats`, {
    credentials: 'include',
  });
  return res.json();
}

export async function getRecentActivity() {
  const res = await fetch(`${API_BASE}/api/admin/dashboard/activity`, {
    credentials: 'include',
  });
  return res.json();
}

// Admin Payment APIs
export async function getPaymentStats() {
  const res = await fetch(`${API_BASE}/api/admin/payments/stats`, {
    credentials: 'include',
  });
  return res.json();
}

export async function getAdminPayments(page = 1, limit = 100) {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  
  const res = await fetch(`${API_BASE}/api/admin/payments?${params}`, {
    credentials: 'include',
  });
  return res.json();
}

// Admin Order APIs
export async function getAdminOrders() {
  const res = await fetch(`${API_BASE}/api/admin/orders`, {
    credentials: 'include',
  });
  return res.json();
}

export async function getOrderStats() {
  const res = await fetch(`${API_BASE}/api/admin/orders/stats`, {
    credentials: 'include',
  });
  return res.json();
}

// Admin Crop APIs
export async function getAdminCrops() {
  const res = await fetch(`${API_BASE}/api/admin/crops`, {
    credentials: 'include',
  });
  return res.json();
}

export async function getCropStats() {
  const res = await fetch(`${API_BASE}/api/admin/crops/stats`, {
    credentials: 'include',
  });
  return res.json();
}

// Admin Settings APIs
export async function getAdminSettings() {
  const res = await fetch(`${API_BASE}/api/admin/settings`, {
    credentials: 'include',
  });
  return res.json();
}

export async function updateAdminSettings(settings) {
  const res = await fetch(`${API_BASE}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings),
  });
  return res.json();
} 

export async function bulkUpdateCropAvailability(cropIds, available) {
  const res = await fetch(`${API_BASE}/api/crops/bulk-update-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cropIds, available }),
  });
  return res.json();
} 