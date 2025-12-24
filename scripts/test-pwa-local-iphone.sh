#!/bin/bash

# Local PWA Testing Script for iPhone
# This script helps you test the PWA on your iPhone using ngrok

set -e

echo "📱 Local PWA Testing Setup for iPhone"
echo "======================================"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install it with:"
    echo "  brew install ngrok"
    echo ""
    echo "Or download from: https://ngrok.com/download"
    exit 1
fi

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "⚠️  Dev server is not running on port 3000"
    echo ""
    echo "Start it in another terminal with:"
    echo "  npm run dev"
    echo ""
    read -p "Press Enter when dev server is running..."
fi

echo "✅ Dev server is running"
echo ""
echo "🚀 Starting ngrok tunnel..."
echo ""
echo "This will create an HTTPS URL you can use on your iPhone"
echo ""
echo "After ngrok starts, you'll see a URL like:"
echo "  https://abc123.ngrok.io"
echo ""
echo "Use this URL on your iPhone Safari to test the PWA"
echo ""
echo "Press Ctrl+C to stop ngrok when done"
echo ""

# Start ngrok
ngrok http 3000

