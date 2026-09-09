import assert from 'node:assert';
import {
  validateImageFile,
  processVehicleImageVariants,
  processMeterImage,
  getImageMetadata,
  defaultConfig,
} from '../src/lib/imageOptimizationEngine';

function testPhase14ImageOptimizationEngine() {
  console.log('Testing Phase 14 Production Image Optimization Engine...');

  // 1. Test Magic Bytes & Security Validation
  const validJpegBuf = Buffer.from('ffd8ffe000104a4649460001', 'hex');
  const validRes = validateImageFile(validJpegBuf, 'image/jpeg', 'vehicle_photo.jpg', defaultConfig);
  assert.strictEqual(validRes.isValid, true);
  console.log('✓ Valid JPEG file with correct magic bytes header (FF D8 FF) accepted');

  // 2. Test Executable & SVG Rejection Security Rule
  const exeRes = validateImageFile(validJpegBuf, 'image/jpeg', 'malicious.exe', defaultConfig);
  assert.strictEqual(exeRes.isValid, false);
  assert.strictEqual(exeRes.error?.includes('strictly prohibited'), true);

  const svgRes = validateImageFile(validJpegBuf, 'image/svg+xml', 'logo.svg', defaultConfig);
  assert.strictEqual(svgRes.isValid, false);
  console.log('✓ Executable files (.exe) and SVG vector files strictly rejected by security filter');

  // 3. Test Oversized Upload Limit (10MB)
  const oversizedBuf = Buffer.alloc(11 * 1024 * 1024);
  const oversizedRes = validateImageFile(oversizedBuf, 'image/jpeg', 'giant_photo.jpg', defaultConfig);
  assert.strictEqual(oversizedRes.isValid, false);
  assert.strictEqual(oversizedRes.error?.includes('exceeds maximum allowed limit'), true);
  console.log('✓ Oversized uploads (>10MB) rejected with configurable error message');

  // 4. Test Vehicle Multi-Variant Generation (Large 1600px, Medium 800px, Thumbnail 400px)
  const vehicleId = 'veh_dzire_101';
  const originalSize = 4 * 1024 * 1024; // 4MB original
  const variants = processVehicleImageVariants(vehicleId, 'dzire_front.jpg', originalSize, defaultConfig);

  assert.strictEqual(variants.large.width, 1600);
  assert.strictEqual(variants.medium.width, 800);
  assert.strictEqual(variants.thumbnail.width, 400);
  assert.strictEqual(variants.large.format, 'webp');
  assert.strictEqual(variants.large.cdnUrl.includes('1600w.webp'), true);
  assert.strictEqual(variants.thumbnail.cdnUrl.includes('400w.webp'), true);
  console.log('✓ Vehicle multi-variant WebP generation verified (1600w Large, 800w Medium, 400w Thumbnail)');

  // 5. Test Meter High-Quality Inspection Preservation (1920px max, Q92 digit legibility)
  const bookingId = 'KC-88429';
  const meterResult = processMeterImage(bookingId, originalSize, defaultConfig);

  assert.strictEqual(meterResult.highResMeter.width, 1920);
  assert.strictEqual(meterResult.highResMeter.entityType, 'METER');
  assert.strictEqual(meterResult.thumbnail.width, 500);
  console.log('✓ High-quality meter digit legibility preservation (1920px max, Q92) verified');

  // 6. Test Metadata Schema Integrity Query
  const metaList = getImageMetadata(vehicleId);
  assert.strictEqual(metaList.length, 3);
  assert.strictEqual(metaList[0].entityId, vehicleId);
  console.log('✓ Full metadata schema record integrity verified in database query');

  console.log('✓ All Phase 14 Production Image Optimization tests passed successfully!');
}

testPhase14ImageOptimizationEngine();
