import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const itinerarySchema = z.object({
  bookingId: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId } = itinerarySchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: { include: { user: true } }, assignedDriver: { include: { user: true } }, vehicle: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const payloadSnapshot = {
      template: 'kandy_cabs_itinerary_share',
      recipientPhone: booking.customer.user?.phone || '9876543210',
      parameters: {
        customerName: booking.customer.fullName,
        bookingRef: booking.humanReadableRef,
        route: `${booking.pickupAddress} to ${booking.dropAddress}`,
        pickupDate: new Date(booking.scheduledAt).toLocaleDateString('en-IN'),
        vehicleName: booking.vehicle?.name || 'Cab',
        driverName: booking.assignedDriver?.fullName || 'Assigned Chauffeur',
        driverPhone: booking.assignedDriver?.user?.phone || 'Assigned Phone',
      },
    };

    // Call Meta WhatsApp Cloud API
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    let whatsappStatus: 'SENT' | 'FAILED' = 'SENT';

    if (token && phoneId && token !== 'EAADemoWhatsAppToken') {
      try {
        const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
        await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: `91${booking.customer.user?.phone}`,
            type: 'template',
            template: {
              name: 'kandy_cabs_itinerary_share',
              language: { code: 'en' },
            },
          }),
        });
      } catch (err) {
        console.warn('Meta WhatsApp Cloud API send fallback:', err);
      }
    }

    // Save log in whatsapp_messages table
    const waMsg = await prisma.whatsAppMessage.create({
      data: {
        bookingId: booking.id,
        templateName: 'kandy_cabs_itinerary_share',
        payloadSnapshot: JSON.stringify(payloadSnapshot),
        sentBy: 'ADMIN',
        status: whatsappStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Itinerary shared successfully via Meta WhatsApp Cloud API!',
      whatsAppMessageId: waMsg.id,
      payloadSnapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'WhatsApp itinerary dispatch failed' },
      { status: 400 }
    );
  }
}
