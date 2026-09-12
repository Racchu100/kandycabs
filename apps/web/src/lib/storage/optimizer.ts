import sharp from 'sharp';

export interface OptimizedFileResult {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  originalSize: number;
  optimizedSize: number;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);

export function validateUploadFile(fileBuffer: Buffer, filename: string, mimeType: string) {
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File "${filename}" exceeds maximum allowed size of 10MB.`);
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type .${ext} is not supported. Allowed: JPG, PNG, WEBP, PDF.`);
  }

  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase()) && mimeType !== 'application/octet-stream') {
    throw new Error(`MIME type ${mimeType} is not permitted.`);
  }
}

export async function optimizeUploadFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  category: 'documents' | 'vehicle'
): Promise<OptimizedFileResult> {
  const originalSize = fileBuffer.length;
  validateUploadFile(fileBuffer, filename, mimeType);

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // Pass through PDFs without image manipulation
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return {
      buffer: fileBuffer,
      mimeType: 'application/pdf',
      extension: 'pdf',
      originalSize,
      optimizedSize: originalSize,
    };
  }

  try {
    // Process image with Sharp
    const maxDimension = category === 'documents' ? 1600 : 2000;
    const quality = category === 'documents' ? 80 : 85;

    const metadata = await sharp(fileBuffer).metadata();

    let pipeline = sharp(fileBuffer);

    // Only resize down if dimensions exceed maximum
    if (metadata.width && metadata.height) {
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        pipeline = pipeline.resize({
          width: metadata.width > metadata.height ? maxDimension : undefined,
          height: metadata.height >= metadata.width ? maxDimension : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // Convert to WebP format for high compression ratio
    const optimizedBuffer = await pipeline
      .webp({ quality, effort: 4 })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      mimeType: 'image/webp',
      extension: 'webp',
      originalSize,
      optimizedSize: optimizedBuffer.length,
    };
  } catch (err: any) {
    console.warn(`[ImageOptimizer] Sharp optimization fallback for ${filename}:`, err?.message);
    // Fallback to original buffer if sharp processing fails
    return {
      buffer: fileBuffer,
      mimeType: mimeType || 'image/jpeg',
      extension: ext || 'jpeg',
      originalSize,
      optimizedSize: originalSize,
    };
  }
}
