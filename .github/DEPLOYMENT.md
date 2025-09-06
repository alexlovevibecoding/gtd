# 🚀 Deployment Guide

This document explains the CI/CD setup for the GTD application.

## 📋 Overview

The project uses GitHub Actions for continuous integration and deployment with the following workflows:

### 🔄 Workflows

#### 1. **Build and Deploy** (`.github/workflows/build.yml`)
- **Triggers**: Push to `main` or `develop`, PRs to `main`
- **Jobs**:
  - **Test & Build**: Multi-node testing (18.x, 20.x), lint, test, build
  - **Server Test**: SQLite database testing, API endpoint validation
  - **Security Scan**: npm audit, secret scanning with TruffleHog
  - **Deploy**: GitHub Pages deployment (main branch only)

#### 2. **PR Checks** (`.github/workflows/pr-check.yml`)
- **Triggers**: All pull requests
- **Jobs**:
  - **Lint & Format**: Code quality checks
  - **Build Check**: Ensures clean builds, monitors build size
  - **API Integration**: Full API endpoint testing
  - **Dependency Check**: Security audits, package validation

#### 3. **Dependabot Auto-merge** (`.github/workflows/dependabot-auto-merge.yml`)
- **Triggers**: Dependabot PRs
- **Features**: Auto-approves and merges safe patch updates

### 🤖 Dependabot Configuration

Automated dependency updates configured in `.github/dependabot.yml`:
- **Weekly updates** on Mondays
- **Grouped updates** for related packages
- **Auto-merge** for patch updates
- **Manual review** for major version changes

## 🛠️ Local Development

### Available Scripts

```bash
# Development
npm start          # Run both client and server
npm run client     # Run React dev server only
npm run server     # Run Express API server only

# Testing & Quality
npm test           # Run tests in watch mode
npm run test:ci    # Run tests with coverage (CI)
npm run lint       # Check code quality
npm run lint:fix   # Fix linting issues

# Formatting
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Production
npm run build      # Build for production
npm run serve      # Serve production build locally
npm run analyze    # Analyze bundle size
```

### Prerequisites

- Node.js 18.x or 20.x
- npm 8+

## 🚀 Deployment Process

### Automatic Deployment

1. **Push to main branch** triggers full CI/CD pipeline
2. **All tests pass** → Automatic deployment to GitHub Pages
3. **Release created** with version tag and changelog

### Manual Deployment

```bash
# Build for production
npm run build

# Test the build locally
npm run serve

# Deploy to your hosting provider
# (Copy contents of 'build/' directory)
```

### GitHub Pages Setup

1. Go to repository **Settings** → **Pages**
2. Set source to **GitHub Actions**
3. The workflow will automatically deploy to GitHub Pages

### Environment Variables

For production deployment, set these environment variables:

```bash
# Optional: Custom API URL
REACT_APP_API_URL=https://your-api-server.com/api

# Optional: Disable source maps in production
GENERATE_SOURCEMAP=false

# CI environment
CI=false  # Treat warnings as warnings, not errors
```

## 📊 Monitoring

### Build Status

- ✅ **Green checks**: All tests pass, ready to deploy
- ❌ **Red X**: Issues found, deployment blocked
- 🟡 **Yellow warning**: Minor issues, review recommended

### Security

- **npm audit**: Checks for known vulnerabilities
- **TruffleHog**: Scans for accidentally committed secrets
- **Dependabot**: Automated security updates

## 🔧 Troubleshooting

### Common Issues

1. **Build fails on CI but works locally**
   - Check Node.js version compatibility
   - Ensure all dependencies in package.json
   - Review environment variables

2. **Tests fail in CI**
   - Check test coverage requirements
   - Verify test files are committed
   - Review CI-specific test configuration

3. **Deployment fails**
   - Check GitHub Pages settings
   - Verify build artifacts are generated
   - Review deployment logs in Actions tab

### Debug Commands

```bash
# Check build output
npm run build && ls -la build/

# Test server manually
npm run server &
curl http://localhost:3001/api/health

# Verify database functionality
node -e "const db = require('./server/database'); console.log('DB OK');"
```

## 📈 Performance

### Build Optimization

- **Code splitting**: Automatic with React
- **Tree shaking**: Removes unused code
- **Minification**: Production builds are minified
- **Source maps**: Disabled in production for smaller builds

### Bundle Analysis

```bash
npm run analyze
```

This opens an interactive bundle analyzer to identify large dependencies.

## 🔐 Security

- Regular dependency updates via Dependabot
- Security audit on every build
- Secret scanning for sensitive data
- HTTPS-only deployment (GitHub Pages)

---

## 📞 Support

If you encounter issues with the CI/CD pipeline:

1. Check the **Actions** tab for detailed logs
2. Review this documentation
3. Check recent changes that might have broken the build
4. Consider reverting problematic changes

**Happy coding! 🎉**