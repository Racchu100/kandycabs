import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { storageProvider, optimizeUploadFile } from '@/lib/storage';
import { saveDriverDocuments, getDriverDocuments } from '@/lib/userStore';
import { normalizePhone } from '@kandycabs/shared';
import { prisma, safeDbQuery } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate session
    const cookieStore = cookies();
    const token =
      cookieStore.get('kandy_session')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    let authedPhone: string | null = null;
    let authedUserId: string | null = null;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.phone) authedPhone = normalizePhone(decoded.phone);
      if (decoded?.userId) authedUserId = decoded.userId;
    }

    const contentType = req.headers.get('content-type') || '';

    let phone = authedPhone;
    let licenseNumber = '';
    let vehicleName = '';
    let vehicleNumber = '';
    let isVehicleChange = false;

    // File collection
    const fileEntries: { key: string; category: 'documents' | 'vehicle'; file: File }[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      phone = (formData.get('phone') as string) || (formData.get('driverId') as string) || authedPhone;
      licenseNumber = (formData.get('licenseNumber') as string) || '';
      vehicleName = (formData.get('vehicleName') as string) || '';
      vehicleNumber = (formData.get('vehicleNumber') as string) || '';
      isVehicleChange = formData.get('isVehicleChange') === 'true';

      // Parse document files
      const docKeys = [
        { name: 'license', category: 'documents' as const },
        { name: 'rc', category: 'documents' as const },
        { name: 'insurance', category: 'documents' as const },
        { name: 'vehicleFront', category: 'vehicle' as const },
        { name: 'vehicleBack', category: 'vehicle' as const },
        { name: 'vehicleLeft', category: 'vehicle' as const },
        { name: 'vehicleRight', category: 'vehicle' as const },
        { name: 'vehicleInside', category: 'vehicle' as const },
      ];

      for (const item of docKeys) {
        const file = formData.get(item.name);
        if (file && file instanceof File && file.size > 0) {
          fileEntries.push({ key: item.name, category: item.category, file });
        }
      }
    } else {
      // Fallback for JSON requests
      const body = await req.json();
      phone = body.phone || authedPhone;
      licenseNumber = body.licenseNumber || '';
      vehicleName = body.vehicleName || '';
      vehicleNumber = body.vehicleNumber || '';
      isVehicleChange = body.isVehicleChange || false;
    }

    const cleanPhone = normalizePhone(phone || '8888888888');
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Valid driver phone number is required.' }, { status: 400 });
    }

    const driverId = `d_${cleanPhone}`;

    // Fetch existing driver docs metadata to merge partial updates
    const existingDocs = getDriverDocuments(cleanPhone) || {};

    const documentPaths: { [key: string]: string } = {
      license: existingDocs.licenseDocUrl || '',
      rc: existingDocs.rcDocUrl || '',
      insurance: existingDocs.insuranceDocUrl || '',
    };

    const vehiclePhotoMap: { [key: string]: string } = {
      vehicleFront: existingDocs.vehiclePhotos?.[0] || '',
      vehicleBack: existingDocs.vehiclePhotos?.[1] || '',
      vehicleLeft: existingDocs.vehiclePhotos?.[2] || '',
      vehicleRight: existingDocs.vehiclePhotos?.[3] || '',
      vehicleInside: existingDocs.vehiclePhotos?.[4] || '',
    };

    // Process each uploaded file asynchronously with image optimization
    for (const entry of fileEntries) {
      const arrayBuffer = await entry.file.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      // Compress and optimize image (target WebP max ~1600-2000px)
      const optimized = await optimizeUploadFile(
        rawBuffer,
        entry.file.name,
        entry.file.type,
        entry.category
      );

      // Save optimized file via Storage Provider
      const result = await storageProvider.uploadFile(driverId, entry.category, entry.key, {
        buffer: optimized.buffer,
        filename: `${entry.key}.${optimized.extension}`,
        mimeType: optimized.mimeType,
        size: optimized.optimizedSize,
      });

      if (entry.category === 'documents') {
        documentPaths[entry.key] = result.path;
      } else {
        vehiclePhotoMap[entry.key] = result.path;
      }
    }

    // Build ordered array of vehicle photos (Front, Back, Left, Right, Inside)
    const vehiclePhotos = [
      vehiclePhotoMap.vehicleFront || '',
      vehiclePhotoMap.vehicleBack || '',
      vehiclePhotoMap.vehicleLeft || '',
      vehiclePhotoMap.vehicleRight || '',
      vehiclePhotoMap.vehicleInside || '',
    ];

    // Save lightweight path references to RAM registry & PostgreSQL database
    const docRecord = saveDriverDocuments(cleanPhone, {
      licenseNumber: licenseNumber || existingDocs.licenseNumber,
      licenseDocUrl: documentPaths.license,
      rcDocUrl: documentPaths.rc,
      insuranceDocUrl: documentPositionsToPath(documentPaths.insurance),
      vehiclePhotos,
      vehicleName: vehicleName || existingDocs.vehicleName,
      vehicleNumber: vehicleNumber || existingDocs.vehicleNumber,
      isVehicleChange,
    });

    console.log(`[DRIVER DOCS API] Processed ${fileEntries.length} document uploads for driver +91 ${cleanPhone}`);

    return NextResponse.json({
      success: true,
      message: 'Driver documents uploaded and stored successfully!',
      documents: {
        license: documentPaths.license,
        rc: documentPaths.rc,
        insurance: documentPaths.insurance,
      },
      vehiclePhotos,
      docRecord,
    });
  } catch (err: any) {
    console.error('[DRIVER DOCS API Error]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to upload driver documents' },
      { status: 500 }
    );
  }
}

function documentPositionsToPath(val: string) {
  return val || undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let phone = searchParams.get('phone');

    if (!phone) {
      const cookieStore = cookies();
      const token =
        cookieStore.get('kandy_session')?.value ||
        req.headers.get('authorization')?.replace('Bearer ', '');
      if (token) {
        const decoded = verifyToken(token);
        if (decoded?.phone) {
          phone = decoded.phone;
        }
      }
    }

    const cleanPhone = normalizePhone(phone || '8888888888');
    const docs = getDriverDocuments(cleanPhone);

    return NextResponse.json({ success: true, docs });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch driver documents' },
      { status: 500 }
    );
  }
}
