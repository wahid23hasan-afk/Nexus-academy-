// 6-Digit Email OTP Verification Service
export interface SendOtpResponse {
  success: boolean;
  message?: string;
  email?: string;
  expiresIn?: number;
  emailDispatched?: boolean;
  devOtp?: string;
  notice?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  email?: string;
  expired?: boolean;
  attemptsLeft?: number;
  error?: string;
}

export const otpService = {
  // Request server to generate & dispatch a 6-digit OTP to the user's email via Resend
  async sendOtp(email: string, purpose: 'signup' | 'login' | 'reset' = 'signup'): Promise<SendOtpResponse> {
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'ভেরিফিকেশন কোড পাঠাতে সমস্যা হয়েছে।',
        };
      }
      return data;
    } catch (err: any) {
      console.warn('Network error while requesting OTP:', err);
      return {
        success: false,
        error: 'নেটওয়ার্ক সংযোগ ত্রুটি। অনুগ্রহ করে আপনার ইন্টারনেট চেক করুন।',
      };
    }
  },

  // Verify entered 6-digit OTP against server record
  async verifyOtp(email: string, otp: string): Promise<VerifyOtpResponse> {
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          expired: data.expired,
          attemptsLeft: data.attemptsLeft,
          error: data.error || 'ভুল ওটিপি কোড। অনুগ্রহ করে আবার চেষ্টা করুন।',
        };
      }
      return data;
    } catch (err: any) {
      console.warn('Network error while verifying OTP:', err);
      return {
        success: false,
        error: 'ওটিপি যাচাইকরণে নেটওয়ার্ক ত্রুটি ঘটেছে।',
      };
    }
  },

  // Resend fresh OTP
  async resendOtp(email: string, purpose?: string): Promise<SendOtpResponse> {
    try {
      const response = await fetch('/api/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'নতুন কোড পাঠাতে ব্যর্থ হয়েছে।',
        };
      }
      return data;
    } catch (err: any) {
      console.warn('Network error while resending OTP:', err);
      return {
        success: false,
        error: 'নেটওয়ার্ক ত্রুটি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      };
    }
  },
};
