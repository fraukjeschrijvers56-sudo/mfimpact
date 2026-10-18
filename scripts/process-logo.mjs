#!/usr/bin/env node
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const INPUT = process.argv[2] || '/home/ubuntu/.cursor/projects/workspace/uploads/mfimpact-logo_bccb.png';
const OUTPUT_DIR = 'public';

async function processLogo() {
  console.log('Loading logo:', INPUT);
  
  // Load and trim
  const original = sharp(INPUT);
  const metadata = await original.metadata();
  console.log(`Original size: ${metadata.width}x${metadata.height}`);
  
  // Trim whitespace
  const trimmed = await original.trim().toBuffer();
  const trimmedImage = sharp(trimmed);
  const trimmedMeta = await trimmedImage.metadata();
  console.log(`Trimmed size: ${trimmedMeta.width}x${trimmedMeta.height}`);
  
  // 1. logo-full.png (trimmed, original colors)
  await trimmedImage.clone()
    .png()
    .toFile(`${OUTPUT_DIR}/logo-full.png`);
  console.log('Created logo-full.png');
  
  // 2. logo-full-white.png (white version for dark backgrounds)
  // Strategy: keep the teal mark, make text white
  await trimmedImage.clone()
    .composite([{
      input: Buffer.from([255, 255, 255, 255]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'lighten'
    }])
    .png()
    .toFile(`${OUTPUT_DIR}/logo-full-white.png`);
  console.log('Created logo-full-white.png');
  
  // 3. logo-mark.png (extract left portion - the MF mark)
  // The mark is roughly in the left 1/3 of the image
  const markWidth = Math.floor(trimmedMeta.height * 1.2); // Square-ish
  await trimmedImage.clone()
    .extract({
      left: 0,
      top: 0,
      width: Math.min(markWidth, trimmedMeta.width),
      height: trimmedMeta.height
    })
    .png()
    .toFile(`${OUTPUT_DIR}/logo-mark.png`);
  console.log('Created logo-mark.png');
  
  // Load the mark for favicon creation
  const mark = sharp(`${OUTPUT_DIR}/logo-mark.png`);
  
  // 4. app/icon.png (512x512 - Next.js app icon)
  await mark.clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/icon.png');
  console.log('Created app/icon.png (512x512)');
  
  // 5. app/apple-icon.png (512x512)
  await mark.clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/apple-icon.png');
  console.log('Created app/apple-icon.png');
  
  // 6. favicon files
  await mark.clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUTPUT_DIR}/favicon-32x32.png`);
  console.log('Created favicon-32x32.png');
  
  await mark.clone()
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${OUTPUT_DIR}/favicon-16x16.png`);
  console.log('Created favicon-16x16.png');
  
  // favicon.ico (for older browsers)
  await mark.clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('png')
    .toFile(`${OUTPUT_DIR}/favicon.ico`);
  console.log('Created favicon.ico');
  
  console.log('Done! All logo assets created.');
}

processLogo().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
