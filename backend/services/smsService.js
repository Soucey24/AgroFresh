import axios from 'axios';

// ARkesel SMS Service
const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || '';
const ARKESEL_ENDPOINT = 'https://sms.arkesel.com/api/v2/sms/send';
const SENDER_ID = process.env.ARKESEL_SENDER || process.env.SMS_SENDER_ID || 'AgroFresh';

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

    let normalizedPhone = String(phone || '').trim();
    if (!normalizedPhone) {
      return { success: false, error: 'Phone number is missing' };
    }

    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '233' + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith('+233')) {
      normalizedPhone = normalizedPhone.replace('+', '');
    } else if (!normalizedPhone.startsWith('233')) {
      normalizedPhone = '233' + normalizedPhone;
    }

    const response = await axios.post(ARKESEL_ENDPOINT, {
      sender: SENDER_ID,
      message,
      recipients: [normalizedPhone],
    }, {
      headers: {
        'api-key': ARKESEL_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return {
      success: true,
      messageId: response.data?.data?.[0]?.message_id || response.data?.message_id,
      phone: normalizedPhone,
    };
  } catch (error) {
    const detail = error.response?.data || error.message;
    const messageText = typeof detail === 'string' ? detail : JSON.stringify(detail);
    console.error('Failed to send SMS:', messageText);
    return {
      success: false,
      error: messageText,
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
