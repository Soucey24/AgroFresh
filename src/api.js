const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '');

export async function getNotifications() {
  const res = await fetch(`${API_BASE}/api/notifications`, { credentials: 'include' });
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
    method: 'PATCH',
    credentials: 'include'
  });
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
    method: 'PATCH',
    credentials: 'include'
  });
  return res.json();
}

export async function getUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { credentials: 'include' });
  return res.json();
}

export async function getProfile() {
  console.log('[auth] getProfile start', { apiBase: API_BASE, url: `${API_BASE}/api/users/profile/me` });

  const res = await fetch(`${API_BASE}/api/users/profile/me`, { credentials: 'include' });
  const text = await res.text();

  console.log('[auth] getProfile response', {
    status: res.status,
    ok: res.ok,
    contentType: res.headers.get('content-type'),
    bodyPreview: text.slice(0, 500)
  });

  if (!text) {
    console.log('[auth] getProfile empty response');
    return {};
  }

  try {
    const data = JSON.parse(text);
    console.log('[auth] getProfile parsed', data);
    return data;
  } catch (error) {
    console.error('[auth] getProfile parse error', error, text);
    return { error: 'Invalid profile response' };
  }
}

export async function logout() {
  await fetch(`${API_BASE}/api/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function verifyLoginOtp(otpCode) {
  const res = await fetch(`${API_BASE}/api/auth/login/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ otpCode }),
  });
  return res.json();
}

export async function register({ name, first_name, surname, other_names, email, password, userType, location, digital_address, phone }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, first_name, surname, other_names, email, password, role: userType, location, digital_address, phone }),
  });
  return res.json();
}

export async function verifyRegistrationOtp(otpCode) {
  const res = await fetch(`${API_BASE}/api/auth/register/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ otpCode }),
  });
  return res.json();
}

export async function resendRegistrationOtp() {
  const res = await fetch(`${API_BASE}/api/auth/register/resend-otp`, { method: 'POST', credentials: 'include' });
  return res.json();
}

export async function resendLoginOtp(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/api/auth/password-reset/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email }) });
  return res.json();
}

export async function resetPassword(otpCode, newPassword) {
  const res = await fetch(`${API_BASE}/api/auth/password-reset/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ otpCode, newPassword }) });
  return res.json();
}

export async function sendOtp(phone, userId = null) {
  const res = await fetch(`${API_BASE}/api/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, userId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send OTP');
  }
  return data;
}

export async function resendOtp(phone, userId = null) {
  const res = await fetch(`${API_BASE}/api/otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, userId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to resend OTP');
  }
  return data;
}

export async function verifyOtp(phone, otpCode) {
  const res = await fetch(`${API_BASE}/api/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, otpCode }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify OTP');
  }
  return data;
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

export async function getMlCropTypes() {
  const res = await fetch(`${API_BASE}/api/crops/ml/crop-types`, {
    credentials: 'include',
  });
  return res.json();
}

export async function predictHarvestForCrop(cropId, payload = {}) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/predict-harvest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function analyzeCropQuality(cropId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${API_BASE}/api/crops/${cropId}/analyze-quality`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return res.json();
}

export async function getCropPredictions(cropId) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/predictions`, {
    credentials: 'include',
  });
  return res.json();
}

// Reviews / Ratings APIs
export async function getReviewsForCrop(cropId) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/reviews`, { credentials: 'include' });
  return res.json();
}

export async function createReview(cropId, { rating, comment }) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ rating, comment }),
  });
  return res.json();
}

export async function createComplaint(complaint) {
  const res = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(complaint),
  });
  return res.json();
}

export async function calculateCropFreshness(cropId, harvestDate, storageCondition = 'room_temp', qualityScore = 85) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/calculate-freshness`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      harvest_date: harvestDate,
      storage_condition: storageCondition,
      quality_score: qualityScore
    }),
  });
  return res.json();
}

export async function forecastCropPrice(cropId, qualityScore = 85, freshnessStatus = 'good', daysAhead = 0) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/forecast-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      quality_score: qualityScore,
      freshness_status: freshnessStatus,
      days_ahead: daysAhead
    }),
  });
  return res.json();
}

export async function recommendCropSellingTime(cropId, qualityScore = 85, freshnessStatus = 'good') {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/recommend-selling-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      quality_score: qualityScore,
      freshness_status: freshnessStatus
    }),
  });
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

export async function transitionOrderStatus(id, status) {
  return updateOrder(id, { status });
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

export async function getPayouts() {
  const res = await fetch(`${API_BASE}/api/payouts`, { credentials: 'include' });
  return res.json();
}

export async function updatePayout(id, data) {
  const res = await fetch(`${API_BASE}/api/payouts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
  return res.json();
}

// Quality Check APIs
export async function analyzeQuality(orderId, cropId, imageBase64) {
  const res = await fetch(`${API_BASE}/api/quality-checks/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      order_id: orderId,
      crop_id: cropId,
      file_base64: imageBase64
    })
  });
  return res.json();
}

export async function completeQualityCheck(checkId, orderId, decision, data) {
  const res = await fetch(`${API_BASE}/api/quality-checks/${checkId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      order_id: orderId,
      decision,
      ...data
    })
  });
  return res.json();
}

export async function getQualityCheck(checkId) {
  const res = await fetch(`${API_BASE}/api/quality-checks/${checkId}`, {
    credentials: 'include'
  });
  return res.json();
}

export async function listQualityChecks(orderId) {
  const url = new URL(`${API_BASE || window.location.origin}/api/quality-checks`);
  if (orderId) url.searchParams.append('order_id', orderId);
  const res = await fetch(url, { credentials: 'include' });
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

export async function verifyPaystackPayment(reference) {
  const res = await fetch(`${API_BASE}/api/payments/verify/${encodeURIComponent(reference)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

export async function getPendingFarmerVerifications() {
  const res = await fetch(`${API_BASE}/api/admin/verifications/pending`, {
    credentials: 'include',
  });
  return res.json();
}

export async function approveFarmerVerification(verificationId) {
  const res = await fetch(`${API_BASE}/api/admin/verifications/${verificationId}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  return res.json();
}

export async function rejectFarmerVerification(verificationId) {
  const res = await fetch(`${API_BASE}/api/admin/verifications/${verificationId}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  return res.json();
}

// Verification APIs (new endpoints)
export async function getVerificationStats() {
  const res = await fetch(`${API_BASE}/api/verification/stats`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch verification stats');
  return res.json();
}

export async function getUnverifiedUsers(role = 'operations') {
  const res = await fetch(`${API_BASE}/api/verification/unverified?role=${role}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch unverified users');
  return res.json();
}

export async function getUserVerification(userId) {
  const res = await fetch(`${API_BASE}/api/verification/user/${userId}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch user verification');
  return res.json();
}

export async function approveUserVerification(userId) {
  const res = await fetch(`${API_BASE}/api/verification/verify/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to approve verification');
  return res.json();
}

export async function rejectUserVerification(userId, rejectionReason) {
  const res = await fetch(`${API_BASE}/api/verification/reject/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: rejectionReason }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to reject verification');
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

export async function reviewCropListing(cropId, status, reviewNotes = '') {
  const res = await fetch(`${API_BASE}/api/admin/crops/${cropId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status, review_notes: reviewNotes }),
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