#!/bin/bash

# Generate PWA icons from SVG logo
# This script uses ImageMagick to convert SVG to PNG at various sizes

echo "🎨 Generating PWA icons from three-two-logo.svg..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Installing..."
    
    # Check OS and provide installation instructions
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "📦 Please install ImageMagick:"
        echo "   brew install imagemagick"
        exit 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "📦 Please install ImageMagick:"
        echo "   sudo apt-get install imagemagick"
        exit 1
    else
        echo "❌ Please install ImageMagick manually"
        exit 1
    fi
fi

# Create icons directory if it doesn't exist
mkdir -p public/icons

# SVG source
SVG_SOURCE="public/three-two-logo.svg"

# Check if SVG exists
if [ ! -f "$SVG_SOURCE" ]; then
    echo "❌ Logo not found at $SVG_SOURCE"
    exit 1
fi

# Generate icons at different sizes
echo "📐 Generating icons..."

sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    echo "  Creating icon-${size}x${size}.png..."
    convert "$SVG_SOURCE" -resize "${size}x${size}" -background transparent "public/icons/icon-${size}x${size}.png"
done

echo "✅ Icons generated successfully!"
echo "📁 Icons saved to: public/icons/"
echo ""
echo "📋 Generated files:"
ls -lh public/icons/

