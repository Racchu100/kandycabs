const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateAuthToken } = require('@kandy-cabs/shared');

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '+919483032949' },
    include: { customer: true }
  });
  console.log('User found:', user);

  const token = await generateAuthToken({
    userId: user.id,
    phone: user.phone,
    roles: user.roles
  });
  console.log('Generated token:', token);

  const res = await fetch('http://localhost:3000/api/customer/bookings/list?category=ALL', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('Response status:', res.status);
  const data = await res.json();
  console.log('Response data:', JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
