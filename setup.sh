#!/bin/bash
# eBay-GoGo — One-command setup (macOS / Linux)
set -e

echo "============================="
echo "  eBay-GoGo Setup"
echo "============================="
echo ""

# Check for Python
if command -v python3 &> /dev/null; then
    PY=python3
elif command -v python &> /dev/null; then
    PY=python
else
    echo "ERROR: Python is not installed."
    echo "  Download it from: https://www.python.org/downloads/"
    echo "  Then run this script again."
    exit 1
fi
echo "[OK] Found Python: $($PY --version)"

# Check for Node.js / npm
if ! command -v npm &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "  Download it from: https://nodejs.org/"
    echo "  Then run this script again."
    exit 1
fi
echo "[OK] Found Node.js: $(node --version)"

# Get project root (where this script lives)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Set up .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[OK] Created .env config file"
else
    echo "[OK] .env config already exists"
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
$PY -m pip install -r backend/requirements.txt --quiet
echo "[OK] Backend ready"

# Install frontend dependencies and build
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install --silent 2>/dev/null
echo "[OK] Frontend dependencies installed"

echo ""
echo "Building the app..."
npx webpack --mode production --silent 2>/dev/null || npx webpack --mode production
echo "[OK] App built"

echo ""
echo "============================="
echo "  Setup complete!"
echo "============================="
echo ""
echo "To start eBay-GoGo, run:"
echo ""
echo "  ./start.sh"
echo ""
echo "NOTE: Before your first search, edit the .env file"
echo "with your eBay API keys from https://developer.ebay.com/my/keys"
echo ""
