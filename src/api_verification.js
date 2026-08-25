const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '');

export async function createFarmerVerification(userId, formData) {
  if (!userId) {
    return { error: 'Missing user id' };
  }
  const res = await fetch(`${API_BASE}/api/users/${userId}/verification`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  let body = {};
  try {
    body = await res.json();
  } catch (err) {
    // Non-JSON response
    body = { error: `Server returned status ${res.status}` };
  }

  if (!res.ok) {
    return { error: body.error || `Request failed (${res.status})`, status: res.status, raw: body };
  }

  return body;
}

export async function startDiditVerification(userId) {
  const res = await fetch(`${API_BASE}/api/users/${userId}/didit-session`, { method: 'POST', credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  return res.ok ? body : { error: body.error || `Request failed (${res.status})` };
}

export default { createFarmerVerification };
