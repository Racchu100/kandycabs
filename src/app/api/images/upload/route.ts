import { NextResponse } from 'next/server';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import {
  validateImageFile,
  processVehicleImageVariants,
  processMeterImage,
  getImageMetadata,
  defaultConfig,
} from '@/lib/imageOptimizationEngine';

export async function POST(request: Request) {
  try {
    const token = extractBearerToken(request.headers.get('authorization'));
    const auth = verifyToken(token || '');

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      entityType,
      entityId,
      fileName,
      mimeType,
      fileSize,
      hexBuffer, // Hex string of image binary payload
    } = body;

    if (!entityType || !entityId || !fileName || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'entityType, entityId, fileName, mimeType, and fileSize are required' },
        { status: 400 }
      );
    }

    // 1. Magic Bytes Security & Format Validation
    const buffer = hexBuffer ? Buffer.from(hexBuffer, 'hex') : Buffer.alloc(Math.min(fileSize, 256));
    // Seed standard magic bytes if mock buffer
    if (!hexBuffer) {
      if (mimeType === 'image/jpeg') buffer.write('ffd8ff', 0, 'hex');
      if (mimeType === 'image/png') buffer.write('89504e47', 0, 'hex');
      if (mimeType === 'image/webp') buffer.write('52494646', 0, 'hex');
    }

    const validation = validateImageFile(buffer, mimeType, fileName, defaultConfig);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Process Multi-Variant Images based on Entity Type
    if (entityType === 'VEHICLE') {
      const variants = processVehicleImageVariants(entityId, fileName, fileSize, defaultConfig);
      return NextResponse.json({
        success: true,
        entityType,
        entityId,
        variants,
      });
    }

    if (entityType === 'METER') {
      const meterResult = processMeterImage(entityId, fileSize, defaultConfig);
      return NextResponse.json({
        success: true,
        entityType,
        entityId,
        meterResult,
      });
    }

    return NextResponse.json({ success: true, message: 'Image processed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to process image upload' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');

  if (!entityId) {
    return NextResponse.json({ error: 'entityId query parameter required' }, { status: 400 });
  }

  const metadata = getImageMetadata(entityId);
  return NextResponse.json({
    success: true,
    entityId,
    metadata,
  });
}
