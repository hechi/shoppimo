#!/bin/bash

# This script generates PWA icons using ImageMagick
# Install ImageMagick: sudo apt-get install imagemagick (Linux) or brew install imagemagick (Mac)

# Create a simple shopping cart icon using SVG
cat > /tmp/icon.svg << 'EOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6"/>
  <path d="M160 96l-32 192h256l-32-192H160z M128 320c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z M384 320c-17.6 0-32 14.4-32 32s14.4 32 32 32 32-14.4 32-32-14.4-32-32-32z" fill="white" stroke="white" stroke-width="8"/>
  <text x="256" y="200" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">🛒</text>
</svg>
EOF

# Generate PNG icons
convert /tmp/icon.svg -resize 192x192 frontend/public/pwa-192x192.png
convert /tmp/icon.svg -resize 512x512 frontend/public/pwa-512x512.png
convert /tmp/icon.svg -resize 180x180 frontend/public/apple-touch-icon.png

echo "PWA icons generated successfully!"
