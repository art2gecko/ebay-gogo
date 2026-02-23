#!/bin/bash
# eBay-GoGo — Start the app (macOS / Linux)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR/frontend"
echo "Starting eBay-GoGo..."
npm run dev
