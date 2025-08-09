#!/bin/bash

# CH5 HA Bridge - Quick Start Script
# This script helps you get started with the CH5 HA Bridge quickly

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        CH5 Home Assistant Bridge - Quick Start Setup          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check for yarn or npm
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
    echo "✅ Using yarn"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    echo "✅ Using npm"
else
    echo "❌ No package manager found. Please install yarn or npm."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    $PKG_MANAGER install
else
    echo "✅ Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "⚠️  Please edit .env file with your MQTT and Home Assistant settings"
else
    echo "✅ .env file exists"
fi

# Check if deployment config exists
if [ ! -f "config/deployment-config.json" ]; then
    echo "⚠️  No deployment configuration found"
    echo "   Please edit config/deployment-config.json with your tablet details"
fi

# Build polyfill
echo ""
echo "🔨 Building polyfill..."
npm run build:polyfill

# Generate Home Assistant files
echo ""
echo "🏠 Generating Home Assistant configuration files..."
node scripts/ha-setup.js

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      Setup Complete!                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your MQTT and Home Assistant settings"
echo "2. Edit config/deployment-config.json with your tablet details"
echo "3. Copy files from homeassistant/ to your HA www/crestron directory"
echo "4. Update your Home Assistant configuration.yaml as shown above"
echo "5. Restart Home Assistant"
echo "6. Run 'npm run deploy:all' to deploy to all configured tablets"
echo ""
echo "For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "Available commands:"
echo "  npm run deploy:list     - List configured tablets"
echo "  npm run deploy:all      - Deploy to all tablets"
echo "  npm run deploy:single <name> - Deploy to specific tablet"
echo ""