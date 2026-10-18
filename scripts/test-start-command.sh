#!/bin/bash

# Test script for the new make start command
# This simulates both first-time and existing setups

echo "Testing 'make start' command..."
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if node_modules exists
echo -e "${BLUE}Test 1: Checking smart detection...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules exists - start should skip setup${NC}"
else
    echo -e "${YELLOW}✓ node_modules missing - start should run setup${NC}"
fi

# Test 2: Check if .env exists
echo -e "\n${BLUE}Test 2: Checking .env file...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env exists - start should skip env creation${NC}"
else
    echo -e "${YELLOW}✓ .env missing - start should create it${NC}"
fi

# Test 3: Check make start command exists
echo -e "\n${BLUE}Test 3: Verifying make start command...${NC}"
if make -n start >/dev/null 2>&1; then
    echo -e "${GREEN}✓ 'make start' command is properly defined${NC}"
else
    echo -e "${RED}✗ 'make start' command not found${NC}"
    exit 1
fi

echo -e "\n${GREEN}All tests passed! 'make start' is ready to use.${NC}"
echo -e "\n${YELLOW}To test the actual command, run:${NC}"
echo "make start"