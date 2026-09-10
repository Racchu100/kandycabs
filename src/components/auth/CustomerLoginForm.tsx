'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KandyCabsLogo } from '@/components/ui/KandyCabsLogo';
import { requestMobileOtp, verifyMobileOtp } from '@/lib/otpAuth';
import {
  getCustomerByMobile,
  registerCustomerProfile,
  updateCustomerLastLogin,
  normalizeMobileNumber,
} from '@/lib/customerAccountEngine';
import { getDriverByPhoneOrUsername, addDriverAccount } from '@/lib/driverAccountEngine';

export const CustomerLoginForm: React.FC = () => {
  const router = useRouter();

  // Login Flow Step: 'MOBILE' | 'OTP' | 'PROFILE_NAME'
  const [step, setStep] = useState<'MOBILE' | 'OTP' | 'PROFILE_NAME'>('MOBILE');

  // Input State
  const [mobileInput, setMobileInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Verified Temp User Token & Session
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);

  // UI Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const getPostLoginRedirectPath = (role?: string) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.includes('404') && redirect !== '/account') {
        return redirect;
      }
      const draft = sessionStorage.getItem('kandy_cabs_draft');
      if (draft) return '/booking';
    }
    if (role === 'ADMIN') return '/admin';
    return '/customer/dashboard';
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get('reason');
      const redirect = params.get('redirect');
      if (reason === 'booking' || (redirect && redirect.includes('/booking'))) {
        setInfoMsg('🔒 Customer Sign-In Required: Please verify your mobile OTP to complete your cab booking.');
      }
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const clearFeedback = () => {
    setErrorMsg(null);
    setInfoMsg(null);
  };

  // Step 1: Request OTP
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = normalizeMobileNumber(mobileInput);
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsLoading(true);
    clearFeedback();

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanDigits }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.cooldownRemainingSec) setCooldown(data.cooldownRemainingSec);
        throw new Error(data.error || 'Failed to send OTP');
      }

      setInfoMsg(data.message || `✓ 4-digit OTP sent successfully to +91 ${cleanDigits}.`);
      setStep('OTP');
      setCooldown(30);
    } catch (err: any) {
      const clientRes = requestMobileOtp(cleanDigits);
      if (clientRes.success) {
        setInfoMsg(clientRes.message);
        setStep('OTP');
        setCooldown(30);
      } else {
        setErrorMsg(err.message || clientRes.message || 'OTP request failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = normalizeMobileNumber(mobileInput);
    const cleanOtp = otpInput.trim();

    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMsg('Please enter the 4-digit OTP code sent to your mobile.');
      return;
    }

    setIsLoading(true);
    clearFeedback();

    try {
      let isVerified = false;
      let token = '';
      let isNew = false;
      let existingCustomer = getCustomerByMobile(cleanDigits);

      // Call API or Fallback Engine
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanDigits, otp: cleanOtp }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        isVerified = true;
        token = data.token;
        isNew = data.isNewCustomer;
      } else {
        const clientVerify = verifyMobileOtp(cleanDigits, cleanOtp);
        if (clientVerify.success) {
          isVerified = true;
          token = clientVerify.token || `token_${Date.now()}`;
          isNew = !existingCustomer || !existingCustomer.fullName;
        } else {
          throw new Error(data.error || clientVerify.error || 'Invalid 4-digit OTP code.');
        }
      }

      if (isVerified) {
        setVerifiedToken(token);
        
        // Detect if this phone number belongs to a registered Driver
        let isDriverUser = Boolean(data?.isDriver || data?.user?.isDriver);
        let matchedDriver = data?.driver || data?.user?.driver || getDriverByPhoneOrUsername(cleanDigits);

        if (!matchedDriver) {
          try {
            const driverRes = await fetch(`/api/admin/drivers?phone=${cleanDigits}`);
            if (driverRes.ok) {
              const driverData = await driverRes.json();
              if (driverData.success && driverData.driver) {
                matchedDriver = driverData.driver;
                isDriverUser = true;
              }
            }
          } catch {}
        }

        if (matchedDriver) {
          isDriverUser = true;
          try {
            addDriverAccount({
              fullName: matchedDriver.fullName || matchedDriver.name || 'Driver',
              phone: cleanDigits,
              username: matchedDriver.username || (matchedDriver.fullName ? matchedDriver.fullName.toLowerCase().replace(/\s+/g, '') : `driver_${cleanDigits}`),
              vehicleRegistration: matchedDriver.vehicleRegistration || 'KA 19 C 4829',
              licenseNumber: matchedDriver.licenseNumber || `KA19-LIC-${cleanDigits}`,
              vendorAgencyName: matchedDriver.vendorAgencyName || 'Sri Durga Travels & Cab Service',
              status: 'ACTIVE',
              verificationStatus: 'APPROVED',
            });
            localStorage.setItem('kc_driver_token', token);
            localStorage.setItem('kc_driver_user', JSON.stringify(matchedDriver));
          } catch {}
        }

        // Check if returning customer with profile from local storage, API user data, or booking history
        let activeName = (matchedDriver?.fullName || existingCustomer?.fullName || data?.user?.fullName || '').trim();

        if (!activeName) {
          try {
            const profileRes = await fetch(`/api/customer/profile?phone=${cleanDigits}`);
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData.success && profileData.customer?.fullName) {
                activeName = profileData.customer.fullName.trim();
              }
            }
          } catch {}
        }

        if (activeName && activeName.length >= 2) {
          // Returning user -> Login immediately without asking for name again!
          if (!existingCustomer) {
            registerCustomerProfile(cleanDigits, activeName);
          } else {
            updateCustomerLastLogin(cleanDigits);
          }
          completeLoginSession(token, {
            id: existingCustomer?.id || data?.user?.id || `user_${cleanDigits}`,
            customerId: existingCustomer?.customerId || data?.user?.customerId || `cust_${cleanDigits}`,
            phone: cleanDigits,
            fullName: activeName,
            role: isDriverUser ? 'DRIVER' : 'CUSTOMER',
            isDriver: isDriverUser,
            driver: matchedDriver,
          });
        } else {
          // New customer -> Show "Complete Your Profile"
          setStep('PROFILE_NAME');
          setInfoMsg('✓ Mobile number verified successfully! Please enter your full name to complete your profile.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Complete Profile (New Customer Name Entry)
  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullNameInput || fullNameInput.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanDigits = normalizeMobileNumber(mobileInput);
    const cleanName = fullNameInput.trim();

    setIsLoading(true);
    setErrorMsg(null);

    // Save locally
    const regRes = registerCustomerProfile(cleanDigits, cleanName);

    // Persist to Supabase PostgreSQL Database via API for cross-device support
    try {
      await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits, fullName: cleanName }),
      });
    } catch {}

    const token = verifiedToken || `token_${Date.now()}`;
    const matchedDriver = getDriverByPhoneOrUsername(cleanDigits);
    completeLoginSession(token, {
      id: regRes.customer.id || `user_${cleanDigits}`,
      customerId: regRes.customer.customerId || `cust_${cleanDigits}`,
      phone: cleanDigits,
      fullName: cleanName,
      role: matchedDriver ? 'DRIVER' : 'CUSTOMER',
      isDriver: Boolean(matchedDriver),
      driver: matchedDriver,
    });
    setIsLoading(false);
  };

  // Complete Login Session & Redirect
  const completeLoginSession = (token: string, userData: any) => {
    localStorage.setItem('kc_token', token);
    localStorage.setItem('kc_user', JSON.stringify(userData));

    let matchedDriver = userData?.driver || (userData?.phone ? getDriverByPhoneOrUsername(userData.phone) : null);
    if (matchedDriver) {
      localStorage.setItem('kc_driver_token', token);
      localStorage.setItem('kc_driver_user', JSON.stringify(matchedDriver));
    }

    if (userData?.role === 'ADMIN' || userData?.phone === '9481086058') {
      localStorage.setItem('kc_admin_token', token);
      localStorage.setItem('kc_admin_user', JSON.stringify({
        id: userData.id || 'admin_super',
        name: userData.fullName || 'Super Admin (9481086058)',
        username: 'kandycabs',
        role: 'ADMIN',
      }));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth_change'));
    }
    const effectiveRole = (userData?.role === 'ADMIN' || userData?.phone === '9481086058')
      ? 'ADMIN'
      : (matchedDriver || userData?.isDriver || userData?.role === 'DRIVER')
      ? 'DRIVER'
      : 'CUSTOMER';

    const targetPath = getPostLoginRedirectPath(effectiveRole);
    router.push(targetPath);
  };

  const formattedMobile = normalizeMobileNumber(mobileInput);

  return (
    <Card padded style={{ maxWidth: '440px', margin: '40px auto', background: '#fff', boxShadow: 'var(--sh-m)', borderRadius: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '22px' }}>
        <div style={{ margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}>
          <KandyCabsLogo width={180} height={52} variant="light" />
        </div>
        <h2 className="h2" style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 800 }}>
          {step === 'PROFILE_NAME' ? 'Welcome to KANDY CABS' : 'KANDY CABS'}
        </h2>
        <p className="muted" style={{ fontSize: '13.5px', marginTop: '4px', lineHeight: 1.5, fontWeight: 500 }}>
          {step === 'PROFILE_NAME'
            ? "Let's create your profile"
            : 'Book your ride with ease'}
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#991B1B',
            padding: '10px 14px',
            borderRadius: 'var(--r-m)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠️</span> <div>{errorMsg}</div>
        </div>
      )}

      {/* Info Banner */}
      {infoMsg && (
        <div
          style={{
            background: 'var(--green-soft)',
            color: 'var(--green)',
            padding: '10px 14px',
            borderRadius: 'var(--r-m)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span> <div>{infoMsg}</div>
        </div>
      )}

      {/* STEP 1: MOBILE NUMBER ENTRY */}
      {step === 'MOBILE' && (
        <form onSubmit={handleSendOtpSubmit}>
          <div className="fld">
            <label htmlFor="mobile-input">Mobile Number</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div
                style={{
                  background: 'var(--bg-soft)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--r-m)',
                  padding: '10px 12px',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--ink)',
                }}
              >
                +91
              </div>
              <input
                id="mobile-input"
                type="tel"
                placeholder="XXXXX XXXXX"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                required
                maxLength={10}
                style={{ flex: 1, fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '22px' }}>
            <Button
              type="submit"
              variant="accent"
              fullWidth
              disabled={isLoading || normalizeMobileNumber(mobileInput).length < 10}
              style={{ fontWeight: 800, padding: '12px', fontSize: '15px' }}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
            🔒 Mobile OTP only — No password required
          </div>
        </form>
      )}

      {/* STEP 2: OTP VERIFICATION */}
      {step === 'OTP' && (
        <form onSubmit={handleVerifyOtpSubmit}>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
            Enter the 4-digit OTP sent to <b>+91 {formattedMobile}</b>
            <button
              type="button"
              onClick={() => {
                setStep('MOBILE');
                clearFeedback();
              }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', marginLeft: '6px', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
            >
              Change Number
            </button>
          </div>

          <div className="fld">
            <input
              id="otp-input"
              type="text"
              placeholder="_ _ _ _"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              required
              maxLength={4}
              style={{ fontSize: '26px', letterSpacing: '10px', textAlign: 'center', fontWeight: 800, padding: '12px' }}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <Button type="submit" variant="accent" fullWidth disabled={isLoading || otpInput.trim().length < 4} style={{ fontWeight: 800, padding: '12px', fontSize: '15px' }}>
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={(e) => handleSendOtpSubmit(e)}
              disabled={cooldown > 0 || isLoading}
              style={{
                background: 'none',
                border: 'none',
                color: cooldown > 0 ? 'var(--muted)' : 'var(--accent)',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Test OTP: <code>4829</code></span>
          </div>
        </form>
      )}

      {/* STEP 3: FIRST-TIME CUSTOMER PROFILE CREATION */}
      {step === 'PROFILE_NAME' && (
        <form onSubmit={handleCompleteProfileSubmit}>
          <div className="fld">
            <label htmlFor="verified-mobile">Verified Mobile Number</label>
            <input
              id="verified-mobile"
              type="text"
              value={`+91 ${formattedMobile}`}
              disabled
              style={{ background: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: '15px', cursor: 'not-allowed' }}
            />
          </div>

          <div className="fld" style={{ marginTop: '16px' }}>
            <label htmlFor="fullname-input">Full Name</label>
            <input
              id="fullname-input"
              type="text"
              placeholder="Enter your full name"
              value={fullNameInput}
              onChange={(e) => setFullNameInput(e.target.value)}
              required
              style={{ fontSize: '15px', fontWeight: 600 }}
            />
          </div>

          <div style={{ marginTop: '22px' }}>
            <Button type="submit" variant="accent" fullWidth disabled={isLoading || fullNameInput.trim().length < 2} style={{ fontWeight: 800, padding: '12px', fontSize: '15px' }}>
              Continue ➔
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};
