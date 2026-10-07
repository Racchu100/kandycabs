const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      customer: {
        include: {
          bookings: {
            select: {
              id: true,
              humanReadableRef: true,
              status: true,
              pickupAddress: true,
              createdAt: true
            }
          }
        }
      }
    }
  });

  console.log('=== ALL USERS IN DB ===');
  for (const u of users) {
    console.log(`User [${u.id}] Phone: "${u.phone}" Name: "${u.fullName}" Roles: [${u.roles.join(',')}]`);
    if (u.customer) {
      console.log(`  Customer [${u.customer.id}] Bookings (${u.customer.bookings.length}):`);
      for (const b of u.customer.bookings) {
        console.log(`    - Ref: ${b.humanReadableRef}, Status: ${b.status}, Date: ${b.createdAt}`);
      }
    } else {
      console.log('  No customer record linked.');
    }
  }
}

main().finally(() => prisma.$disconnect());
