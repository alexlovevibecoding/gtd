#!/bin/bash

# GTD App Runner Script
# Makes it easy to start your Getting Things Done application

set -e  # Exit on any error

echo "🎯 GTD Mini - Getting Things Done App"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

# Display Node and npm versions
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${BLUE}📦 Node.js: $NODE_VERSION${NC}"
echo -e "${BLUE}📦 npm: $NPM_VERSION${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found${NC}"
    echo "Please run this script from the GTD app directory"
    exit 1
fi

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
fi

# Check for outdated packages (optional)
echo -e "${BLUE}🔍 Checking for updates...${NC}"
if npm outdated --silent; then
    echo -e "${GREEN}✅ All packages are up to date${NC}"
else
    echo -e "${YELLOW}⚠️  Some packages have updates available${NC}"
    echo "Run 'npm update' to update packages"
fi
echo ""

# Display app info
echo -e "${GREEN}🚀 Starting GTD Mini...${NC}"
echo ""
echo "Features available:"
echo "  • Complete GTD workflow (Capture → Clarify → Organize → Review → Engage)"
echo "  • Context-based task organization"
echo "  • Due date management with overdue highlighting"
echo "  • IndexedDB persistence with backup/restore"
echo "  • Weekly review mode"
echo "  • Search and filtering"
echo ""
echo -e "${BLUE}📝 Access your app at: http://localhost:3000${NC}"
echo -e "${BLUE}🛑 Press Ctrl+C to stop the server${NC}"
echo ""
echo "=============================================="

# Start the development server
npm start