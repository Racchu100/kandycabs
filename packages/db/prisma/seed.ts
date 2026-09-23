import {
  PrismaClient,
  UserRole,
  DriverVerificationStatus,
  VehicleCategory,
  FuelType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing test data (optional or upsert)
  console.log('Seeding Vehicle Category templates and sample vehicles...');
  const vehicleTemplates = [
    {
      category: VehicleCategory.HATCHBACK,
      fuelType: FuelType.PETROL,
      seatCount: 4,
      baseFarePerKm: 12.0,
      extraKmRate: 14.0,
      driverAllowance: 300.0,
      plateNumber: 'KA-01-HB-1001',
    },
    {
      category: VehicleCategory.SEDAN,
      fuelType: FuelType.DIESEL,
      seatCount: 4,
      baseFarePerKm: 14.0,
      extraKmRate: 16.0,
      driverAllowance: 350.0,
      plateNumber: 'KA-01-SD-2002',
    },
    {
      category: VehicleCategory.SUV,
      fuelType: FuelType.DIESEL,
      seatCount: 6,
      baseFarePerKm: 18.0,
      extraKmRate: 20.0,
      driverAllowance: 400.0,
      plateNumber: 'KA-01-SV-3003',
    },
    {
      category: VehicleCategory.SUV_PREMIUM,
      fuelType: FuelType.DIESEL,
      seatCount: 7,
      baseFarePerKm: 24.0,
      extraKmRate: 26.0,
      driverAllowance: 500.0,
      plateNumber: 'KA-01-SP-4004',
    },
    {
      category: VehicleCategory.TEMPO_TRAVELER,
      fuelType: FuelType.DIESEL,
      seatCount: 12,
      baseFarePerKm: 30.0,
      extraKmRate: 34.0,
      driverAllowance: 600.0,
      plateNumber: 'KA-01-TT-5005',
    },
  ];

  for (const v of vehicleTemplates) {
    const existing = await prisma.vehicle.findFirst({
      where: { plateNumber: v.plateNumber },
    });
    if (!existing) {
      await prisma.vehicle.create({
        data: v,
      });
    }
  }

  // 2. Create 1 Test Admin User
  console.log('Seeding Test Admin User...');
  const adminPhone = '+919999999999';
  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      fullName: 'Master Admin',
      roles: [UserRole.ADMIN],
    },
    create: {
      phone: adminPhone,
      fullName: 'Master Admin',
      roles: [UserRole.ADMIN],
    },
  });
  console.log(`✅ Admin created: ${adminUser.fullName} (${adminUser.phone})`);

  // 3. Create 1 Test Driver (APPROVED) with vehicle
  console.log('Seeding Test Driver (APPROVED)...');
  const driverPhone = '+918888888888';
  const driverUser = await prisma.user.upsert({
    where: { phone: driverPhone },
    update: {
      fullName: 'Ramesh Kumar (Test Driver)',
      roles: [UserRole.DRIVER],
    },
    create: {
      phone: driverPhone,
      fullName: 'Ramesh Kumar (Test Driver)',
      roles: [UserRole.DRIVER],
    },
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      licenseNumber: 'DL-KA01-2024-0001',
      verificationStatus: DriverVerificationStatus.APPROVED,
      onlineStatus: true,
      currentLat: 12.9716,
      currentLng: 77.5946,
      lastPingAt: new Date(),
      vehiclePhotos: ['https://placehold.co/600x400/png?text=Vehicle+Photo'],
    },
    create: {
      userId: driverUser.id,
      licenseNumber: 'DL-KA01-2024-0001',
      verificationStatus: DriverVerificationStatus.APPROVED,
      onlineStatus: true,
      currentLat: 12.9716,
      currentLng: 77.5946,
      lastPingAt: new Date(),
      vehiclePhotos: ['https://placehold.co/600x400/png?text=Vehicle+Photo'],
    },
  });

  // Assign sedan to this driver
  const driverSedan = await prisma.vehicle.findFirst({
    where: { plateNumber: 'KA-01-SD-2002' },
  });
  if (driverSedan) {
    await prisma.vehicle.update({
      where: { id: driverSedan.id },
      data: { driverId: driver.id },
    });
  }
  console.log(`✅ Driver created: ${driverUser.fullName} [APPROVED]`);

  // 4. Create 1 Test Customer
  console.log('Seeding Test Customer...');
  const customerPhone = '+917777777777';
  const customerUser = await prisma.user.upsert({
    where: { phone: customerPhone },
    update: {
      fullName: 'Priya Sharma (Test Customer)',
      roles: [UserRole.CUSTOMER],
    },
    create: {
      phone: customerPhone,
      fullName: 'Priya Sharma (Test Customer)',
      roles: [UserRole.CUSTOMER],
    },
  });

  await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {
      email: 'customer.test@kandycabs.com',
      savedAddresses: [
        {
          label: 'Home',
          address: '123 Indiranagar 100ft Rd, Bengaluru, Karnataka 560038',
          lat: 12.9784,
          lng: 77.6408,
        },
        {
          label: 'Work',
          address: 'Manyata Tech Park, Nagavara, Bengaluru, Karnataka 560045',
          lat: 13.0494,
          lng: 77.6208,
        },
      ],
    },
    create: {
      userId: customerUser.id,
      email: 'customer.test@kandycabs.com',
      savedAddresses: [
        {
          label: 'Home',
          address: '123 Indiranagar 100ft Rd, Bengaluru, Karnataka 560038',
          lat: 12.9784,
          lng: 77.6408,
        },
        {
          label: 'Work',
          address: 'Manyata Tech Park, Nagavara, Bengaluru, Karnataka 560045',
          lat: 13.0494,
          lng: 77.6208,
        },
      ],
    },
  });
  console.log(`✅ Customer created: ${customerUser.fullName}`);

  console.log('🌱 Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
