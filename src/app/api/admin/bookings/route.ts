import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const bookings = await prisma.adminBooking.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: bookings });
  } catch (error: any) {
    console.error('Error fetching admin bookings from DB:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      bookingReference,
      customerName,
      customerPhone,
      pickupAddress,
      dropAddress,
      pickupTime,
      tripMode,
      tripDays = 1,
      status = 'WAITING_FOR_ADMIN_DISPATCH',
      vendorId,
      vendorAgencyName,
      assignedDriverId,
      assignedDriverName,
      driverPhone,
      vehicleModel,
      assignedVehicleReg,
      driverApprovalStatus = 'PENDING',
      estimatedFare = 0,
      advancePaid = 0,
      remainingFare = 0,
    } = body;

    if (!bookingReference || !customerName || !customerPhone) {
      return NextResponse.json({ success: false, error: 'Booking reference, customer name, and phone are required.' }, { status: 400 });
    }

    const payload: any = {
      bookingReference: bookingReference.toString().trim(),
      customerName: customerName.toString().trim(),
      customerPhone: customerPhone.toString().trim(),
      pickupAddress: (pickupAddress || 'Mangaluru').toString().trim(),
      dropAddress: (dropAddress || 'Udupi').toString().trim(),
      pickupTime: (pickupTime || new Date().toISOString()).toString().trim(),
      tripMode: (tripMode || 'One-Way Outstation').toString().trim(),
      tripDays: Number(tripDays) || 1,
      status: status.toString().trim(),
      vendorId: vendorId ? vendorId.toString() : null,
      vendorAgencyName: vendorAgencyName ? vendorAgencyName.toString() : null,
      assignedDriverId: assignedDriverId ? assignedDriverId.toString() : null,
      assignedDriverName: assignedDriverName ? assignedDriverName.toString() : null,
      driverPhone: driverPhone ? driverPhone.toString() : null,
      vehicleModel: vehicleModel ? vehicleModel.toString() : null,
      assignedVehicleReg: assignedVehicleReg ? assignedVehicleReg.toString() : null,
      driverApprovalStatus: driverApprovalStatus ? driverApprovalStatus.toString() : 'PENDING',
      estimatedFare: Number(estimatedFare) || 0,
      advancePaid: Number(advancePaid) || 0,
      remainingFare: Number(remainingFare) || 0,
    };

    if (body.initialMeterKm !== undefined && body.initialMeterKm !== null) payload.initialMeterKm = Number(body.initialMeterKm);
    if (body.finalMeterKm !== undefined && body.finalMeterKm !== null) payload.finalMeterKm = Number(body.finalMeterKm);
    if (body.initialMeterImage) payload.initialMeterImage = body.initialMeterImage.toString();
    if (body.finalMeterImage) payload.finalMeterImage = body.finalMeterImage.toString();
    if (body.startMeterReading !== undefined && body.startMeterReading !== null) payload.startMeterReading = Number(body.startMeterReading);
    if (body.tollCharges !== undefined && body.tollCharges !== null) payload.tollCharges = Number(body.tollCharges);
    if (body.tollReceiptImage) payload.tollReceiptImage = body.tollReceiptImage.toString();
    if (body.tripStartedAt) payload.tripStartedAt = body.tripStartedAt.toString();
    if (body.tripCompletedAt) payload.tripCompletedAt = body.tripCompletedAt.toString();

    const booking = await prisma.adminBooking.upsert({
      where: { bookingReference: payload.bookingReference },
      create: payload,
      update: payload,
    });

    return NextResponse.json({ success: true, data: booking });
  } catch (error: any) {
    console.error('Error creating/upserting admin booking in DB:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { bookingReference, updates } = body;

    if (!bookingReference || !updates) {
      return NextResponse.json({ success: false, error: 'Booking reference and updates object are required.' }, { status: 400 });
    }

    const booking = await prisma.adminBooking.update({
      where: { bookingReference: bookingReference.toString().trim() },
      data: updates,
    });

    return NextResponse.json({ success: true, data: booking });
  } catch (error: any) {
    console.error('Error updating admin booking in DB:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingReference = searchParams.get('bookingReference');
    const all = searchParams.get('all');

    if (all === 'true') {
      await prisma.adminBooking.deleteMany({});
      return NextResponse.json({ success: true, message: 'All bookings cleared' });
    }

    if (bookingReference) {
      await prisma.adminBooking.delete({
        where: { bookingReference },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Must specify bookingReference or all=true' }, { status: 400 });
  } catch (error: any) {
    console.error('Error deleting admin booking from DB:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error' }, { status: 500 });
  }
}
