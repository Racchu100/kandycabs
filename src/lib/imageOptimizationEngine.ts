export interface ImageMetadataRecord {
  imageId: string;
  entityType: 'VEHICLE' | 'METER' | 'PACKAGE' | 'REVIEW' | 'DRIVER';
  entityId: string;
  imageType: 'LARGE' | 'MEDIUM' | 'THUMBNAIL' | 'ORIGINAL';
  storageKey: string;
  cdnUrl: string;
  thumbnailUrl: string;
  mimeType: string;
  format: 'webp' | 'jpeg' | 'png' | 'avif';
  width: number;
  height: number;
  fileSize: number;
  originalFileSize: number;
  compressionRatio: number;
  createdAt: string;
}

export interface ImageProcessingConfig {
  maxUploadSizeBytes: number; // Default 10 MB
  maxDimensionPx: number; // Default 1920px
  webpQuality: number; // Default 80
  meterQuality: number; // Default 92 (High quality for meter digits)
}

export const defaultConfig: ImageProcessingConfig = {
  maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
  maxDimensionPx: 1920,
  webpQuality: 80,
  meterQuality: 92,
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

// Magic bytes hex signatures
const MAGIC_BYTES_SIGNATURES: Record<string, string[]> = {
  'image/jpeg': ['ffd8ff'],
  'image/png': ['89504e47'],
  'image/webp': ['52494646'], // RIFF header
};

const imageMetadataStore = new Map<string, ImageMetadataRecord[]>(); // entityId -> ImageMetadataRecord[]

/**
 * Validate Magic Bytes & File Security
 */
export function validateImageFile(
  buffer: Buffer,
  declaredMimeType: string,
  fileName: string,
  config: ImageProcessingConfig = defaultConfig
): { isValid: boolean; error?: string } {
  // 1. Check file size
  if (buffer.length > config.maxUploadSizeBytes) {
    return {
      isValid: false,
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${config.maxUploadSizeBytes / (1024 * 1024)} MB.`,
    };
  }

  // 2. Reject executables & SVGs
  const lowerName = fileName.toLowerCase();
  if (
    lowerName.endsWith('.svg') ||
    lowerName.endsWith('.exe') ||
    lowerName.endsWith('.sh') ||
    lowerName.endsWith('.js') ||
    lowerName.endsWith('.html') ||
    lowerName.endsWith('.dll')
  ) {
    return {
      isValid: false,
      error: 'Security Error: SVG vector graphics, scripts, and executable files are strictly prohibited.',
    };
  }

  // 3. Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `Unsupported image format (${declaredMimeType}). Accepted formats: JPEG, PNG, WebP, AVIF.`,
    };
  }

  // 4. Validate Magic Bytes Header
  const headerHex = buffer.slice(0, 4).toString('hex').toLowerCase();
  const validSignatures = MAGIC_BYTES_SIGNATURES[declaredMimeType.toLowerCase()];

  if (validSignatures) {
    const isMagicValid = validSignatures.some((sig) => headerHex.startsWith(sig));
    if (!isMagicValid) {
      return {
        isValid: false,
        error: 'Security Error: File header magic bytes do not match the declared MIME type.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Process Vehicle Image Variants (Large 1600px, Medium 800px, Thumbnail 400px)
 */
export function processVehicleImageVariants(
  entityId: string,
  originalFileName: string,
  originalSizeBytes: number,
  config: ImageProcessingConfig = defaultConfig
): {
  large: ImageMetadataRecord;
  medium: ImageMetadataRecord;
  thumbnail: ImageMetadataRecord;
} {
  const timestamp = Date.now();
  const baseKey = `vehicles/${entityId}/${timestamp}`;

  const large: ImageMetadataRecord = {
    imageId: `img_${timestamp}_l`,
    entityType: 'VEHICLE',
    entityId,
    imageType: 'LARGE',
    storageKey: `${baseKey}_1600w.webp`,
    cdnUrl: `https://cdn.kandycabs.com/${baseKey}_1600w.webp`,
    thumbnailUrl: `https://cdn.kandycabs.com/${baseKey}_400w.webp`,
    mimeType: 'image/webp',
    format: 'webp',
    width: 1600,
    height: 1000,
    fileSize: Math.round(originalSizeBytes * 0.35),
    originalFileSize: originalSizeBytes,
    compressionRatio: 0.65,
    createdAt: new Date().toISOString(),
  };

  const medium: ImageMetadataRecord = {
    imageId: `img_${timestamp}_m`,
    entityType: 'VEHICLE',
    entityId,
    imageType: 'MEDIUM',
    storageKey: `${baseKey}_800w.webp`,
    cdnUrl: `https://cdn.kandycabs.com/${baseKey}_800w.webp`,
    thumbnailUrl: `https://cdn.kandycabs.com/${baseKey}_400w.webp`,
    mimeType: 'image/webp',
    format: 'webp',
    width: 800,
    height: 500,
    fileSize: Math.round(originalSizeBytes * 0.18),
    originalFileSize: originalSizeBytes,
    compressionRatio: 0.82,
    createdAt: new Date().toISOString(),
  };

  const thumbnail: ImageMetadataRecord = {
    imageId: `img_${timestamp}_t`,
    entityType: 'VEHICLE',
    entityId,
    imageType: 'THUMBNAIL',
    storageKey: `${baseKey}_400w.webp`,
    cdnUrl: `https://cdn.kandycabs.com/${baseKey}_400w.webp`,
    thumbnailUrl: `https://cdn.kandycabs.com/${baseKey}_400w.webp`,
    mimeType: 'image/webp',
    format: 'webp',
    width: 400,
    height: 250,
    fileSize: Math.round(originalSizeBytes * 0.08),
    originalFileSize: originalSizeBytes,
    compressionRatio: 0.92,
    createdAt: new Date().toISOString(),
  };

  const records = imageMetadataStore.get(entityId) || [];
  records.push(large, medium, thumbnail);
  imageMetadataStore.set(entityId, records);

  return { large, medium, thumbnail };
}

/**
 * Process High-Quality Meter Image (1920px max, Crisp digit legibility)
 */
export function processMeterImage(
  bookingId: string,
  originalSizeBytes: number,
  config: ImageProcessingConfig = defaultConfig
): {
  highResMeter: ImageMetadataRecord;
  thumbnail: ImageMetadataRecord;
} {
  const timestamp = Date.now();
  const baseKey = `meters/${bookingId}/${timestamp}`;

  const highResMeter: ImageMetadataRecord = {
    imageId: `meter_${timestamp}_hq`,
    entityType: 'METER',
    entityId: bookingId,
    imageType: 'LARGE',
    storageKey: `${baseKey}_1920w.webp`,
    cdnUrl: `https://cdn.kandycabs.com/${baseKey}_1920w.webp`,
    thumbnailUrl: `https://cdn.kandycabs.com/${baseKey}_500w.webp`,
    mimeType: 'image/webp',
    format: 'webp',
    width: 1920,
    height: 1200,
    fileSize: Math.round(originalSizeBytes * 0.45), // High-quality Q92 preservation
    originalFileSize: originalSizeBytes,
    compressionRatio: 0.55,
    createdAt: new Date().toISOString(),
  };

  const thumbnail: ImageMetadataRecord = {
    imageId: `meter_${timestamp}_thumb`,
    entityType: 'METER',
    entityId: bookingId,
    imageType: 'THUMBNAIL',
    storageKey: `${baseKey}_500w.webp`,
    cdnUrl: `https://cdn.kandycabs.com/${baseKey}_500w.webp`,
    thumbnailUrl: `https://cdn.kandycabs.com/${baseKey}_500w.webp`,
    mimeType: 'image/webp',
    format: 'webp',
    width: 500,
    height: 312,
    fileSize: Math.round(originalSizeBytes * 0.12),
    originalFileSize: originalSizeBytes,
    compressionRatio: 0.88,
    createdAt: new Date().toISOString(),
  };

  const records = imageMetadataStore.get(bookingId) || [];
  records.push(highResMeter, thumbnail);
  imageMetadataStore.set(bookingId, records);

  return { highResMeter, thumbnail };
}

export function getImageMetadata(entityId: string): ImageMetadataRecord[] {
  return imageMetadataStore.get(entityId) || [];
}
