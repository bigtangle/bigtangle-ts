#!/bin/bash

# Verification script for bigtangle-ts release
# Checks GitHub release and npm package availability

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PACKAGE_NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
TAG_NAME="v${VERSION}"

echo -e "${YELLOW}=== Release Verification ===${NC}"
echo "Package: ${PACKAGE_NAME}"
echo "Version: ${VERSION}"
echo "Tag: ${TAG_NAME}"
echo ""

# Check GitHub release
echo -e "${YELLOW}Checking GitHub release...${NC}"
if gh release view "$TAG_NAME" &> /dev/null; then
    echo -e "${GREEN}✓ GitHub release found${NC}"
    gh release view "$TAG_NAME"
else
    echo -e "${RED}✗ GitHub release not found${NC}"
    exit 1
fi

echo ""

# Check npm package
echo -e "${YELLOW}Checking npm package...${NC}"
PUBLISHED_VERSION=$(npm view "${PACKAGE_NAME}@${VERSION}" version 2>/dev/null || echo "")

if [ "$PUBLISHED_VERSION" = "$VERSION" ]; then
    echo -e "${GREEN}✓ npm package published${NC}"
    echo ""
    npm view "${PACKAGE_NAME}@${VERSION}"
    echo ""
    echo -e "${GREEN}View on npm: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${VERSION}${NC}"
else
    echo -e "${RED}✗ npm package not available${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Release verification successful!${NC}"
