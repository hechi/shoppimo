// Simple script to create placeholder PWA icons
// For production, replace these with proper branded icons

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');

// Create a simple SVG icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.5}" 
        fill="white" text-anchor="middle" dominant-baseline="middle">🛒</text>
</svg>
`;

// Save SVG files (browsers can use these directly)
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), createSVG(192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), createSVG(512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), createSVG(180));

console.log('✓ PWA icon placeholders created!');
console.log('Note: For production, replace these SVG files with proper PNG icons.');
console.log('You can use tools like https://realfavicongenerator.net/ to generate proper icons.');
