import axios from 'axios';

// ARkesel SMS Service
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || '';
const ARKESEL_BASE_URL = 'https://sms.arkesel.com/api';
const SENDER_ID = process.env.SMS_SENDER_ID || 'AgroFresh';

/**
 * Send SMS via ARkesel
 * @param {string} phone - Recipient phone number (Ghana format or international)
 * @param {string} message - SMS message content
 * @returns {Promise<object>} Response from ARkesel API
 */
export const sendSMS = async (phone, message) => {
  try {
    if (!ARKESEL_API_KEY) {
      console.warn('ARkesel API key not configured. SMS not sent.');
      return { success: false, error: 'SMS service not configured' };
    }

    // Normalize phone number to international format
    let normalizedPhone = String(phone || '').trim();
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '233' + normalizedPhone.slice(1);
    } else if (!normalizedPhone.startsWith('233')) {
      normalizedPhone = '233' + normalizedPhone;
    }

    const response = await axios.post(`${ARKESEL_BASE_URL}/send`, {
      api_key: ARKESEL_API_KEY,
      senders_name: SENDER_ID,
      message,
      recipients: [normalizedPhone],
    }, { timeout: 10000 });

    return {
      success: true,
      messageId: response.data?.message_ids?.[0],
      phone: normalizedPhone,
    };
  } catch (error) {
    console.error('Failed to send SMS:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send operations staff credentials via SMS
 */
export const sendOperationsCredentials = async (phone, email, password, loginUrl = 'http://localhost:8080/login') => {
  const message = `Welcome to AgroFresh!\n\nYour operations account credentials:\nEmail: ${email}\nPassword: ${password}\n\nLogin here: ${loginUrl}\n\nAfter login, change your password and complete verification by uploading your documents.`;
  
  return sendSMS(phone, message);
};

/**
 * Send OTP for verification
 */
export const sendOTP = async (phone, otp, expiryMinutes = 10) => {
  const message = `Your AgroFresh verification OTP is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes.\n\nDo not share this code with anyone.`;
  
  return sendSMS(phone, message);
};

/**
 * Send verification status notification
 */
export const sendVerificationStatus = async (phone, status, message = '') => {
  let statusMessage = '';
  
  if (status === 'approved') {
    statusMessage = `Great news! Your verification is approved. You can now access the full operations dashboard.`;
  } else if (status === 'rejected') {
    statusMessage = `Your verification was not approved. ${message ? `Reason: ${message}` : 'Please re-upload your documents and try again.'}`;
  } else if (status === 'pending') {
    statusMessage = `Your verification is pending review. We'll send you a notification once reviewed.`;
  }
  
  const fullMessage = `AgroFresh Verification Update\n\n${statusMessage}`;
  
  return sendSMS(phone, fullMessage);
};
