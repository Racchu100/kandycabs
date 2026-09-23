const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imagesDir = path.join(__dirname, '..', 'public', 'images');
const publicDir = path.join(__dirname, '..', 'public');

async function convertDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const baseName = path.basename(file, ext);
      const inputPath = path.join(dir, file);
      const outputPath = path.join(dir, `${baseName}.webp`);
      
      const inputStats = fs.statSync(inputPath);
      console.log(`Converting ${file} (${(inputStats.size / 1024).toFixed(1)} KB)...`);
      
      if (ext === '.png') {
        await sharp(inputPath)
          .webp({ quality: 85, effort: 6, alphaQuality: 90 })
          .toFile(outputPath);
      } else {
        await sharp(inputPath)
          .webp({ quality: 82, effort: 6 })
          .toFile(outputPath);
      }
      
      const outputStats = fs.statSync(outputPath);
      const savings = (((inputStats.size - outputStats.size) / inputStats.size) * 100).toFixed(1);
      console.log(` -> Created ${baseName}.webp (${(outputStats.size / 1024).toFixed(1)} KB, saved ${savings}%)`);
    }
  }
}

async function run() {
  console.log('Optimizing images in apps/web/public/images...');
  await convertDir(imagesDir);
  console.log('\nOptimizing images in apps/web/public...');
  await convertDir(publicDir);
  console.log('\nAll images successfully optimized and converted to WebP!');
}

run().catch(err => {
  console.error('Error optimizing images:', err);
  process.exit(1);
});
