#!/usr/bin/env node
import sharp from 'sharp';

async function fixLogoMark() {
  console.log('Regenerating logo-mark.png from corrected logo-full-white.png...');
  
  // Load the correct white logo
  const whiteLogo = sharp('public/logo-full-white.png');
  const metadata = await whiteLogo.metadata();
  console.log(`Source: ${metadata.width}x${metadata.height}, hasAlpha: ${metadata.hasAlpha}`);
  
  // Extract the left portion containing the MF mark
  // The mark is approximately square and on the left side
  const markWidth = Math.min(Math.floor(metadata.height * 1.2), Math.floor(metadata.width * 0.3));
  
  await whiteLogo
    .extract({
      left: 0,
      top: 0,
      width: markWidth,
      height: metadata.height
    })
    .png()
    .toFile('public/logo-mark.png');
  
  console.log(`Created logo-mark.png: ${markWidth}x${metadata.height}`);
  
  // Regenerate favicons from the new mark
  const mark = sharp('public/logo-mark.png');
  
  // app/icon.png (512x512)
  await mark.clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/icon.png');
  console.log('Updated app/icon.png (512x512)');
  
  // app/apple-icon.png
  await mark.clone()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('app/apple-icon.png');
  console.log('Updated app/apple-icon.png');
  
  // Favicons
  await mark.clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-32x32.png');
  console.log('Updated favicon-32x32.png');
  
  await mark.clone()
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-16x16.png');
  console.log('Updated favicon-16x16.png');
  
  await mark.clone()
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('png')
    .toFile('public/favicon.ico');
  console.log('Updated favicon.ico');
  
  console.log('Done! All assets regenerated with proper transparency.');
}

fixLogoMark().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
