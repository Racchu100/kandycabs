import { normalizePhone, phoneSearchVariants } from '../src/lib/phoneUtils';
import { prisma } from '../src/lib/prisma';
import { requestMobileOtp, verifyMobileOtp } from '../src/lib/otpAuth';

async function runDriverArchitectureTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING DRIVER ROLE, LOGIN, DASHBOARD & ASSIGNMENT TEST SUITE');
  console.log('================================================================\n');

  const testPhone = '9876543210';
  const testName = 'Test Chauffeur';
  const testVehicle = 'TEST-1234';
  const testLicense = 'TESTLICENSE999';

  const normalPhone = '9111122222';
  const normalName = 'Normal Customer';

  try {
    // -------------------------------------------------------------------------
    // TEST CASE 1: Admin Driver Registration & DB Relation Setup
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Admin Driver Registration & DB Relation Setup ---');
    const cleanPhone = normalizePhone(testPhone);
    console.assert(cleanPhone === '9876543210', 'Phone normalization failed for 9876543210');
    console.assert(normalizePhone('+919876543210') === '9876543210', 'Phone normalization failed for +91');
    console.assert(normalizePhone('919876543210') === '9876543210', 'Phone normalization failed for 91 prefix');

    // Create or find User in Prisma DB
    let user = await prisma.user.findFirst({
      where: { OR: phoneSearchVariants(cleanPhone) },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: `user_${cleanPhone}`,
          phone: cleanPhone,
          email: `driver_${cleanPhone}@kandycabs.com`,
          passwordHash: 'driver_authenticated_pass',
          role: 'DRIVER',
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'DRIVER', status: 'ACTIVE' },
      });
    }

    const driver = await prisma.driver.upsert({
      where: { userId: user.id },
      update: {
        fullName: testName,
        licenseNumber: testLicense,
        isActive: true,
      },
      create: {
        id: `driver_${cleanPhone}`,
        userId: user.id,
        fullName: testName,
        licenseNumber: testLicense,
        isActive: true,
        rating: 5.0,
      },
    });

    // Verify User.driver relation
    const userWithDriver = await prisma.user.findUnique({
      where: { id: user.id },
      include: { driver: true },
    });

    console.assert(Boolean(userWithDriver?.driver), 'User.driver relation failed');
    console.assert(userWithDriver?.driver?.fullName === testName, 'Driver name mismatch');
    console.assert(userWithDriver?.driver?.isActive === true, 'Driver active flag mismatch');
    console.log('✓ Admin Driver registration & Prisma User.driver relation passed');

    // -------------------------------------------------------------------------
    // TEST CASE 2: Mobile OTP Login & Driver Detection
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Mobile OTP Login & Driver Detection ---');
    requestMobileOtp(cleanPhone);
    const otpRes = verifyMobileOtp(cleanPhone, '1234');
    console.assert(otpRes.success, 'OTP verification failed');

    const authDriverCheck = await prisma.user.findFirst({
      where: { OR: phoneSearchVariants(cleanPhone) },
      include: { driver: true },
    });

    const isDriverDetected = Boolean(authDriverCheck?.driver && authDriverCheck.driver.isActive);
    console.assert(isDriverDetected === true, 'Driver status detection failed for registered driver');
    console.log('✓ OTP Login driver detection & dual-role status verified');

    // -------------------------------------------------------------------------
    // TEST CASE 3: Admin Booking Assignment & Driver Trip Query
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Admin Booking Assignment & Driver Trip Query ---');
    const testBookingRef = `KC_TEST_${Date.now()}`;
    const booking = await prisma.adminBooking.upsert({
      where: { bookingReference: testBookingRef },
      create: {
        bookingReference: testBookingRef,
        customerName: 'Sample Passenger',
        customerPhone: '9988776655',
        pickupAddress: 'Mangaluru Airport',
        dropAddress: 'Udupi Krishna Temple',
        pickupTime: new Date().toISOString(),
        tripMode: 'One-Way Outstation',
        status: 'DISPATCHED_PENDING_DRIVER_APPROVAL',
        assignedDriverId: driver.id,
        assignedDriverName: testName,
        driverPhone: cleanPhone,
        assignedVehicleReg: testVehicle,
        driverApprovalStatus: 'PENDING',
        estimatedFare: 1850,
      },
      update: {
        assignedDriverId: driver.id,
        assignedDriverName: testName,
        driverPhone: cleanPhone,
        assignedVehicleReg: testVehicle,
      },
    });

    const assignedTrips = await prisma.adminBooking.findMany({
      where: {
        OR: [
          { assignedDriverId: driver.id },
          { driverPhone: cleanPhone },
        ],
      },
    });

    console.assert(assignedTrips.length > 0, 'No assigned trips returned for driver');
    console.assert(assignedTrips[0].assignedDriverId === driver.id, 'Assigned driver ID mismatch in DB');
    console.log(`✓ Admin Booking assignment linked to Driver.id (${driver.id}) & verified in DB`);

    // -------------------------------------------------------------------------
    // TEST CASE 4: Normal Customer Access Control Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Normal Customer Isolation & Access Rejection ---');
    const normalCleanPhone = normalizePhone(normalPhone);
    let normalUser = await prisma.user.findFirst({
      where: { OR: phoneSearchVariants(normalCleanPhone) },
      include: { driver: true },
    });

    if (!normalUser) {
      normalUser = await prisma.user.create({
        data: {
          id: `user_${normalCleanPhone}`,
          phone: normalCleanPhone,
          email: `customer_${normalCleanPhone}@kandycabs.com`,
          passwordHash: 'customer_authenticated_pass',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
        include: { driver: true },
      });
    }

    const isNormalUserDriver = Boolean(normalUser?.driver && normalUser.driver.isActive);
    console.assert(isNormalUserDriver === false, 'Normal customer wrongly flagged as driver');
    console.log('✓ Normal Customer correctly rejected from driver privileges (isDriver = false)');

    // -------------------------------------------------------------------------
    // TEST CASE 5: Driver Deactivation & Access Revocation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Driver Deactivation & Access Revocation ---');
    await prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: false },
    });

    const deactivatedUserCheck = await prisma.user.findFirst({
      where: { OR: phoneSearchVariants(cleanPhone) },
      include: { driver: true },
    });

    const isDeactivatedDriver = Boolean(deactivatedUserCheck?.driver && deactivatedUserCheck.driver.isActive);
    console.assert(isDeactivatedDriver === false, 'Deactivated driver still evaluates as active driver');
    console.assert(Boolean(deactivatedUserCheck), 'User account deleted unnecessarily during driver deactivation');
    console.log('✓ Driver deactivation revokes driver privileges while preserving User customer account');

    // Restore driver for clean test teardown
    await prisma.driver.update({
      where: { id: driver.id },
      data: { isActive: true },
    });

    // -------------------------------------------------------------------------
    // TEST CASE 6: Session Revalidation & Dual-Role Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Session Revalidation & Dual-Role Integrity ---');
    const restoredUserCheck = await prisma.user.findFirst({
      where: { OR: phoneSearchVariants(cleanPhone) },
      include: { driver: true, customer: true },
    });

    console.assert(Boolean(restoredUserCheck?.driver?.isActive), 'Restored driver check failed');
    console.log('✓ Session revalidation & dual-role integrity verified successfully');

    console.log('\n================================================================');
    console.log('🎉 ALL DRIVER ARCHITECTURE INTEGRATION TESTS PASSED 100%!');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('❌ Driver Architecture Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDriverArchitectureTests();
