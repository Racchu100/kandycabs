import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('photo')) as File | null;
    const type = (formData.get('type') as string) || 'start_odometer';
    const bookingId = (formData.get('bookingId') as string) || 'temp';

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Local directory structure
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'odometers', bookingId);
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `${type}_${Date.now()}.webp`;
    const fullPath = path.join(uploadDir, filename);

    // Process & optimize image with sharp
    try {
      await sharp(buffer)
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(fullPath);
    } catch (sharpErr) {
      // Fallback if non-image/pdf or sharp error
      await fs.writeFile(fullPath, buffer);
    }

    const relativePath = `/uploads/odometers/${bookingId}/${filename}`;

    return NextResponse.json({
      success: true,
      message: 'Odometer image uploaded & optimized successfully!',
      filePath: relativePath,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to upload odometer image' },
      { status: 400 }
    );
  }
}
