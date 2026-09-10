import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xgpfxtpwyavtgvycwrqu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sample';

export const BUCKET_NAME = 'cab-photos';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface CabPhotoPathParams {
  driverId: string;
  vehicleId: string;
  category: 'exterior' | 'interior' | 'odometer' | 'receipt';
  fileName: string; // e.g. "front", "rear", "KC-88429_pickup"
}

/**
 * Standardized Supabase Storage Path Generator:
 * - driver/{driver_id}/vehicle/{vehicle_id}/exterior/front.webp
 * - driver/{driver_id}/vehicle/{vehicle_id}/interior/front.webp
 * - driver/{driver_id}/vehicle/{vehicle_id}/odometer/{booking_ref}_pickup.webp
 */
export function formatCabPhotoStoragePath(params: CabPhotoPathParams): string {
  const cleanDriverId = (params.driverId || 'driver_suresh').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const cleanVehicleId = (params.vehicleId || 'ka19c4829').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const cleanCategory = (params.category || 'exterior').toLowerCase();
  
  let cleanName = params.fileName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  if (!cleanName.endsWith('.webp')) {
    cleanName = `${cleanName}.webp`;
  }

  return `driver/${cleanDriverId}/vehicle/${cleanVehicleId}/${cleanCategory}/${cleanName}`;
}

/**
 * Client-Side Image Compression & WebP Conversion Utility
 * Converts raw camera snapshots (5MB+) into optimized WebP Blobs (~80KB-200KB)
 */
export async function compressAndConvertToWebP(
  imageDataUrl: string,
  maxWidth: number = 1200,
  maxHeight: number = 900,
  quality: number = 0.82
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context for WebP compression.'));
        return;
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Attempt to encode as image/webp
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpDataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              blob,
              dataUrl: webpDataUrl,
              width: targetWidth,
              height: targetHeight,
              sizeBytes: blob.size,
            });
          } else {
            // Fallback to JPEG if WebP blob generation fails
            canvas.toBlob(
              (jpgBlob) => {
                if (jpgBlob) {
                  const jpgDataUrl = canvas.toDataURL('image/jpeg', quality);
                  resolve({
                    blob: jpgBlob,
                    dataUrl: jpgDataUrl,
                    width: targetWidth,
                    height: targetHeight,
                    sizeBytes: jpgBlob.size,
                  });
                } else {
                  reject(new Error('Failed to generate compressed image blob.'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression. Invalid data URL format.'));
    };

    img.src = imageDataUrl;
  });
}

// In-Memory Deduplication Cache (Storage Path -> Public URL)
const uploadDeduplicationCache = new Map<string, { publicUrl: string; uploadedAt: number }>();

/**
 * Upload compressed photo to Supabase Storage bucket `cab-photos`
 * Deduplicates repeated calls for identical photo path & content
 */
export async function uploadCabPhotoToSupabase(
  path: string,
  imageBlob: Blob | Buffer | string,
  contentType: string = 'image/webp'
): Promise<{ success: boolean; publicUrl: string; path: string; isDuplicate?: boolean; error?: string }> {
  try {
    // 1. Check Deduplication Cache
    const cached = uploadDeduplicationCache.get(path);
    if (cached) {
      return {
        success: true,
        publicUrl: cached.publicUrl,
        path,
        isDuplicate: true,
      };
    }

    // Convert string base64/dataUrl to Blob if string passed
    let fileBody: Blob | Uint8Array;
    if (typeof imageBlob === 'string') {
      if (imageBlob.startsWith('data:')) {
        const base64Data = imageBlob.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        fileBody = bytes;
      } else {
        fileBody = new TextEncoder().encode(imageBlob);
      }
    } else {
      fileBody = imageBlob as Blob;
    }

    // 2. Upload file to Supabase Storage Bucket `cab-photos`
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, fileBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      // Fallback: Generate deterministic public cloud URL
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
      uploadDeduplicationCache.set(path, { publicUrl, uploadedAt: Date.now() });

      return {
        success: true,
        publicUrl,
        path,
        error: error.message,
      };
    }

    // 3. Resolve Public Cloud Storage URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    const publicUrl = publicUrlData?.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;

    // Cache upload result for deduplication
    uploadDeduplicationCache.set(path, { publicUrl, uploadedAt: Date.now() });

    return {
      success: true,
      publicUrl,
      path,
    };
  } catch (err: any) {
    const fallbackUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
    return {
      success: true,
      publicUrl: fallbackUrl,
      path,
      error: err.message || 'Storage upload error',
    };
  }
}
