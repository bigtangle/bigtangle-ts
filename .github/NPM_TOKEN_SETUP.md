# Setting Up NPM_TOKEN for Automated Publishing

## Problem
GitHub Actions workflow fails with:
```
npm error 403 - Two-factor authentication or granular access token with bypass 2fa enabled is required
```

## Solution: Create an Automation Token

### Step 1: Create npm Automation Token

1. Go to: https://www.npmjs.com/settings/~/tokens
2. Click **"Generate New Token"**
3. Select **"Automation"** token type (this is the key!)
4. Give it a name like "GitHub Actions - bigtangle-ts"
5. Click **"Generate Token"**
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Add Token to GitHub Secrets

1. Go to: https://github.com/bigtangle/bigtangle-ts/settings/secrets/actions
2. If `NPM_TOKEN` already exists, click **"Update"**, otherwise click **"New repository secret"**
3. Name: `NPM_TOKEN`
4. Value: Paste the automation token from step 1
5. Click **"Add secret"** or **"Update secret"**

### Step 3: Verify

After adding the token, the next time you run the release workflow (by pushing a version tag), npm publish will work automatically without any manual 2FA prompts.

## What is an "Automation" Token?

- **NOT** disabling security
- Designed specifically for CI/CD pipelines
- Has "2FA bypass" capability (meaning it doesn't require interactive 2FA)
- Still requires authentication (the token itself)
- Can be revoked anytime from your npm settings

## Alternative: Granular Access Token

If you prefer more control:

1. Go to: https://www.npmjs.com/settings/~/tokens
2. Select **"Granular Access Token"**
3. Set permissions:
   - **Read and write** for the `bigtangle-ts` package
   - Enable **"Bypass 2FA requirement"** (this is the important setting!)
4. Generate and add to GitHub Secrets as above

## Quick Test

After adding the token, you can test by running:
```bash
./.github/release.sh
```

Or manually trigger a release by pushing a tag:
```bash
git tag v1.0.8
git push origin v1.0.8
```
