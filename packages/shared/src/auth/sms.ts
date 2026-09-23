export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an OTP SMS via configured SMS gateway or logs to console in development
 */
export async function sendOtpSms(
  phone: string,
  otp: string
): Promise<SmsSendResult> {
  const apiKey = process.env.SMS_PROVIDER_API_KEY;
  const isDev = process.env.NODE_ENV !== 'production';

  // In development or when using placeholder key, log the OTP for testing
  if (!apiKey || apiKey.startsWith('sms_') || apiKey === 'sms_api_key_placeholder' || isDev) {
    console.log(`\x1b[33m[SMS DISPATCH - DEV]\x1b[0m Sending OTP ${otp} to ${phone}`);
    return {
      success: true,
      messageId: `dev-sms-${Date.now()}`,
    };
  }

  try {
    // Production SMS gateway integration (e.g. Fast2SMS / MSG91 / Twilio)
    // Custom integration hook:
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: phone.replace(/^\+91/, ''),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMS Gateway Error:', errorText);
      return { success: false, error: errorText };
    }

    const data = (await response.json()) as any;
    return {
      success: data.return === true || data.status_code === 200,
      messageId: data.request_id || `${Date.now()}`,
    };
  } catch (err: any) {
    console.error('Failed to send SMS OTP:', err);
    return {
      success: false,
      error: err.message || 'SMS service unavailable',
    };
  }
}
