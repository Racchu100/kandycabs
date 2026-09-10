import {
  getAllDriverAccounts,
  addDriverAccount,
  updateDriverVerificationData,
  updateDriverVerificationStatus,
  getDriverByPhoneOrUsername,
} from '../src/lib/driverAccountEngine';

function runDriverOnboardingVerificationTests() {
  console.log('--- Running Driver Onboarding & Verification Unit Tests ---');

  // Test 1: Register new driver and verify default verificationStatus is PENDING_VERIFICATION
  const newDriver = addDriverAccount({
    fullName: 'Test Driver Onboarding',
    phone: '9988776655',
    username: 'testdriveronboarding',
    password: 'password123',
    vehicleRegistration: 'KA 19 EV 9999',
    vehicleModel: 'Tata Tigor EV',
    licenseNumber: 'KA19-2026-99999',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
  });

  if (newDriver.verificationStatus !== 'PENDING_VERIFICATION') {
    throw new Error(`Expected new driver status 'PENDING_VERIFICATION', got '${newDriver.verificationStatus}'`);
  }
  console.log('✓ New driver account registered with PENDING_VERIFICATION status');

  // Test 2: Update verification documents & vehicle photos
  const docsRes = updateDriverVerificationData(
    newDriver.id,
    {
      licenseUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/test/documents/license.webp',
      rcUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/test/documents/rc.webp',
      insuranceUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/test/documents/insurance.webp',
    },
    {
      frontUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/test/vehicle/front.webp',
      interiorUrl: 'https://xgpfxtpwyavtgvycwrqu.supabase.co/storage/v1/object/public/cab-photos/driver/test/vehicle/interior.webp',
    }
  );

  if (!docsRes.success || !docsRes.driver) {
    throw new Error('Failed to update driver verification data');
  }

  if (!docsRes.driver.documents?.licenseUrl || !docsRes.driver.vehiclePhotos?.frontUrl) {
    throw new Error('Verification documents/photos failed to attach');
  }
  console.log('✓ Driver onboarding documents & vehicle photos attached and persisted');

  // Test 3: Admin Approval
  const approveRes = updateDriverVerificationStatus(newDriver.id, 'APPROVED');
  if (!approveRes.success || approveRes.driver?.verificationStatus !== 'APPROVED') {
    throw new Error('Admin driver approval failed');
  }
  console.log('✓ Admin driver verification approval verified: status updated to APPROVED');

  // Test 4: Verify lookup reflects APPROVED status
  const fetched = getDriverByPhoneOrUsername('9988776655');
  if (fetched?.verificationStatus !== 'APPROVED') {
    throw new Error('Driver lookup failed to reflect APPROVED status');
  }
  console.log('✓ Driver lookup verified APPROVED status');

  console.log('🎉 ALL DRIVER ONBOARDING VERIFICATION UNIT TESTS PASSED!');
}

runDriverOnboardingVerificationTests();
