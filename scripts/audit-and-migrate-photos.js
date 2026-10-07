require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes('connection_limit')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${separator}connection_limit=10&pool_timeout=60`;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kkerjotsahmkwbldjdhf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET_NAME = 'kandy-trip-photos';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const isDryRun = process.argv.includes('--dry-run');

function parseBase64(dataUri) {
  if (typeof dataUri !== 'string') return null;
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/s);
  if (match) {
    const mimeType = match[1];
    const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1] || 'jpg';
    const buffer = Buffer.from(match[2], 'base64');
    return { buffer, mimeType, extension };
  }
  if (dataUri.length > 500 && !dataUri.startsWith('http://') && !dataUri.startsWith('https://') && !dataUri.startsWith('/')) {
    try {
      const buffer = Buffer.from(dataUri, 'base64');
      return { buffer, mimeType: 'image/jpeg', extension: 'jpg' };
    } catch {
      return null;
    }
  }
  return null;
}

async function uploadFileWithFallback(relStoragePath, buffer, contentType) {
  // 1. Attempt Supabase Storage upload
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(relStoragePath, buffer, {
      contentType,
      upsert: true,
    });
    if (!error && data) {
      const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(relStoragePath);
      return { url: publicUrlData.publicUrl, target: 'supabase_storage' };
    }
  } catch (e) {
    // Fallthrough to local upload fallback
  }

  // 2. Local uploads directory fallback (Task #1 storage architecture)
  const localTargetDir = path.join(process.cwd(), 'apps', 'web', 'public', 'uploads', path.dirname(relStoragePath));
  if (!fs.existsSync(localTargetDir)) {
    fs.mkdirSync(localTargetDir, { recursive: true });
  }
  const fullFilePath = path.join(localTargetDir, path.basename(relStoragePath));
  fs.writeFileSync(fullFilePath, buffer);
  const localUrl = `/uploads/${relStoragePath.replace(/\\/g, '/')}`;
  return { url: localUrl, target: 'local_uploads' };
}

async function retry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`[Retry ${i + 1}/${retries}] Waiting ${delay}ms after: ${e.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function run() {
  console.log('=================================================================');
  console.log(`🔍 KANDY CABS PHOTO AUDIT & MIGRATION TOOL [Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE MIGRATION'}]`);
  console.log('=================================================================\n');

  // 1. Audit Booking records
  const bookings = await retry(() =>
    prisma.booking.findMany({
      select: {
        id: true,
        humanReadableRef: true,
        startingOdometerImagePath: true,
        finalOdometerImagePath: true,
        vehicleInspectionPhotos: true,
      },
    })
  );

  // 2. Audit Driver records
  const drivers = await retry(() =>
    prisma.driver.findMany({
      select: {
        id: true,
        userId: true,
        profilePhotoUrl: true,
        licenseDocUrl: true,
        rcDocUrl: true,
        insuranceDocUrl: true,
        vehiclePhotos: true,
      },
    })
  );

  let totalBookingImages = 0;
  let affectedBookings = 0;
  let totalBookingB64Bytes = 0;
  const bookingOperations = [];

  for (const b of bookings) {
    let bookingHasB64 = false;
    let bBytes = 0;
    const updates = {};

    // Starting Odometer
    const startParsed = parseBase64(b.startingOdometerImagePath);
    if (startParsed) {
      bookingHasB64 = true;
      totalBookingImages++;
      bBytes += b.startingOdometerImagePath.length;
      totalBookingB64Bytes += b.startingOdometerImagePath.length;
      updates.startingOdometer = {
        path: `bookings/${b.id}/start/odometer_${Date.now()}.${startParsed.extension}`,
        ...startParsed,
      };
    }

    // Final Odometer
    const finalParsed = parseBase64(b.finalOdometerImagePath);
    if (finalParsed) {
      bookingHasB64 = true;
      totalBookingImages++;
      bBytes += b.finalOdometerImagePath.length;
      totalBookingB64Bytes += b.finalOdometerImagePath.length;
      updates.finalOdometer = {
        path: `bookings/${b.id}/complete/odometer_${Date.now()}.${finalParsed.extension}`,
        ...finalParsed,
      };
    }

    // Vehicle Inspection Photos
    if (Array.isArray(b.vehicleInspectionPhotos)) {
      const inspectionUpdates = [];
      let inspectionHasB64 = false;
      for (let i = 0; i < b.vehicleInspectionPhotos.length; i++) {
        const photoStr = b.vehicleInspectionPhotos[i];
        const inspParsed = parseBase64(photoStr);
        if (inspParsed) {
          bookingHasB64 = true;
          inspectionHasB64 = true;
          totalBookingImages++;
          bBytes += photoStr.length;
          totalBookingB64Bytes += photoStr.length;
          inspectionUpdates.push({
            index: i,
            path: `bookings/${b.id}/inspection/photo_${i}_${Date.now()}.${inspParsed.extension}`,
            ...inspParsed,
          });
        }
      }
      if (inspectionHasB64) {
        updates.inspection = inspectionUpdates;
      }
    }

    if (bookingHasB64) {
      affectedBookings++;
      bookingOperations.push({ id: b.id, ref: b.humanReadableRef, sizeKB: Math.round(bBytes / 1024), updates });
    }
  }

  // 3. Audit Driver vehiclePhotos
  let affectedDrivers = 0;
  let totalDriverB64Bytes = 0;
  let totalDriverImages = 0;
  const driverOperations = [];

  for (const d of drivers) {
    let driverHasB64 = false;
    let dBytes = 0;
    const updates = {};

    if (Array.isArray(d.vehiclePhotos)) {
      const vPhotoUpdates = [];
      for (let i = 0; i < d.vehiclePhotos.length; i++) {
        const photoStr = d.vehiclePhotos[i];
        const vParsed = parseBase64(photoStr);
        if (vParsed) {
          driverHasB64 = true;
          totalDriverImages++;
          dBytes += photoStr.length;
          totalDriverB64Bytes += photoStr.length;
          vPhotoUpdates.push({
            index: i,
            path: `drivers/${d.id}/vehicles/photo_${i}_${Date.now()}.${vParsed.extension}`,
            ...vParsed,
          });
        }
      }
      if (vPhotoUpdates.length > 0) updates.vehiclePhotos = vPhotoUpdates;
    }

    if (driverHasB64) {
      affectedDrivers++;
      driverOperations.push({ id: d.id, sizeKB: Math.round(dBytes / 1024), updates });
    }
  }

  console.log('--- AUDIT REPORT ---');
  console.log(`Total Bookings Inspected: ${bookings.length}`);
  console.log(`Affected Bookings with Base64: ${affectedBookings}`);
  console.log(`Affected Booking Image Fields: ${totalBookingImages}`);
  console.log(`Total Booking Base64 Size: ${(totalBookingB64Bytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Affected Drivers with Base64 Photos: ${affectedDrivers}`);
  console.log(`Affected Driver Vehicle Photos: ${totalDriverImages}`);
  console.log(`Total Driver Base64 Size: ${(totalDriverB64Bytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Grand Total Base64 Storage: ${((totalBookingB64Bytes + totalDriverB64Bytes) / (1024 * 1024)).toFixed(2)} MB\n`);

  if (isDryRun) {
    console.log('\n[Dry-Run Complete] No files were uploaded and no database records were modified.');
    console.log(`Would migrate: ${totalBookingImages + totalDriverImages} images.`);
    console.log(`Would update: ${affectedBookings} bookings and ${affectedDrivers} drivers.`);
    await prisma.$disconnect();
    return;
  }

  // Real Migration Execution
  console.log('--- EXECUTING LIVE MIGRATION ---');
  let migratedCount = 0;
  let failedCount = 0;
  const failedOps = [];

  // Migrate Bookings
  for (const op of bookingOperations) {
    const dataToUpdate = {};

    if (op.updates.startingOdometer) {
      try {
        const res = await uploadFileWithFallback(op.updates.startingOdometer.path, op.updates.startingOdometer.buffer, op.updates.startingOdometer.mimeType);
        dataToUpdate.startingOdometerImagePath = res.url;
        migratedCount++;
      } catch (err) {
        failedCount++;
        failedOps.push({ id: op.id, field: 'startingOdometer', error: err.message });
      }
    }

    if (op.updates.finalOdometer) {
      try {
        const res = await uploadFileWithFallback(op.updates.finalOdometer.path, op.updates.finalOdometer.buffer, op.updates.finalOdometer.mimeType);
        dataToUpdate.finalOdometerImagePath = res.url;
        migratedCount++;
      } catch (err) {
        failedCount++;
        failedOps.push({ id: op.id, field: 'finalOdometer', error: err.message });
      }
    }

    if (op.updates.inspection) {
      const currentBooking = await prisma.booking.findUnique({ where: { id: op.id }, select: { vehicleInspectionPhotos: true } });
      const newArray = [...(currentBooking.vehicleInspectionPhotos || [])];
      for (const item of op.updates.inspection) {
        try {
          const res = await uploadFileWithFallback(item.path, item.buffer, item.mimeType);
          newArray[item.index] = res.url;
          migratedCount++;
        } catch (err) {
          failedCount++;
          failedOps.push({ id: op.id, field: `inspection[${item.index}]`, error: err.message });
        }
      }
      dataToUpdate.vehicleInspectionPhotos = newArray;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.booking.update({
        where: { id: op.id },
        data: dataToUpdate,
      });
      console.log(`✓ Migrated booking ${op.ref} (${op.id})`);
    }
  }

  // Migrate Drivers
  for (const op of driverOperations) {
    if (op.updates.vehiclePhotos) {
      const currentDriver = await prisma.driver.findUnique({ where: { id: op.id }, select: { vehiclePhotos: true } });
      const newArray = [...(currentDriver.vehiclePhotos || [])];
      for (const item of op.updates.vehiclePhotos) {
        try {
          const res = await uploadFileWithFallback(item.path, item.buffer, item.mimeType);
          newArray[item.index] = res.url;
          migratedCount++;
        } catch (err) {
          failedCount++;
          failedOps.push({ id: op.id, field: `driverVehiclePhotos[${item.index}]`, error: err.message });
        }
      }
      await prisma.driver.update({
        where: { id: op.id },
        data: { vehiclePhotos: newArray },
      });
      console.log(`✓ Migrated driver ${op.id} vehicle photos`);
    }
  }

  console.log('\n--- MIGRATION RESULTS ---');
  console.log(`Successfully Migrated & Updated: ${migratedCount} images`);
  console.log(`Failed Migrations: ${failedCount}`);
  if (failedOps.length > 0) {
    console.log('Failed Operations Details:', failedOps);
  }

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Migration error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
