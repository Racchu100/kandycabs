import { PrismaClient, VehicleCategory, TripType, CouponType, UserRole, DriverStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Kandy Cabs database seed...');

  // 1. Seed Admin User
  const adminPhone = '9481086058';
  const adminUser = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { roles: [UserRole.ADMIN, UserRole.CUSTOMER] },
    create: {
      phone: adminPhone,
      fullName: 'Admin Operations',
      roles: [UserRole.ADMIN, UserRole.CUSTOMER],
    },
  });

  await prisma.customer.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      fullName: 'Admin Operations',
      email: 'admin@kandycabs.com',
    },
  });

  console.log('✅ Admin user seeded: 9481086058');

  // 2. Seed Fleet / Vehicles
  const vehiclesData = [
    {
      category: VehicleCategory.HATCHBACK,
      name: 'Maruti WagonR / Indica (CNG/Diesel)',
      seatCount: 4,
      baseFarePerKm: 11.5,
      includedKmForLocalPackages: 80,
      extraKmRate: 12.0,
      driverAllowance: 300,
      nightChargeRules: '₹250 night allowance for pickup/drop between 10:00 PM and 6:00 AM',
      images: [
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=60',
      ],
    },
    {
      category: VehicleCategory.SEDAN,
      name: 'Swift Dzire / Toyota Etios (AC)',
      seatCount: 4,
      baseFarePerKm: 13.5,
      includedKmForLocalPackages: 80,
      extraKmRate: 14.0,
      driverAllowance: 350,
      nightChargeRules: '₹250 night allowance for pickup/drop between 10:00 PM and 6:00 AM',
      images: [
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60',
      ],
    },
    {
      category: VehicleCategory.SUV,
      name: 'Ertiga / Marazzo (6+1 Seater AC)',
      seatCount: 6,
      baseFarePerKm: 17.5,
      includedKmForLocalPackages: 80,
      extraKmRate: 18.0,
      driverAllowance: 400,
      nightChargeRules: '₹300 night allowance for pickup/drop between 10:00 PM and 6:00 AM',
      images: [
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop&q=60',
      ],
    },
    {
      category: VehicleCategory.SUV_PREMIUM,
      name: 'Toyota Innova Crysta (7 Seater Luxury)',
      seatCount: 7,
      baseFarePerKm: 21.0,
      includedKmForLocalPackages: 80,
      extraKmRate: 22.0,
      driverAllowance: 500,
      nightChargeRules: '₹350 night allowance for pickup/drop between 10:00 PM and 6:00 AM',
      images: [
        'https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&auto=format&fit=crop&q=60',
      ],
    },
    {
      category: VehicleCategory.TEMPO_TRAVELER,
      name: 'Force Tempo Traveler (12/16 Seater Luxury)',
      seatCount: 12,
      baseFarePerKm: 26.0,
      includedKmForLocalPackages: 80,
      extraKmRate: 28.0,
      driverAllowance: 600,
      nightChargeRules: '₹400 night allowance for pickup/drop between 10:00 PM and 6:00 AM',
      images: [
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60',
      ],
    },
  ];

  const seededVehicles = [];
  for (const vData of vehiclesData) {
    const existing = await prisma.vehicle.findFirst({ where: { category: vData.category } });
    if (existing) {
      seededVehicles.push(existing);
    } else {
      const created = await prisma.vehicle.create({ data: vData });
      seededVehicles.push(created);
    }
  }

  console.log(`✅ Seeded ${seededVehicles.length} vehicles.`);

  // 3. Seed Fare Rules
  const tripTypes = [TripType.ONEWAY, TripType.ROUND, TripType.LOCAL, TripType.AIRPORT, TripType.PACKAGE];
  for (const v of seededVehicles) {
    for (const tt of tripTypes) {
      await prisma.fareRule.upsert({
        where: {
          tripType_vehicleCategory: {
            tripType: tt,
            vehicleCategory: v.category,
          },
        },
        update: {
          perKmRate: v.baseFarePerKm,
          driverAllowancePerDay: v.driverAllowance,
        },
        create: {
          tripType: tt,
          vehicleCategory: v.category,
          perKmRate: v.baseFarePerKm,
          minimumKm: tt === TripType.ROUND ? 250 : 0,
          driverAllowancePerDay: v.driverAllowance,
          nightChargeWindow: '10:00 PM - 06:00 AM',
          nightChargeAmount: 250,
          tollPolicy: 'At actuals, collected at trip end',
          gstPercent: 5.0,
        },
      });
    }
  }
  console.log('✅ Seeded fare rules for all vehicle categories and trip types.');

  // 4. Seed Tour Packages
  const packagesData = [
    {
      title: 'Mangalore & Udupi Coastal Temple Tour',
      slug: 'mangalore-coastal-temple',
      description: 'Discover coastal Karnataka with Mangaladevi Temple, Kadri Park, Panambur Beach sunset, Udupi Sri Krishna Mutt, and Malpe Beach St. Mary’s Island.',
      destination: 'Mangalore & Udupi, Karnataka',
      durationDays: 3,
      durationNights: 2,
      itinerary: JSON.stringify([
        { day: 1, title: 'Bangalore to Mangalore via Shiradi Ghat', details: 'Pickup from Bangalore, scenic drive through Western Ghats, visit Mangaladevi Temple, evening Panambur Beach sunset.' },
        { day: 2, title: 'Mangalore Heritage & Udupi Sri Krishna Mutt', details: 'Visit St. Aloysius Chapel frescoes, drive to Udupi Temple, evening Malpe Beach & boat to St. Mary’s Island.' },
        { day: 3, title: 'Pilikula Nisargadhama & Return Drive', details: 'Morning visit to Pilikula Biological Park & Heritage Village, return drive to Bangalore.' },
      ]),
      inclusions: ['Clean AC Sedan/SUV Cab', 'Driver Allowance & Fuel', 'Doorstep Pickup & Drop', 'Highway Tolls & Permit'],
      exclusions: ['Hotel Stay', 'Boat Ferry Tickets', 'Meals'],
      price: 11499,
      images: ['https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=60'],
    },
    {
      title: 'Coorg Coffee & Waterfalls Retreat',
      slug: 'coorg-coffee-retreat',
      description: 'Explore the Scotland of India with lush coffee plantations, Abbey Falls, Raja Seat, and Golden Temple Bylakuppe.',
      destination: 'Coorg (Madikeri)',
      durationDays: 3,
      durationNights: 2,
      itinerary: JSON.stringify([
        { day: 1, title: 'Bangalore to Coorg & Golden Temple', details: 'Pickup from Bangalore, drive to Coorg via Bylakuppe Tibetan Monastery. Evening sunset at Raja Seat.' },
        { day: 2, title: 'Sightseeing: Abbey Falls & Dubare Elephant Camp', details: 'Morning elephant interaction at Dubare Camp, visit Abbey Falls and Talacauvery.' },
        { day: 3, title: 'Coffee Plantation Walk & Return', details: 'Guided coffee estate walk, spice shopping, drive back to Bangalore.' },
      ]),
      inclusions: ['Clean AC Sedan/SUV Cab', 'Driver Allowance & Fuel', 'Toll & State Taxes', 'Doorstep Pickup & Drop'],
      exclusions: ['Hotel Accommodation', 'Monument Entry Fees', 'Personal Meals & Beverages'],
      price: 9499,
      images: ['https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&auto=format&fit=crop&q=60'],
    },
    {
      title: 'Mysore Royal Heritage Tour',
      slug: 'mysore-royal-heritage',
      description: 'Step into royal grandeur with Mysore Palace, Chamundi Hills, Brindavan Gardens, and Srirangapatna.',
      destination: 'Mysore',
      durationDays: 2,
      durationNights: 1,
      itinerary: JSON.stringify([
        { day: 1, title: 'Bangalore to Mysore & Palace Illumination', details: 'Pickup from Bangalore, stop at Tipu Sultan Summer Palace, visit Mysore Palace & Chamundi Hill temple. Evening Brindavan Garden musical fountain.' },
        { day: 2, title: 'Mysore Zoo, Silk Shopping & Return', details: 'Morning Mysore Zoo tour, authentic Mysore Pak & silk shopping, return to Bangalore.' },
      ]),
      inclusions: ['Dedicated AC Cab', 'Driver Allowance', 'Fuel & Parking', 'All Tolls Included'],
      exclusions: ['Entry Tickets', 'Meals'],
      price: 5499,
      images: ['https://images.unsplash.com/photo-1600100397608-f090742f47a0?w=800&auto=format&fit=crop&q=60'],
    },
    {
      title: 'Goa Sun, Sand & Beach Escape',
      slug: 'goa-sun-sand-escape',
      description: 'Unwind along North & South Goa beaches, Old Goa churches, Fort Aguada, and Dudhsagar waterfall safari.',
      destination: 'Goa',
      durationDays: 4,
      durationNights: 3,
      itinerary: JSON.stringify([
        { day: 1, title: 'Arrival & North Goa Beaches', details: 'Pickup, drive to Goa. Visit Calangute, Baga, and Anjuna sunset.' },
        { day: 2, title: 'Forts & Heritage', details: 'Visit Chapora Fort, Fort Aguada, Basilica of Bom Jesus, Se Cathedral.' },
        { day: 3, title: 'South Goa & Mandovi River Cruise', details: 'Miramar beach, Dona Paula, evening sunset Mandovi river cruise.' },
        { day: 4, title: 'Shopping & Departure', details: 'Panjim market shopping and return journey.' },
      ]),
      inclusions: ['Outstation SUV Cab', 'Driver Allowance for 4 Days', 'Interstate Permit Charges'],
      exclusions: ['Hotel stay', 'Cruise tickets', 'Water sports'],
      price: 16999,
      images: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=60'],
    },
    {
      title: 'Ooty & Coonoor Queen of Hill Stations',
      slug: 'ooty-coonoor-hill-station',
      description: 'Ride through tea gardens, Nilgiri Mountain Railway view, Ooty Lake, Botanical Garden, and Doddabetta Peak.',
      destination: 'Ooty & Coonoor',
      durationDays: 3,
      durationNights: 2,
      itinerary: JSON.stringify([
        { day: 1, title: 'Drive to Ooty via Bandipur Tiger Reserve', details: 'Scenic drive through Bandipur forest, arrival in Ooty, evening boat ride at Ooty Lake.' },
        { day: 2, title: 'Coonoor Sightseeing & Sim’s Park', details: 'Visit Dolphin’s Nose, Tea Estate tour, Lamb’s Rock, and Sim’s Park.' },
        { day: 3, title: 'Botanical Garden & Return', details: 'Morning stroll in Government Botanical Garden, return drive.' },
      ]),
      inclusions: ['Clean AC Sedan/SUV', 'All Hill Driving Allowances', 'Tolls & State Taxes'],
      exclusions: ['Personal Expenses', 'Toy Train Tickets'],
      price: 10999,
      images: ['https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&auto=format&fit=crop&q=60'],
    },
  ];

  for (const pkg of packagesData) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: { price: pkg.price, itinerary: pkg.itinerary },
      create: pkg,
    });
  }
  console.log(`✅ Seeded ${packagesData.length} tour packages.`);

  // 5. Seed Demo Coupons
  const couponsData = [
    {
      code: 'KANDY100',
      type: CouponType.FLAT,
      value: 100,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      usageLimit: 500,
    },
    {
      code: 'FIRST250',
      type: CouponType.FLAT,
      value: 250,
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      usageLimit: 200,
    },
    {
      code: 'FESTIVE10',
      type: CouponType.PERCENTAGE,
      value: 10, // 10% OFF
      validFrom: new Date('2026-01-01'),
      validTo: new Date('2027-12-31'),
      usageLimit: 300,
    },
  ];

  for (const c of couponsData) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { value: c.value },
      create: c,
    });
  }
  console.log(`✅ Seeded ${couponsData.length} coupons.`);

  // 6. Seed Demo Approved Driver
  const driverPhone = '8888888888';
  const driverUser = await prisma.user.upsert({
    where: { phone: driverPhone },
    update: { roles: [UserRole.DRIVER, UserRole.CUSTOMER] },
    create: {
      phone: driverPhone,
      fullName: 'Ramesh Kumar (Demo Driver)',
      roles: [UserRole.DRIVER, UserRole.CUSTOMER],
    },
  });

  const sedanVehicle = seededVehicles.find((v) => v.category === VehicleCategory.SEDAN);

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      isActive: true,
      isVerifiedByAdmin: true,
      status: DriverStatus.APPROVED,
    },
    create: {
      userId: driverUser.id,
      fullName: 'Ramesh Kumar (Demo Driver)',
      licenseNumber: 'KA-01-2024-9876543',
      assignedVehicleId: sedanVehicle?.id,
      isActive: true,
      isVerifiedByAdmin: true,
      status: DriverStatus.APPROVED,
      vehiclePhotos: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&auto=format&fit=crop&q=60'],
    },
  });

  console.log('✅ Demo approved driver seeded: 8888888888');

  console.log('🎉 Kandy Cabs Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
