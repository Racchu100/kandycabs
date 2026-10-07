const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      customer: {
        include: {
          bookings: true
        }
      }
    }
  });
  console.log('Total Users:', users.length);
  for (const u of users) {
    console.log(`User ID: ${u.id}, Phone: ${u.phone}, Name: ${u.fullName}`);
    if (u.customer) {
      console.log(`  Customer ID: ${u.customer.id}, Bookings Count: ${u.customer.bookings.length}`);
      for (const b of u.customer.bookings) {
        console.log(`    Booking ID: ${b.id}, Ref: ${b.humanReadableRef}, Status: ${b.status}, From: ${b.pickupAddress} -> To: ${b.dropAddress}`);
      }
    }
  }

  const allBookings = await prisma.booking.findMany();
  console.log('\nTotal Bookings in DB:', allBookings.length);
  for (const b of allBookings) {
    console.log(`Booking ID: ${b.id}, CustomerId: ${b.customerId}, Ref: ${b.humanReadableRef}, Status: ${b.status}, CreatedAt: ${b.createdAt}`);
  }
}

main().finally(() => prisma.$disconnect());
