# 🔧 Troubleshooting Guide

This guide helps you resolve common issues when developing the SECiD Alumni Platform.

## 📋 Table of Contents

- [Common Issues](#common-issues)
- [Setup Problems](#setup-problems)
- [Development Server Issues](#development-server-issues)
- [Build Errors](#build-errors)
- [TypeScript Errors](#typescript-errors)
- [Testing Issues](#testing-issues)
- [Performance Problems](#performance-problems)
- [Environment Issues](#environment-issues)
- [Firebase Issues](#firebase-issues)
- [Git/GitHub Issues](#git-github-issues)
- [Quick Fixes](#quick-fixes)

## 🚨 Common Issues

### Issue: "Command not found: make"

**Symptom:**

```bash
make: command not found
```

**Solution:**

- **macOS**: Make is pre-installed. If missing: `xcode-select --install`
- **Linux**: `sudo apt-get install build-essential` (Ubuntu/Debian) or `sudo yum install make` (CentOS/RHEL)
- **Windows**: Install [Git Bash](https://git-scm.com/) or use WSL2

**Alternative:** Use npm scripts directly:

```bash
npm run dev      # Instead of make dev
npm run test     # Instead of make test
```

### Issue: "Port 4321 is already in use"

**Symptom:**

```
Error: Port 4321 is already in use
```

**Solution:**

```bash
# Quick fix
make dev-utils cmd=kill-port args=4321

# Or manually
lsof -ti:4321 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :4321   # Windows (then kill PID)
```

### Issue: "Module not found" errors

**Symptom:**

```
Error: Cannot find module '@/components/...'
```

**Solution:**

```bash
# Clean install
make clean
make install

# Or manually
rm -rf node_modules package-lock.json
npm install
```

## 🛠️ Setup Problems

### Node.js Version Issues

**Symptom:**

```
Error: Node.js version 20.17.0 or higher is required
```

**Solution:**

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20.17.0
nvm use 20.17.0

# Using fnm (faster alternative)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20.17.0
fnm use 20.17.0
```

### Permission Errors During Install

**Symptom:**

```
npm ERR! code EACCES
npm ERR! syscall access
```

**Solution:**

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or use a Node version manager (recommended)
```

## 💻 Development Server Issues

### Server Won't Start

**Symptom:**

```
Failed to start development server
```

**Checklist:**

1. Check Node version: `node --version` (should be 20.17.0+)
2. Check port availability: `make dev-utils cmd=kill-port`
3. Validate setup: `make validate-setup`
4. Clean and reinstall: `make reset`

### Hot Reload Not Working

**Symptom:**
Changes not reflected in browser

**Solution:**

```bash
# Clear caches
make clean

# Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart dev server
make dev
```

### Slow Performance

**Symptom:**
Dev server is slow or laggy

**Solution:**

```bash
# Check system resources
make health

# Exclude large directories from watching
# Add to .env:
ASTRO_TELEMETRY_DISABLED=1

# Use production build for testing
make preview
```

## 🏗️ Build Errors

### TypeScript Build Errors

**Symptom:**

```
TS2307: Cannot find module...
```

**Solution:**

```bash
# Regenerate TypeScript declarations
npm run typecheck

# Check tsconfig.json paths
cat tsconfig.json | grep -A5 "paths"

# Clean TypeScript cache
rm -rf node_modules/.cache/typescript
```

### Memory Issues During Build

**Symptom:**

```
FATAL ERROR: Reached heap limit
```

**Solution:**

```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or add to package.json scripts:
"build": "NODE_OPTIONS='--max-old-space-size=4096' astro build"
```

### CSS/Tailwind Issues

**Symptom:**
Styles not applying correctly

**Solution:**

```bash
# Rebuild Tailwind
npx tailwindcss -i ./src/styles/global.css -o ./dist/output.css --watch

# Check Tailwind config
npm run build -- --verbose

# Clear PostCSS cache
rm -rf node_modules/.cache/postcss
```

## 📝 TypeScript Errors

### Common Type Errors

**Error:** "Type 'string | undefined' is not assignable to type 'string'"

**Solution:**

```typescript
// Add null checks
const value = someValue || '';

// Or use non-null assertion (if you're sure)
const value = someValue!;

// Or optional chaining
const value = obj?.property ?? 'default';
```

**Error:** "Property does not exist on type"

**Solution:**

```typescript
// Define proper interfaces
interface MyType {
  property: string;
}

// Or use type assertions
(obj as MyType).property;
```

### Import Errors

**Error:** "Module has no exported member"

**Solution:**

```bash
# Check if using named vs default exports
# Wrong: import { Component } from './Component'
# Right: import Component from './Component'

# Regenerate types
make test-type
```

## 🧪 Testing Issues

### Tests Not Running

**Symptom:**

```
No tests found
```

**Solution:**

```bash
# Check test file patterns
find src -name "*.test.*" -o -name "*.spec.*"

# Run specific test file
npm run test -- Button.test.tsx

# Check vitest config
cat vitest.config.ts
```

### Test Environment Errors

**Symptom:**

```
ReferenceError: document is not defined
```

**Solution:**

```javascript
// Ensure test files use proper environment
// In vitest.config.ts:
export default {
  test: {
    environment: 'jsdom',
  },
};
```

## ⚡ Performance Problems

### Bundle Size Too Large

**Check bundle size:**

```bash
make analyze
```

**Solutions:**

- Lazy load components: `const Component = lazy(() => import('./Component'))`
- Use dynamic imports for routes
- Check for duplicate dependencies: `npm ls --depth=0`
- Remove unused dependencies: `make dev-utils cmd=check-deps`

### Slow Page Loads

**Diagnose:**

```bash
make lighthouse
```

**Common fixes:**

- Optimize images: Use WebP format, add lazy loading
- Reduce JavaScript: Code split, tree shake
- Enable compression: Check build output
- Use CDN for static assets

## 🌍 Environment Issues

### Environment Variables Not Loading

**Symptom:**

```
undefined environment variables
```

**Solution:**

```bash
# Check .env file exists
ls -la .env

# Verify format (no spaces around =)
# Correct: PUBLIC_API_KEY=abc123
# Wrong: PUBLIC_API_KEY = abc123

# Variables must start with PUBLIC_ in Astro
# Wrong: API_KEY=abc123
# Right: PUBLIC_API_KEY=abc123

# Restart dev server after changes
make dev
```

### Wrong Environment Running

**Check current environment:**

```javascript
console.log(import.meta.env.MODE);
console.log(import.meta.env.PROD);
console.log(import.meta.env.DEV);
```

## 🔥 Firebase Issues

### Authentication Errors

**Error:** "auth/invalid-api-key"

**Solution:**

```bash
# Verify Firebase config
cat .env | grep FIREBASE

# Check Firebase Console
# Project Settings > General > Your apps > Web app
```

**Error:** "auth/network-request-failed"

**Solution:**

- Check internet connection
- Verify Firebase Auth is enabled
- Check CORS settings
- Try incognito mode (extension conflicts)

### Firestore Connection Issues

**Error:** "Failed to get document because the client is offline"

**Solution:**

```javascript
// Enable offline persistence
import { enableIndexedDbPersistence } from 'firebase/firestore';

try {
  await enableIndexedDbPersistence(db);
} catch (err) {
  console.error('Persistence error:', err);
}
```

## 🐙 Git/GitHub Issues

### Pre-commit Hook Failures

**Symptom:**

```
husky - pre-commit hook exited with code 1
```

**Solution:**

```bash
# Skip hooks temporarily
git commit --no-verify -m "message"

# Fix issues and retry
make lint
make test

# Reset hooks
rm -rf .husky
npm run prepare
```

### Merge Conflicts in package-lock.json

**Solution:**

```bash
# Delete and regenerate
rm package-lock.json
npm install
git add package-lock.json
git commit -m "fix: regenerate package-lock.json"
```

## ⚡ Quick Fixes

### Universal "Turn it off and on again"

```bash
make reset   # Nuclear option - cleans everything
```

### Check Everything

```bash
make health  # Run health check
make status  # Show project status
```

### Common Commands Cheatsheet

| Issue            | Command                                  |
| ---------------- | ---------------------------------------- |
| Port in use      | `make dev-utils cmd=kill-port args=4321` |
| Clear caches     | `make clean`                             |
| Fix dependencies | `make reset`                             |
| Check setup      | `make validate-setup`                    |
| Find TODOs       | `make dev-utils cmd=find-todos`          |
| Project stats    | `make dev-utils cmd=project-stats`       |

## 🆘 Still Stuck?

1. **Search existing issues:**

   ```bash
   open https://github.com/secid/secid-website/issues
   ```

2. **Enable debug mode:**

   ```bash
   DEBUG=* make dev
   ```

3. **Create detailed bug report:**
   - Environment: `make info`
   - Error messages (full stack trace)
   - Steps to reproduce
   - What you've tried

4. **Get help:**
   - GitHub Issues: [Report a bug](https://github.com/secid/secid-website/issues/new)
   - GitHub Discussions: [Ask for help](https://github.com/secid/secid-website/discussions)
   - Email: contacto@secid.mx

## 💡 Prevention Tips

1. **Always run health checks:**

   ```bash
   make health     # Before starting work
   make test       # Before committing
   ```

2. **Keep dependencies updated:**

   ```bash
   make check-updates  # Check for updates
   make update        # Update dependencies
   ```

3. **Use the validation tools:**

   ```bash
   make validate-setup  # Validate environment
   make validate       # Validate code
   ```

4. **Follow the workflow:**
   - Pull latest changes
   - Run `make setup` if package.json changed
   - Create feature branch
   - Test before committing

---

Remember: Most issues can be solved with `make reset` followed by `make setup`. When in doubt, check `make health` first!
