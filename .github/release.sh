#!/bin/bash

# Release script for bigtangle-ts
# This script creates a git tag, pushes it to GitHub, and verifies the release on both GitHub and npm
# Usage: ./release.sh [version]
# If version is provided, it will update package.json first

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
NEW_VERSION="$1"
AUTO_MODE=false

# If version argument provided, update package.json
if [ -n "$NEW_VERSION" ]; then
    echo -e "${YELLOW}Updating package.json to version ${NEW_VERSION}...${NC}"
    npm version "$NEW_VERSION" --no-git-tag-version
    echo -e "${GREEN}✓ Version updated${NC}"
    AUTO_MODE=true
fi

# Get package name and version from package.json
PACKAGE_NAME=$(node -p "require('./package.json').name")
CURRENT_VERSION=$(node -p "require('./package.json').version")
TAG_NAME="v${CURRENT_VERSION}"

echo ""
echo -e "${YELLOW}=== Bigtangle Release Script ===${NC}"
echo "Package: ${PACKAGE_NAME}"
echo "Version: ${CURRENT_VERSION}"
echo "Tag: ${TAG_NAME}"
echo "Mode: $(if [ "$AUTO_MODE" = true ]; then echo "Automated"; else echo "Interactive"; fi)"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
fi

# Check npm registry for existing versions
echo -e "${YELLOW}Checking npm registry...${NC}"
PUBLISHED_VERSIONS=$(npm view "${PACKAGE_NAME}" versions --json 2>/dev/null || echo "[]")

if [ "$PUBLISHED_VERSIONS" != "[]" ]; then
    echo "Published versions on npm:"
    echo "$PUBLISHED_VERSIONS" | jq -r '.[]' | sed 's/^/  - /'
    
    # Check if current version already exists
    if echo "$PUBLISHED_VERSIONS" | jq -e --arg ver "$CURRENT_VERSION" 'index($ver) != null' > /dev/null 2>&1; then
        echo -e "${RED}✗ Version ${CURRENT_VERSION} is already published on npm!${NC}"
        echo "  View: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${CURRENT_VERSION}"
        echo ""
        echo "Please update the version in package.json before releasing."
        exit 1
    else
        echo -e "${GREEN}✓ Version ${CURRENT_VERSION} is not yet published${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No versions found on npm (package may not exist yet)${NC}"
fi
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    if [ "$AUTO_MODE" = false ]; then
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo "Auto-mode: Committing changes..."
        git add package.json package-lock.json 2>/dev/null || true
        git commit -m "chore: bump version to ${CURRENT_VERSION}"
        git push origin main
        echo -e "${GREEN}✓ Changes committed and pushed${NC}"
    fi
fi

# Create git tag
echo -e "${YELLOW}Step 1: Creating git tag ${TAG_NAME}...${NC}"
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Tag ${TAG_NAME} already exists${NC}"
    if [ "$AUTO_MODE" = false ]; then
        read -p "Delete and recreate? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            gh release delete "$TAG_NAME" -y 2>/dev/null || true
            git tag -d "$TAG_NAME"
            git tag -a "$TAG_NAME" -m "Release ${CURRENT_VERSION}"
            echo -e "${GREEN}✓ Tag recreated${NC}"
        fi
    else
        echo "Auto-mode: Deleting and recreating tag..."
        gh release delete "$TAG_NAME" -y 2>/dev/null || true
        git tag -d "$TAG_NAME"
        git tag -a "$TAG_NAME" -m "Release ${CURRENT_VERSION}"
        echo -e "${GREEN}✓ Tag recreated${NC}"
    fi
else
    git tag -a "$TAG_NAME" -m "Release ${CURRENT_VERSION}"
    echo -e "${GREEN}✓ Tag created${NC}"
fi

# Push tag to GitHub
echo -e "${YELLOW}Step 2: Pushing tag to GitHub...${NC}"
if [ "$AUTO_MODE" = false ]; then
    read -p "Push tag ${TAG_NAME} to origin? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Skipping push${NC}"
        exit 1
    fi
fi
git push origin "$TAG_NAME" --force
echo -e "${GREEN}✓ Tag pushed to GitHub${NC}"

# Wait for GitHub Actions to complete
echo -e "${YELLOW}Step 3: Waiting for GitHub Actions to complete...${NC}"
echo "Waiting 30 seconds for workflow to start..."
sleep 30

# Check GitHub release using gh CLI
echo -e "${YELLOW}Step 4: Checking GitHub release...${NC}"
if command -v gh &> /dev/null; then
    MAX_ATTEMPTS=12
    ATTEMPT=0
    RELEASE_FOUND=false
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))
        echo "Attempt $ATTEMPT/$MAX_ATTEMPTS: Checking for GitHub release..."
        
        if gh release view "$TAG_NAME" &> /dev/null; then
            RELEASE_FOUND=true
            echo -e "${GREEN}✓ GitHub release found${NC}"
            echo ""
            gh release view "$TAG_NAME"
            break
        fi
        
        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "Release not found yet, waiting 10 seconds..."
            sleep 10
        fi
    done
    
    if [ "$RELEASE_FOUND" = false ]; then
        echo -e "${RED}✗ GitHub release not found after $MAX_ATTEMPTS attempts${NC}"
        echo "Check workflow status: gh run list --workflow=release.yml"
    fi
else
    echo -e "${YELLOW}gh CLI not installed. Install with: https://cli.github.com/${NC}"
    echo "Manually check: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/${TAG_NAME}"
fi

# Check npm package availability
echo -e "${YELLOW}Step 5: Checking npm package availability...${NC}"
MAX_ATTEMPTS=20
ATTEMPT=0
NPM_PUBLISHED=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS: Checking npm registry..."
    
    # Try to get the published version from npm
    PUBLISHED_VERSION=$(npm view "${PACKAGE_NAME}@${CURRENT_VERSION}" version 2>/dev/null || echo "")
    
    if [ "$PUBLISHED_VERSION" = "$CURRENT_VERSION" ]; then
        NPM_PUBLISHED=true
        echo -e "${GREEN}✓ npm package published successfully${NC}"
        echo ""
        echo "Package details:"
        npm view "${PACKAGE_NAME}@${CURRENT_VERSION}"
        echo ""
        echo -e "${GREEN}View on npm: https://www.npmjs.com/package/${PACKAGE_NAME}/v/${CURRENT_VERSION}${NC}"
        break
    fi
    
    if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
        echo "Package not available yet, waiting 15 seconds..."
        sleep 15
    fi
done

if [ "$NPM_PUBLISHED" = false ]; then
    echo -e "${RED}✗ npm package not available after $MAX_ATTEMPTS attempts${NC}"
    echo "Check manually: https://www.npmjs.com/package/${PACKAGE_NAME}"
fi

# Summary
echo ""
echo -e "${YELLOW}=== Release Summary ===${NC}"
echo "Version: ${CURRENT_VERSION}"
echo "Git tag: ${TAG_NAME}"
echo -e "GitHub release: $(if [ "$RELEASE_FOUND" = true ]; then echo -e "${GREEN}✓${NC}"; else echo -e "${RED}✗${NC}"; fi)"
echo -e "npm package: $(if [ "$NPM_PUBLISHED" = true ]; then echo -e "${GREEN}✓${NC}"; else echo -e "${RED}✗${NC}"; fi)"
echo ""

if [ "$RELEASE_FOUND" = true ] && [ "$NPM_PUBLISHED" = true ]; then
    echo -e "${GREEN}✓ Release completed successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Release partially completed. Check logs above for details.${NC}"
    exit 1
fi
