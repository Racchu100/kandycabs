const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestBooking = await prisma.booking.findUnique({
    where: { humanReadableRef: 'KC-2026-925966' },
    include: {
      customer: {
        include: {
          user: true
        }
      }
    }
  });
  console.log('Latest Booking details:', JSON.stringify(latestBooking, null, 2));

  const allUsersWithPhone = await prisma.user.findMany({
    where: {
      phone: {
        contains: '9483032949'
      }
    },
    include: {
      customer: {
        include: {
          bookings: true
        }
      }
    }
  });
  console.log('\nUsers matching 9483032949:', JSON.stringify(allUsersWithPhone, null, 2));
}

main().finally(() => prisma.$disconnect());
