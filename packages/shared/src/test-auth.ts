import {
  normalizePhoneNumber,
  isValidIndianPhoneNumber,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  signAuthToken,
  verifyAuthToken,
  UserRole,
  canAccessDriverApp,
  canAccessAdmin,
  canAccessCustomerBooking,
  UserProfile,
  DriverVerificationStatus,
} from './index';

async function runAuthTests() {
  console.log('🧪 Starting Auth & JWT Unit Tests...');

  // 1. Phone number normalization & validation
  console.log('1. Testing Phone Helpers...');
  const testPhone = '9876543210';
  if (!isValidIndianPhoneNumber(testPhone)) throw new Error('Valid phone test failed');
  if (isValidIndianPhoneNumber('12345')) throw new Error('Invalid phone test failed');
  const normalized = normalizePhoneNumber(testPhone);
  if (normalized !== '+919876543210') throw new Error(`Normalization failed: ${normalized}`);
  console.log('   ✅ Phone helpers passed');

  // 2. OTP generation, hashing, and verification
  console.log('2. Testing OTP Generation & Hashing...');
  const otp = generateOtp(4);
  if (otp.length !== 4) throw new Error(`OTP length invalid: ${otp}`);
  const hash = await hashOtp(otp);
  const isValid = await verifyOtpHash(otp, hash);
  if (!isValid) throw new Error('OTP verification against hash failed');
  const isInvalid = await verifyOtpHash('0000', hash);
  if (isInvalid && otp !== '0000') throw new Error('Invalid OTP should not match');
  console.log('   ✅ OTP hashing and verification passed');

  // 3. JWT Signing and Verification
  console.log('3. Testing JWT Token Signing & Verification...');
  const payload = {
    userId: 'usr_test_123',
    phone: '+919876543210',
    roles: [UserRole.CUSTOMER, UserRole.DRIVER],
    customerId: 'cust_123',
    driverId: 'drv_123',
  };
  const token = await signAuthToken(payload);
  const verified = await verifyAuthToken(token);
  if (!verified || verified.userId !== payload.userId || verified.phone !== payload.phone) {
    throw new Error('JWT verification failed');
  }
  console.log('   ✅ JWT signing and verification passed');

  // 4. Role Guards
  console.log('4. Testing Role Guards...');
  const customerUser: UserProfile = {
    id: 'u1',
    phone: '+919876543210',
    fullName: 'Customer Test',
    roles: [UserRole.CUSTOMER],
    createdAt: new Date(),
  };

  const approvedDriverUser: UserProfile = {
    id: 'u2',
    phone: '+919876543211',
    fullName: 'Driver Test',
    roles: [UserRole.DRIVER],
    createdAt: new Date(),
    driver: {
      id: 'd1',
      licenseNumber: 'DL123',
      verificationStatus: DriverVerificationStatus.APPROVED,
      onlineStatus: true,
    },
  };

  const pendingDriverUser: UserProfile = {
    id: 'u3',
    phone: '+919876543212',
    fullName: 'Driver Pending',
    roles: [UserRole.DRIVER],
    createdAt: new Date(),
    driver: {
      id: 'd2',
      licenseNumber: 'DL456',
      verificationStatus: DriverVerificationStatus.PENDING,
      onlineStatus: false,
    },
  };

  const adminUser: UserProfile = {
    id: 'u4',
    phone: '+919876543213',
    fullName: 'Admin Test',
    roles: [UserRole.ADMIN],
    createdAt: new Date(),
  };

  if (canAccessAdmin(customerUser)) throw new Error('Customer should not access admin');
  if (!canAccessAdmin(adminUser)) throw new Error('Admin should access admin');

  if (!canAccessDriverApp(approvedDriverUser)) throw new Error('Approved driver should access driver app');
  if (canAccessDriverApp(pendingDriverUser)) throw new Error('Pending driver should not access driver app');
  if (canAccessDriverApp(customerUser)) throw new Error('Customer should not access driver app');

  if (!canAccessCustomerBooking(customerUser, true)) throw new Error('Customer should access booking');
  if (!canAccessCustomerBooking(null, false)) throw new Error('Guest should access pre-auth booking');
  if (canAccessCustomerBooking(null, true)) throw new Error('Guest should not access authenticated checkout without auth');

  console.log('   ✅ Role guards passed');

  console.log('🎉 All Auth & JWT unit tests passed successfully!');
}

runAuthTests().catch((e) => {
  console.error('❌ Tests failed:', e);
  process.exit(1);
});
