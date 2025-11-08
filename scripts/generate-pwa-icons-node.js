#!/usr/bin/env node

/**
 * Generate PWA icons from SVG logo using sharp (Node.js)
 * 
 * Install sharp first: npm install --save-dev sharp
 * Then run: node scripts/generate-pwa-icons-node.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ Sharp not found. Installing...');
  console.log('📦 Run: npm install --save-dev sharp');
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgSource = path.join(__dirname, '../public/three-two-logo.svg');
const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if SVG exists
if (!fs.existsSync(svgSource)) {
  console.error(`❌ Logo not found at ${svgSource}`);
  process.exit(1);
}

console.log('🎨 Generating PWA icons from three-two-logo.svg...\n');

// Generate all icons
Promise.all(
  sizes.map(async (size) => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    console.log(`  Creating icon-${size}x${size}.png...`);
    
    await sharp(svgSource)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png()
      .toFile(outputPath);
  })
)
  .then(() => {
    console.log('\n✅ Icons generated successfully!');
    console.log(`📁 Icons saved to: ${iconsDir}/`);
    console.log('\n📋 Generated files:');
    sizes.forEach(size => {
      const filePath = path.join(iconsDir, `icon-${size}x${size}.png`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`  ✓ icon-${size}x${size}.png (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    });
  })
  .catch((error) => {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  });

