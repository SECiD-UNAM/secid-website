# Mobile Testing Guide for SECiD Platform

This comprehensive guide covers mobile responsiveness testing, touch interaction validation, and performance optimization for the SECiD (Sociedad de Egresados en Ciencia de Datos) platform.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Testing Framework](#testing-framework)
- [Test Categories](#test-categories)
- [Device Coverage](#device-coverage)
- [Running Tests](#running-tests)
- [Test Results](#test-results)
- [Performance Testing](#performance-testing)
- [Accessibility Testing](#accessibility-testing)
- [Network Conditions](#network-conditions)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The SECiD platform mobile testing suite ensures optimal user experience across all mobile devices and network conditions. The testing framework validates:

- **Responsive Design**: Layout adaptation across different screen sizes
- **Touch Interactions**: Tap, swipe, long press, and multi-touch gestures
- **Performance**: Loading times, rendering performance, and resource optimization
- **Accessibility**: Screen reader compatibility and touch target accessibility
- **Network Resilience**: Behavior under various network conditions
- **Cross-Browser Compatibility**: Testing across mobile browsers

## Quick Start

### Prerequisites

- Node.js 20.0.0 or higher
- npm 10.0.0 or higher
- Git

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Install testing dependencies:**

   ```bash
   ./scripts/mobile-test.sh install
   ```

3. **Run all mobile tests:**

   ```bash
   ./scripts/mobile-test.sh test
   ```

4. **View results:**
   ```bash
   ./scripts/mobile-test.sh open
   ```

## Testing Framework

### Technology Stack

- **Playwright**: Cross-browser automation and testing
- **TypeScript**: Type-safe test development
- **Lighthouse**: Performance and PWA auditing
- **Custom Scripts**: Specialized mobile testing utilities

### Test Architecture

```
tests/mobile/
├── mobile-test-suite.ts    # Comprehensive mobile tests
├── viewport-tests.ts       # Viewport-specific testing
└── touch-events.ts        # Touch interaction testing

scripts/
└── mobile-test.sh         # Test execution script

playwright.config.ts       # Playwright configuration
```

## Test Categories

### 1. Layout Responsiveness Tests

**File**: `tests/mobile/mobile-test-suite.ts`

Tests how the application layout adapts to different screen sizes:

- **Viewport Adaptation**: Ensures content fits within screen boundaries
- **Navigation Behavior**: Mobile menu functionality and sticky navigation
- **Content Reflow**: Text, images, and forms adjust appropriately
- **Orientation Changes**: Portrait/landscape transitions

**Covered Devices**:

- iPhone SE (375×667)
- iPhone 12/13 (390×844)
- iPhone 13 Pro (393×852)
- Pixel 5 (393×851)
- Galaxy S9+ (412×846)
- iPad Mini (768×1024)
- iPad Pro (1024×1366)

### 2. Viewport-Specific Tests

**File**: `tests/mobile/viewport-tests.ts`

Comprehensive testing across device configurations:

- **Real Device Specifications**: Tests actual device viewports
- **CSS Breakpoint Validation**: Ensures responsive design triggers work
- **Edge Case Handling**: Ultra-narrow, ultra-wide, and unusual aspect ratios
- **Dynamic Viewport Changes**: Handles viewport size changes gracefully

**Extended Device Coverage**:

- Small phones (320px - 375px width)
- Standard phones (375px - 412px width)
- Large phones (412px - 480px width)
- Tablets (768px - 1024px width)
- Desktop breakpoints (1024px+)

### 3. Touch Interaction Tests

**File**: `tests/mobile/touch-events.ts`

Validates touch-based user interactions:

- **Basic Touch Events**: Tap, long press, double tap
- **Swipe Gestures**: Horizontal, vertical, and diagonal swipes
- **Form Interactions**: Touch input validation and keyboard handling
- **Navigation Touch**: Mobile menu interactions and touch scrolling
- **Performance**: Rapid touch handling and event cancellation

**Touch Gesture Coverage**:

- Single tap (100ms duration)
- Long press (800ms duration)
- Double tap (200ms interval)
- Swipe gestures (300ms duration, various directions)
- Pull-to-refresh gestures
- Pinch and zoom (where applicable)

## Device Coverage

### Mobile Phones

| Device               | Screen Size | Scale Factor | Touch Support |
| -------------------- | ----------- | ------------ | ------------- |
| iPhone SE (1st gen)  | 320×568     | 2x           | ✓             |
| iPhone SE (2nd gen)  | 375×667     | 2x           | ✓             |
| iPhone 12 Mini       | 375×812     | 3x           | ✓             |
| iPhone 12/13         | 390×844     | 3x           | ✓             |
| iPhone 12/13 Pro     | 393×852     | 3x           | ✓             |
| iPhone 12/13 Pro Max | 428×926     | 3x           | ✓             |
| Galaxy S5            | 360×640     | 3x           | ✓             |
| Galaxy S20           | 412×915     | 3.5x         | ✓             |
| Pixel 5              | 393×851     | 2.75x        | ✓             |

### Tablets

| Device         | Screen Size | Scale Factor | Touch Support |
| -------------- | ----------- | ------------ | ------------- |
| iPad Mini      | 768×1024    | 2x           | ✓             |
| iPad Air       | 820×1180    | 2x           | ✓             |
| iPad Pro 11"   | 834×1194    | 2x           | ✓             |
| iPad Pro 12.9" | 1024×1366   | 2x           | ✓             |
| Galaxy Tab S7  | 800×1280    | 2x           | ✓             |
| Surface Pro    | 912×1368    | 2x           | ✓             |

### Browser Support

- **Chrome Mobile** (Android)
- **Safari Mobile** (iOS)
- **Firefox Mobile**
- **Samsung Internet**
- **Edge Mobile**

## Running Tests

### Command Line Interface

The mobile testing script provides various commands for different testing scenarios:

```bash
# Install dependencies
./scripts/mobile-test.sh install

# Run all mobile tests
./scripts/mobile-test.sh test

# Run specific test categories
./scripts/mobile-test.sh test suite        # Main test suite
./scripts/mobile-test.sh test viewport     # Viewport tests only
./scripts/mobile-test.sh test touch        # Touch event tests only

# Run with browser visible (for debugging)
./scripts/mobile-test.sh test headed

# Run in debug mode (step through tests)
./scripts/mobile-test.sh test debug

# Run performance tests
./scripts/mobile-test.sh performance

# Run accessibility tests
./scripts/mobile-test.sh accessibility

# Run network condition tests
./scripts/mobile-test.sh network

# Generate test report
./scripts/mobile-test.sh report

# Open test results
./scripts/mobile-test.sh open
```

### npm Scripts Integration

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test:mobile": "./scripts/mobile-test.sh test",
    "test:mobile:viewport": "./scripts/mobile-test.sh test viewport",
    "test:mobile:touch": "./scripts/mobile-test.sh test touch",
    "test:mobile:performance": "./scripts/mobile-test.sh performance",
    "test:mobile:headed": "./scripts/mobile-test.sh test headed",
    "test:mobile:install": "./scripts/mobile-test.sh install"
  }
}
```

### Configuration Options

**Environment Variables**:

```bash
export TEST_URL="http://localhost:4321"  # Override test URL
export CI="true"                         # CI environment flag
```

**Command Line Options**:

```bash
# Custom URL
./scripts/mobile-test.sh --url http://localhost:3000 test

# Don't start/stop server
./scripts/mobile-test.sh --no-server test
./scripts/mobile-test.sh --keep-server test
```

## Test Results

### Report Structure

After running tests, you'll find results in:

```
test-results/
├── screenshots/           # Device viewport screenshots
│   ├── iphone-se-layout.png
│   ├── ipad-portrait.png
│   └── ...
├── reports/
│   ├── lighthouse-mobile.html    # Performance audit
│   ├── lighthouse-mobile.json
│   └── mobile-test-summary.md
└── results.json          # Raw test results

playwright-report/
└── index.html            # Interactive test report
```

### Understanding Results

**Test Status Icons**:

- ✅ **Passed**: Test completed successfully
- ❌ **Failed**: Test failed with error details
- ⚠️ **Skipped**: Test was skipped (usually due to missing elements)
- 🔄 **Flaky**: Test passed after retry

**Performance Metrics**:

- **First Contentful Paint**: < 2.5s (mobile)
- **Largest Contentful Paint**: < 4.0s (mobile)
- **Time to Interactive**: < 5.0s (mobile)
- **Cumulative Layout Shift**: < 0.1

**Accessibility Checks**:

- Touch target size: ≥ 44×44px (iOS HIG)
- Color contrast: WCAG AA compliance
- Screen reader compatibility
- Keyboard navigation support

## Performance Testing

### Lighthouse Mobile Audit

The testing suite includes automated Lighthouse audits for mobile performance:

```bash
# Run performance tests
./scripts/mobile-test.sh performance
```

**Metrics Evaluated**:

- Performance score
- Accessibility score
- Best practices score
- SEO score
- Progressive Web App features

### Custom Performance Tests

**Network Simulation**:

- Slow 3G (400ms RTT, 400kb/s down, 400kb/s up)
- Fast 3G (150ms RTT, 1.6Mb/s down, 750kb/s up)
- 4G (20ms RTT, 9Mb/s down, 9Mb/s up)
- Offline mode

**Performance Thresholds**:

```typescript
const PERFORMANCE_THRESHOLDS = {
  firstContentfulPaint: 2500, // 2.5s
  largestContentfulPaint: 4000, // 4s
  timeToInteractive: 5000, // 5s
  cumulativeLayoutShift: 0.1,
};
```

### Performance Optimization Tips

1. **Image Optimization**:
   - Use responsive images with `srcset`
   - Implement lazy loading
   - Use modern formats (WebP, AVIF)

2. **CSS Optimization**:
   - Minimize critical CSS
   - Use CSS containment
   - Avoid layout-inducing animations

3. **JavaScript Optimization**:
   - Code splitting for mobile
   - Minimize main thread blocking
   - Use service workers for caching

## Accessibility Testing

### Mobile Accessibility Focus

The testing suite validates mobile-specific accessibility requirements:

**Touch Target Accessibility**:

```typescript
// Minimum touch target size validation
expect(Math.min(elementBox.width, elementBox.height)).toBeGreaterThanOrEqual(
  44
);
```

**Screen Reader Compatibility**:

- Proper heading structure (h1, h2, h3...)
- ARIA labels on interactive elements
- Skip links for navigation
- Focus management

**Visual Accessibility**:

- Color contrast ratios
- Text scaling support
- High contrast mode compatibility

### Running Accessibility Tests

```bash
# Run accessibility-focused tests
./scripts/mobile-test.sh accessibility

# Include accessibility in all tests
./scripts/mobile-test.sh test
```

## Network Conditions

### Simulated Network Conditions

The testing framework simulates various network conditions to ensure robust mobile performance:

**Connection Types**:

- **Offline**: Complete network disconnection
- **Slow 3G**: High latency, low bandwidth
- **Fast 3G**: Moderate latency and bandwidth
- **4G**: Low latency, high bandwidth

**Testing Scenarios**:

- Initial page load under poor conditions
- Offline functionality (cached content)
- Progressive enhancement
- Network recovery behavior

### Network Testing Commands

```bash
# Run network condition tests
./scripts/mobile-test.sh network

# Test specific network conditions
npx playwright test tests/mobile/mobile-test-suite.ts --grep "network"
```

## Troubleshooting

### Common Issues

**Test Server Not Starting**:

```bash
# Check if port is in use
lsof -i :4321

# Kill existing processes
pkill -f "preview"

# Restart with clean build
npm run build && npm run preview
```

**Playwright Browser Issues**:

```bash
# Reinstall browsers
npx playwright install --force

# Clear Playwright cache
rm -rf ~/.cache/ms-playwright
npx playwright install
```

**Network Permission Issues**:

```bash
# On macOS, allow network connections
sudo spctl --master-disable  # Temporary, re-enable after testing
```

**Test Timeout Issues**:

- Increase timeout in `playwright.config.ts`
- Check server response times
- Reduce test concurrency

### Debugging Tests

**Interactive Debugging**:

```bash
# Run tests with browser UI visible
./scripts/mobile-test.sh test headed

# Debug mode (step through tests)
./scripts/mobile-test.sh test debug

# Run specific test file
npx playwright test tests/mobile/touch-events.ts --debug
```

**Screenshot Analysis**:

- Check `test-results/screenshots/` for visual issues
- Compare screenshots across devices
- Look for layout inconsistencies

**Performance Debugging**:

- Review Lighthouse report for specific recommendations
- Check network tab in browser dev tools
- Analyze runtime performance metrics

### Environment-Specific Issues

**CI/CD Environment**:

```bash
# Set CI environment variable
export CI=true

# Use xvfb for headless testing on Linux
xvfb-run -a npx playwright test
```

**Docker Environment**:

```bash
# Use Playwright Docker image
docker run --rm -v $(pwd):/app -w /app mcr.microsoft.com/playwright:focal-dev npm run test:mobile
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/mobile-testing.yml`:

```yaml
name: Mobile Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  mobile-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build project
        run: npm run build

      - name: Run mobile tests
        run: ./scripts/mobile-test.sh test --no-server
        env:
          CI: true
          TEST_URL: http://localhost:4321

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: mobile-test-results
          path: |
            playwright-report/
            test-results/

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: lighthouse-report
          path: test-results/reports/lighthouse-mobile.*
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any

    tools {
        nodejs '20'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh './scripts/mobile-test.sh install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Mobile Testing') {
            steps {
                sh './scripts/mobile-test.sh test --no-server'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Mobile Test Report'
                    ])

                    archiveArtifacts artifacts: 'test-results/**/*', fingerprint: true
                }
            }
        }
    }
}
```

## Best Practices

### Test Development

1. **Test Organization**:
   - Group related tests in describe blocks
   - Use descriptive test names
   - Follow the AAA pattern (Arrange, Act, Assert)

2. **Device Coverage**:
   - Test most common devices first
   - Include edge cases (very small/large screens)
   - Test both orientations for tablets

3. **Performance Considerations**:
   - Run tests in parallel when possible
   - Use appropriate timeouts
   - Clean up resources after tests

### Maintenance

1. **Regular Updates**:
   - Update device list based on usage analytics
   - Keep Playwright and dependencies current
   - Review and update performance thresholds

2. **Monitoring**:
   - Track test execution times
   - Monitor flaky tests
   - Review failure patterns

3. **Documentation**:
   - Keep this guide updated
   - Document test environment changes
   - Maintain troubleshooting knowledge base

### Development Workflow

1. **Pre-Development**:
   - Run baseline tests before changes
   - Identify critical user journeys

2. **During Development**:
   - Run relevant tests frequently
   - Use headed mode for visual verification
   - Test on actual devices when possible

3. **Pre-Deployment**:
   - Run full test suite
   - Review performance metrics
   - Validate accessibility compliance

### Performance Guidelines

1. **Target Metrics**:
   - First Contentful Paint: < 2.5s
   - Time to Interactive: < 5s
   - Cumulative Layout Shift: < 0.1

2. **Optimization Strategies**:
   - Optimize critical rendering path
   - Use efficient loading strategies
   - Minimize JavaScript execution time

3. **Monitoring**:
   - Set up real user monitoring
   - Track core web vitals
   - Monitor mobile-specific metrics

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Lighthouse Performance Auditing](https://developers.google.com/web/tools/lighthouse)
- [Mobile Web Best Practices](https://developers.google.com/web/fundamentals/design-and-ux/principles)
- [WCAG Mobile Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design Mobile Guidelines](https://material.io/design/layout/responsive-layout-grid.html)

---

_This guide is maintained by the SECiD development team. For questions or contributions, please refer to the project repository._
