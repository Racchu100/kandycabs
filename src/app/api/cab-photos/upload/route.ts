import { NextResponse } from 'next/server';
import { formatCabPhotoStoragePath, uploadCabPhotoToSupabase } from '@/lib/supabaseStorage';
import { recordMeterEvidence } from '@/lib/tripVerificationEngine';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      driverId = 'driver_suresh',
      vehicleId = 'ka19c4829',
      category = 'odometer',
      fileName,
      imageDataUrl,
      bookingId,
      captureType,
      latitude = 12.9141,
      longitude = 74.8560,
      accuracyMeters = 4.5,
      odometerReadingKm = 12450,
    } = body;

    if (!imageDataUrl) {
      return NextResponse.json({ success: false, error: 'imageDataUrl is required' }, { status: 400 });
    }

    const cleanFileName = fileName || `${bookingId || 'photo'}_${Date.now()}`;

    // 1. Generate Structured Supabase Storage Path
    const storagePath = formatCabPhotoStoragePath({
      driverId,
      vehicleId,
      category,
      fileName: cleanFileName,
    });

    // 2. Upload Compressed WebP File to Supabase Storage Bucket `cab-photos`
    const uploadResult = await uploadCabPhotoToSupabase(storagePath, imageDataUrl, 'image/webp');

    const publicUrl = (uploadResult.success && uploadResult.publicUrl) ? uploadResult.publicUrl : imageDataUrl;

    // 3. Save Supabase Storage Public URL to Supabase Database
    if (bookingId) {
      const cleanCaptureType = captureType === 'DROPOFF_METER' ? 'DROPOFF_METER' : 'PICKUP_METER';
      try {
        recordMeterEvidence(
          bookingId,
          driverId,
          cleanCaptureType,
          latitude,
          longitude,
          accuracyMeters,
          odometerReadingKm,
          publicUrl
        );
      } catch {}

      try {
        const updateData: any = {};
        if (cleanCaptureType === 'PICKUP_METER') {
          updateData.initialMeterImage = publicUrl;
          updateData.initialMeterKm = odometerReadingKm;
        } else {
          updateData.finalMeterImage = publicUrl;
          updateData.finalMeterKm = odometerReadingKm;
        }

        await prisma.adminBooking.updateMany({
          where: {
            OR: [
              { bookingReference: bookingId },
              { id: bookingId },
            ],
          },
          data: updateData,
        });
      } catch (dbErr) {
        console.warn('DB record update note:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      path: storagePath,
      isDuplicate: uploadResult.isDuplicate || false,
    });
  } catch (err: any) {
    console.error('Error in cab photo upload API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process cab photo cloud upload' },
      { status: 500 }
    );
  }
}
