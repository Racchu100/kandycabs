require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes('connection_limit')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${separator}connection_limit=5&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('--- PURGING ALL STORED TRIPS & BOOKINGS ---');

  const beforeBookings = await prisma.booking.count();
  console.log(`Found ${beforeBookings} bookings in the database.`);

  if (beforeBookings === 0) {
    console.log('No bookings to delete.');
    return;
  }

  // 1. Delete dependent child records first for safety
  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${deletedPayments.count} payment records.`);

  const deletedTracking = await prisma.tripTracking.deleteMany({});
  console.log(`Deleted ${deletedTracking.count} trip tracking points.`);

  const deletedEvents = await prisma.tripEvent.deleteMany({});
  console.log(`Deleted ${deletedEvents.count} trip events.`);

  const deletedDispatches = await prisma.bookingDispatch.deleteMany({});
  console.log(`Deleted ${deletedDispatches.count} dispatch records.`);

  // 2. Delete all bookings
  const deletedBookings = await prisma.booking.deleteMany({});
  console.log(`Deleted ${deletedBookings.count} booking records.`);

  // 3. Clean up any Test Load Users created during stress testing
  const deletedTestCustomers = await prisma.customer.deleteMany({
    where: {
      user: {
        fullName: {
          contains: 'Test Load User',
        },
      },
    },
  });
  console.log(`Deleted ${deletedTestCustomers.count} test customer profiles.`);

  const deletedTestUsers = await prisma.user.deleteMany({
    where: {
      fullName: {
        contains: 'Test Load User',
      },
    },
  });
  console.log(`Deleted ${deletedTestUsers.count} test load user accounts.`);

  const afterBookings = await prisma.booking.count();
  console.log('====================================');
  console.log(`Remaining Bookings in Database: ${afterBookings}`);
  console.log('ALL STORED TRIPS SUCCESSFULLY DELETED');
  console.log('====================================');
}

main()
  .catch((err) => {
    console.error('Error deleting trips:', err);
  })
  .finally(() => prisma.$disconnect());
