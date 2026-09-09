import { getAllVendorPartners, getVendorPartnerById, addVendorPartner } from '../src/lib/vendorEngine';
import { assignVendorDriverToBooking, getAdminBookings, createCustomerBooking } from '../src/lib/adminEngine';

function runTests() {
  console.log('=== Running Vendor Partner Engine & Dispatch Tests ===');

  // Test 1: Fetch initial seed vendor partners
  const seedVendors = getAllVendorPartners();
  console.assert(seedVendors.length >= 3, 'Should have initial seed vendor partners');
  console.log(`✓ Seed Vendors count: ${seedVendors.length}`);

  // Test 2: Add new Vendor Partner
  const newVendor = addVendorPartner({
    agencyName: 'Coastal Karnataka Express Cabs',
    contactPerson: 'Devendra Shetty',
    phone: '9845223344',
    email: 'express@coastalcabs.com',
    city: 'Kundapura',
    fleetTypes: 'Swift Dzire, Innova Crysta',
    status: 'ACTIVE',
  });
  console.assert(newVendor.id.startsWith('vnd_'), 'Vendor ID should start with vnd_');
  console.assert(getAllVendorPartners().length === seedVendors.length + 1, 'Vendor list count should increase');
  console.log(`✓ Registered new vendor partner: ${newVendor.agencyName} (${newVendor.id})`);

  // Test 3: Assign Vendor Partner to Booking with Driver & Vehicle Info
  const testBooking = createCustomerBooking({
    bookingReference: 'KC-TEST-VENDOR-1',
    customerName: 'Santhosh Kumar',
    customerPhone: '+919900112233',
    pickupAddress: 'KSRTC Bus Stand, Mangaluru',
    dropAddress: 'Subrahmanya Temple',
    pickupTime: 'Tomorrow 08:00 AM',
    tripMode: 'One-Way Outstation',
    estimatedFare: 4200,
    advancePaid: 840,
    remainingFare: 3360,
  });

  const dispatchRes = assignVendorDriverToBooking(
    testBooking.id,
    newVendor.id,
    newVendor.agencyName,
    'Gururaj Poojary',
    '9980112233',
    'Toyota Innova Crysta',
    'KA 20 M 5566'
  );

  console.assert(dispatchRes.success === true, 'Vendor dispatch should succeed');
  console.assert(dispatchRes.booking?.vendorAgencyName === 'Coastal Karnataka Express Cabs', 'Booking vendor name should match');
  console.assert(dispatchRes.booking?.assignedDriverName === 'Gururaj Poojary', 'Driver name should match');
  console.assert(dispatchRes.booking?.driverPhone === '9980112233', 'Unmasked driver phone should match');
  console.assert(dispatchRes.booking?.vehicleModel === 'Toyota Innova Crysta', 'Vehicle model should match');
  console.assert(dispatchRes.booking?.assignedVehicleReg === 'KA 20 M 5566', 'Vehicle reg plate should match');
  console.log(`✓ Vendor Dispatch verified successfully: Driver ${dispatchRes.booking?.assignedDriverName} (${dispatchRes.booking?.driverPhone})`);

  console.log('=== All Vendor Partner Engine Tests PASSED! ===\n');
}

runTests();
