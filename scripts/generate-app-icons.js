const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createIcons() {
  const rootDir = path.join(__dirname, '..');
  const logoPath = path.join(rootDir, 'apps/driver-app/assets/images/kandy-cabs-logo-original.png');
  const logoBuffer = await sharp(logoPath).trim().toBuffer();

  // -------------------------------------------------------------
  // 1. Customer App Assets
  // -------------------------------------------------------------
  console.log('Generating Customer App icons...');

  // Customer icon.png (1024x1024)
  const custLogoResized = await sharp(logoBuffer)
    .resize({ width: 840, height: 640, fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: custLogoResized, gravity: 'center' }])
    .png()
    .toFile(path.join(rootDir, 'apps/customer-app/assets/icon.png'));

  // Customer adaptive-icon.png (1024x1024, foreground inside 640px circle)
  const custAdaptiveResized = await sharp(logoBuffer)
    .resize({ width: 620, height: 420, fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: custAdaptiveResized, gravity: 'center' }])
    .png()
    .toFile(path.join(rootDir, 'apps/customer-app/assets/adaptive-icon.png'));

  // Customer splash.png (1284x2778)
  const custSplashResized = await sharp(logoBuffer)
    .resize({ width: 750, height: 600, fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: custSplashResized, gravity: 'center' }])
    .png()
    .toFile(path.join(rootDir, 'apps/customer-app/assets/splash.png'));

  // Customer favicon.png (192x192)
  const custFaviconResized = await sharp(logoBuffer)
    .resize({ width: 160, height: 120, fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: custFaviconResized, gravity: 'center' }])
    .png()
    .toFile(path.join(rootDir, 'apps/customer-app/assets/favicon.png'));

  // -------------------------------------------------------------
  // 2. Driver App Assets
  // -------------------------------------------------------------
  console.log('Generating Driver App icons with DRIVER badge...');

  const driverBadgeSvg = Buffer.from(`
    <svg width="380" height="90" viewBox="0 0 380 90" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="380" height="90" rx="45" fill="#0f172a" />
      <rect x="3" y="3" width="374" height="84" rx="42" fill="none" stroke="#f59e0b" stroke-width="3" />
      <text x="190" y="58" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="40" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="8">DRIVER</text>
    </svg>
  `);

  const driverBadgePng = await sharp(driverBadgeSvg).png().toBuffer();

  // Driver icon.png (1024x1024)
  const driverLogoResized = await sharp(logoBuffer)
    .resize({ width: 720, height: 400, fit: 'inside' })
    .toBuffer();

  const driverLogoMeta = await sharp(driverLogoResized).metadata();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: driverLogoResized, top: Math.round((560 - driverLogoMeta.height) / 2) + 120, left: Math.round((1024 - driverLogoMeta.width) / 2) },
      { input: driverBadgePng, top: 700, left: Math.round((1024 - 380) / 2) }
    ])
    .png()
    .toFile(path.join(rootDir, 'apps/driver-app/assets/icon.png'));

  // Driver adaptive-icon.png (1024x1024)
  const driverAdaptiveBadgeSvg = Buffer.from(`
    <svg width="300" height="70" viewBox="0 0 300 70" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="300" height="70" rx="35" fill="#0f172a" />
      <rect x="3" y="3" width="294" height="64" rx="32" fill="none" stroke="#f59e0b" stroke-width="2.5" />
      <text x="150" y="46" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="30" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="6">DRIVER</text>
    </svg>
  `);
  const driverAdaptiveBadgePng = await sharp(driverAdaptiveBadgeSvg).png().toBuffer();

  const driverAdaptiveLogoResized = await sharp(logoBuffer)
    .resize({ width: 560, height: 320, fit: 'inside' })
    .toBuffer();
  const driverAdaptiveLogoMeta = await sharp(driverAdaptiveLogoResized).metadata();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: driverAdaptiveLogoResized, top: Math.round((500 - driverAdaptiveLogoMeta.height) / 2) + 240, left: Math.round((1024 - driverAdaptiveLogoMeta.width) / 2) },
      { input: driverAdaptiveBadgePng, top: 680, left: Math.round((1024 - 300) / 2) }
    ])
    .png()
    .toFile(path.join(rootDir, 'apps/driver-app/assets/adaptive-icon.png'));

  // Driver splash.png (1284x2778)
  const driverSplashLogoResized = await sharp(logoBuffer)
    .resize({ width: 700, height: 420, fit: 'inside' })
    .toBuffer();
  const driverSplashLogoMeta = await sharp(driverSplashLogoResized).metadata();

  await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: driverSplashLogoResized, top: Math.round((2778 - driverSplashLogoMeta.height) / 2) - 60, left: Math.round((1284 - driverSplashLogoMeta.width) / 2) },
      { input: driverBadgePng, top: Math.round((2778 - driverSplashLogoMeta.height) / 2) + driverSplashLogoMeta.height + 20, left: Math.round((1284 - 380) / 2) }
    ])
    .png()
    .toFile(path.join(rootDir, 'apps/driver-app/assets/splash.png'));

  // Driver favicon.png (192x192)
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([{ input: custFaviconResized, gravity: 'center' }])
    .png()
    .toFile(path.join(rootDir, 'apps/driver-app/assets/favicon.png'));

  console.log('✅ All Customer & Driver app icons generated with official Kandy Cabs branding!');
}

createIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
