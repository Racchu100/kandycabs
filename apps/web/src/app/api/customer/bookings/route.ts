import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma, safeDbQuery } from '@/lib/prisma';
import { getAllStoredBookings } from '@/lib/bookingStore';
import { normalizePhone } from '@kandycabs/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryPhone = url.searchParams.get('phone');
    const headerPhone = req.headers.get('x-customer-phone');

    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    let authedPhone = '';
    let authedUserId = '';

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.phone) {
        authedPhone = normalizePhone(decoded.phone);
        authedUserId = decoded.userId;
      }
    }

    if (!authedPhone && queryPhone) {
      authedPhone = normalizePhone(queryPhone);
    }
    if (!authedPhone && headerPhone) {
      authedPhone = normalizePhone(headerPhone);
    }

    if (!authedPhone) {
      return NextResponse.json({ bookings: [] });
    }

    let dbBookings: any[] = [];
    if (authedUserId) {
      const fetched = await safeDbQuery(async () => {
        const customer = await prisma.customer.findUnique({
          where: { userId: authedUserId },
          select: { id: true },
        });

        if (!customer) return [];

        return prisma.booking.findMany({
          where: { customerId: customer.id },
          select: {
            id: true,
            humanReadableRef: true,
            tripType: true,
            pickupAddress: true,
            dropAddress: true,
            scheduledAt: true,
            distanceKm: true,
            estimatedFare: true,
            advanceAmount: true,
            advancePaymentStatus: true,
            balanceAmount: true,
            balancePaymentStatus: true,
            status: true,
            createdAt: true,
            vehicle: {
              select: { name: true, category: true },
            },
            assignedDriver: {
              select: {
                fullName: true,
                licenseNumber: true,
                user: { select: { phone: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      if (fetched) {
        dbBookings = fetched;
      }
    }

    // Filter in-memory stored bookings strictly by the authenticated user's phone
    const storedBookings = getAllStoredBookings();
    const refSet = new Set<string>();
    const bookings: any[] = [];

    for (const b of dbBookings) {
      refSet.add(b.humanReadableRef || b.id);
      bookings.push(b);
    }

    for (const s of storedBookings) {
      if (!refSet.has(s.humanReadableRef) && !refSet.has(s.id)) {
        const bookingPhone = normalizePhone(s.customer?.phone || s.customer?.user?.phone || '');
        if (bookingPhone !== authedPhone) continue;
        refSet.add(s.humanReadableRef || s.id);
        bookings.push(s);
      }
    }

    return NextResponse.json({ bookings });
  } catch (err: any) {
    return NextResponse.json({ bookings: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizePhone(body.customerPhone || body.phone || '');
    const ref = body.id || body.humanReadableRef || `KC${Math.floor(10000 + Math.random() * 90000)}`;

    // Parse scheduled date and time
    let scheduledDate = new Date();
    if (body.scheduledAt) {
      const parsed = new Date(body.scheduledAt);
      if (!isNaN(parsed.getTime())) scheduledDate = parsed;
    } else if (body.pickupDate) {
      const parts = String(body.pickupDate).split('-');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        let h = 7;
        let min = 0;
        if (body.pickupTime) {
          const tParts = String(body.pickupTime).split(':');
          h = parseInt(tParts[0], 10) || 7;
          min = parseInt(tParts[1], 10) || 0;
        }
        scheduledDate = new Date(y, m, d, h, min);
      }
    }

    // Map trip type
    let tripTypeEnum: 'ONEWAY' | 'ROUND' | 'LOCAL' | 'AIRPORT' | 'PACKAGE' = 'ONEWAY';
    const rawTripType = String(body.tripType || '').toUpperCase();
    if (rawTripType === 'ROUNDTRIP' || rawTripType === 'ROUND') tripTypeEnum = 'ROUND';
    else if (rawTripType === 'LOCAL') tripTypeEnum = 'LOCAL';
    else if (rawTripType === 'AIRPORT') tripTypeEnum = 'AIRPORT';
    else if (rawTripType === 'PACKAGE') tripTypeEnum = 'PACKAGE';

    // Map vehicle category enum
    let vehicleCatEnum: 'HATCHBACK' | 'SEDAN' | 'SUV' | 'SUV_PREMIUM' | 'TEMPO_TRAVELER' = 'SEDAN';
    const rawCat = String(body.vehicleCategory || body.vehicleName || '').toLowerCase();
    if (rawCat.includes('hatch')) vehicleCatEnum = 'HATCHBACK';
    else if (rawCat.includes('innova') || rawCat.includes('premium')) vehicleCatEnum = 'SUV_PREMIUM';
    else if (rawCat.includes('tempo')) vehicleCatEnum = 'TEMPO_TRAVELER';
    else if (rawCat.includes('suv') || rawCat.includes('ertiga')) vehicleCatEnum = 'SUV';

    let bookingDbId = ref;
    let customerFullName = body.customerName || 'Customer';

    // Attempt saving to Supabase / PostgreSQL via Prisma
    try {
      if (phone) {
        let user = await prisma.user.findUnique({
          where: { phone },
          include: { customer: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              phone,
              fullName: customerFullName,
              roles: ['CUSTOMER'],
              customer: {
                create: {
                  fullName: customerFullName,
                  email: body.customerEmail || null,
                },
              },
            },
            include: { customer: true },
          });
        } else if (!user.customer) {
          const newCust = await prisma.customer.create({
            data: {
              userId: user.id,
              fullName: user.fullName || customerFullName,
              email: body.customerEmail || null,
            },
          });
          user.customer = newCust;
        }

        if (user.customer) {
          customerFullName = user.customer.fullName || customerFullName;

          // Find or create matching vehicle
          let vehicle = await prisma.vehicle.findFirst({
            where: {
              OR: [
                { category: vehicleCatEnum },
                { name: { contains: body.vehicleName || '', mode: 'insensitive' } },
              ],
            },
          });

          if (!vehicle) {
            vehicle = await prisma.vehicle.findFirst();
            if (!vehicle) {
              vehicle = await prisma.vehicle.create({
                data: {
                  name: body.vehicleName || 'Sedan (Dzire / Etios)',
                  category: vehicleCatEnum,
                  seatCount: 4,
                  baseFarePerKm: 13.5,
                  extraKmRate: 14.0,
                  driverAllowance: 300,
                },
              });
            }
          }

          if (vehicle) {
            const dbBooking = await prisma.booking.create({
              data: {
                humanReadableRef: ref,
                customerId: user.customer.id,
                tripType: tripTypeEnum,
                pickupAddress: body.pickupAddress || body.pickup || 'Pickup Location',
                pickupLat: 12.9716,
                pickupLng: 77.5946,
                dropAddress: body.dropAddress || body.drop || 'Drop Location',
                dropLat: 12.2958,
                dropLng: 76.6394,
                scheduledAt: scheduledDate,
                vehicleId: vehicle.id,
                distanceKm: Number(body.estimatedDistanceKm || body.distanceKm || 250),
                estimatedFare: Number(body.estimatedFare || body.totalFare || 0),
                discountAmount: Number(body.discountAmount || body.couponDiscount || 0),
                advanceAmount: Number(body.advanceAmount || body.advancePaid || 0),
                advancePaymentStatus: 'PAID',
                balanceAmount: Number(body.balanceAmount || body.balanceDue || 0),
                balancePaymentStatus: 'CREATED',
                status: 'PENDING_ADMIN',
                customerPhoneReleased: false,
                payments: {
                  create: {
                    type: 'ADVANCE',
                    gateway: 'MANUAL_UPI',
                    amount: Number(body.advanceAmount || body.advancePaid || 0),
                    status: 'PAID',
                  },
                },
              },
            });
            if (dbBooking?.id) {
              bookingDbId = dbBooking.id;
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('[customer/bookings POST] DB persistence fallback:', dbErr);
    }

    const newBooking = {
      id: bookingDbId,
      humanReadableRef: ref,
      tripType: tripTypeEnum,
      pickupAddress: body.pickupAddress || body.pickup || 'Pickup Location',
      dropAddress: body.dropAddress || body.drop || 'Drop Location',
      scheduledAt: scheduledDate.toISOString(),
      distanceKm: Number(body.estimatedDistanceKm || body.distanceKm || 250),
      estimatedFare: Number(body.estimatedFare || body.totalFare || 0),
      advanceAmount: Number(body.advanceAmount || body.advancePaid || 0),
      advancePaymentStatus: 'PAID',
      balanceAmount: Number(body.balanceAmount || body.balanceDue || 0),
      balancePaymentStatus: 'PENDING',
      tollAmount: 0,
      status: 'CONFIRMED',
      customerPhoneReleased: false,
      customer: {
        fullName: customerFullName,
        phone: phone,
        user: { phone: phone },
      },
      vehicle: {
        name: body.vehicleName || 'Sedan (Dzire / Etios)',
      },
      createdAt: new Date().toISOString(),
    };

    const { addStoredBooking } = await import('@/lib/bookingStore');
    addStoredBooking(newBooking as any);

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create booking' }, { status: 400 });
  }
}
