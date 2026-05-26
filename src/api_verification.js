const API_BASE = import.meta.env.VITE_API_URL || '';

export async function createFarmerVerification(userId, formData) {
  if (!userId) {
    return { error: 'Missing user id' };
  }
  const res = await fetch(`${API_BASE}/api/users/${userId}/verification`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return res.json();
}

export default { createFarmerVerification };
