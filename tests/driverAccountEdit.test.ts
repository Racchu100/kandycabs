import assert from 'assert';
import {
  getAllDriverAccounts,
  addDriverAccount,
  updateDriverAccount,
  deleteDriverAccount,
} from '../src/lib/driverAccountEngine';

console.log('🧪 Starting Driver Account Edit & Management Integration Test...');

// 1. Initial drivers
const initialDrivers = getAllDriverAccounts();
assert(initialDrivers.length > 0, 'Driver accounts list should not be empty');

// 2. Add temporary test driver
const testDriver = addDriverAccount(
  {
    fullName: 'Test Edit Chauffeur',
    phone: '9988776655',
    username: 'testedit',
    password: 'password123',
    vehicleRegistration: 'KA 19 AB 1234',
    licenseNumber: 'KA19-2026-9999',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
  },
  'Super Admin'
);
assert.strictEqual(testDriver.fullName, 'Test Edit Chauffeur');
assert.strictEqual(testDriver.phone, '9988776655');

// 3. Update driver details
const updateResult = updateDriverAccount(
  testDriver.id,
  {
    fullName: 'Test Edit Chauffeur Updated',
    phone: '9988776600',
    username: 'testedit_updated',
    password: 'newpassword456',
    vehicleRegistration: 'KA 19 AB 9999',
    vehicleModel: 'Innova Crysta 2.4 VX',
    licenseNumber: 'KA19-2026-8888',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
  },
  'Super Admin'
);

assert(updateResult.success, 'Driver update should succeed');
assert.strictEqual(updateResult.driver?.fullName, 'Test Edit Chauffeur Updated');
assert.strictEqual(updateResult.driver?.phone, '9988776600');
assert.strictEqual(updateResult.driver?.username, 'testedit_updated');
assert.strictEqual(updateResult.driver?.password, 'newpassword456');
assert.strictEqual(updateResult.driver?.vehicleRegistration, 'KA 19 AB 9999');
assert.strictEqual(updateResult.driver?.vehicleModel, 'Innova Crysta 2.4 VX');
assert.strictEqual(updateResult.driver?.licenseNumber, 'KA19-2026-8888');

// 4. Verify list reflects changes
const updatedList = getAllDriverAccounts();
const found = updatedList.find((d) => d.id === testDriver.id);
assert(found, 'Updated driver should exist in drivers list');
// 5. Delete driver account
const deleteResult = deleteDriverAccount(testDriver.id, 'Super Admin');
assert(deleteResult.success, 'Driver deletion should succeed');

const listAfterDelete = getAllDriverAccounts();
const foundAfterDelete = listAfterDelete.find((d) => d.id === testDriver.id);
assert.strictEqual(foundAfterDelete, undefined, 'Deleted driver should no longer exist in drivers list');

// 6. Re-add deleted driver with same phone number and verify it appears in admin list
const readdedDriver = addDriverAccount(
  {
    fullName: 'Test Readded Chauffeur',
    phone: '9988776600',
    username: 'testreadded',
    password: 'readdedpassword123',
    vehicleRegistration: 'KA 19 AB 5555',
    licenseNumber: 'KA19-2026-5555',
    vendorAgencyName: 'Sri Durga Travels & Cab Service',
  },
  'Super Admin'
);
assert.strictEqual(readdedDriver.phone, '9988776600');

const listAfterReadd = getAllDriverAccounts();
const foundReadded = listAfterReadd.find((d) => d.phone === '9988776600');
assert(foundReadded, 'Re-added driver should be present in getAllDriverAccounts()');
assert.strictEqual(foundReadded.fullName, 'Test Readded Chauffeur');

console.log('✅ Driver Account Edit & Management Integration Test Passed 100%!');
