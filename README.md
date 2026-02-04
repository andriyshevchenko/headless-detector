# Headless Browser Detector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/andriyshevchenko/headless-detector)
[![CI Tests](https://github.com/andriyshevchenko/headless-detector/actions/workflows/test.yml/badge.svg)](https://github.com/andriyshevchenko/headless-detector/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/headless-detector.svg)](https://www.npmjs.com/package/headless-detector)

A comprehensive JavaScript library for detecting headless browsers, automation frameworks, and bot activity. Built with the latest 2025/2026 detection techniques from industry leaders like Castle.io, DataDome, and FingerprintJS.

**NEW:** Includes standalone behavioral analysis module for advanced bot detection through user interaction patterns.

## Features

- 🎯 **15+ Detection Vectors** - Multi-layered approach using various detection methods
- 🎭 **Playwright Detection** - Identifies Playwright bindings and exposed functions (NEW 2026)
- 🔧 **Worker UA Check** - Compares User-Agent between main thread and Worker (NEW 2026)
- 😀 **Emoji OS Consistency** - Verifies emoji rendering matches OS (NEW 2026)
- 🎨 **WebGL Rendering Test** - Complex 3D rendering to detect software renderers (NEW 2026)
- 🖱️ **Behavioral Analysis Module** - Separate API to monitor user interactions for bot-like patterns (NEW 2026)
- 🔍 **Advanced CDP Detection** - Identifies Chrome DevTools Protocol usage
- 🖌️ **Fingerprinting** - Canvas, Audio Context, and Font detection
- 📱 **Media Checks** - WebRTC and MediaDevices availability
- 🤖 **Automation Detection** - Selenium, Puppeteer, Playwright identification
- 📊 **Detailed Reporting** - Human-readable explanations and risk assessments
- ⚡ **Easy Integration** - Simple API with multiple access methods

## Detection Methods

| Method | Impact | Description |
|--------|--------|-------------|
| WebDriver Detection | High | Checks for `navigator.webdriver` and automation properties |
| CDP Artifacts | Very High | Detects ChromeDriver and CDP connection signals |
| **Playwright Bindings** | Very High | Detects `__playwright__binding__`, `__pwInitScripts` (NEW 2026) |
| **Playwright Exposed Functions** | Very High | Detects functions with `__installed` property (NEW 2026) |
| **Worker UA Check** | High | Compares User-Agent in main thread vs Worker (NEW 2026) |
| **Emoji OS Consistency** | Medium | Verifies emoji rendering matches declared OS (NEW 2026) |
| **WebGL Rendering Test** | Medium | Complex 3D scene rendering test (NEW 2026) |
| User-Agent Analysis | High | Identifies automation patterns in browser identification |
| Advanced CDP/Runtime | Very High | Error stack trace and Chrome runtime validation |
| WebGL Renderer | Medium | Detects software rendering vs hardware GPU |
| Media Devices & WebRTC | Medium | Verifies camera/microphone and WebRTC availability |
| Browser Fingerprinting | Medium-High | Canvas, Audio Context, and Font detection |
| Automation Flags | High | Scans for framework-specific global variables |
| Headless Indicators | Medium | Checks window dimensions and permissions |

**Note:** Behavioral analysis is available as a separate module (`HeadlessBehaviorMonitor`) that can be used independently or combined with headless detection.

## Installation

### NPM (Recommended)

```bash
npm install headless-detector
```

### Using in Node.js

**Note:** This library is designed for browser environments. For Node.js usage, you need a DOM implementation like jsdom:

```javascript
// Set up jsdom environment first
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = window.document;
global.navigator = window.navigator;

// Now you can use the detector
const { detectHeadless } = require('headless-detector');
const results = detectHeadless();
console.log('Headless Score:', results.isHeadless);
console.log('Classification:', results.summary.classification);
```

### Using in Browser

You can use the library directly in the browser via CDN or local installation:

**Via CDN (Recommended for quick testing):**
```html
<script src="https://unpkg.com/headless-detector@1/scripts/headless-detector.js"></script>
<script>
  const results = detectHeadless();
  console.log('Detection Results:', results);
</script>
```

**Via npm install:**
```html
<script src="node_modules/headless-detector/scripts/headless-detector.js"></script>
<script>
  const results = detectHeadless();
  console.log('Detection Results:', results);
</script>
```

**Note:** When using via npm, ensure your build process or server makes the file accessible, or use a bundler like Webpack/Rollup.

### Clone from GitHub

```bash
# Clone the repository
git clone https://github.com/andriyshevchenko/headless-detector.git

# Navigate to the detector directory
cd headless-detector
```

## Usage

### Basic Headless Detection

```javascript
// Run detection
const results = await detectHeadless();

console.log('Headless Score:', results.isHeadless); // 0.0 - 1.0
console.log('Classification:', results.summary.classification);
console.log('Risk Level:', results.summary.riskLevel);
```

### With Window Attachment (for automation testing)

```javascript
// Attach results to window for easy access
const results = await detectHeadless(true);

// Access from window object
console.log(window.__headlessDetectionScore); // Quick score access
console.log(window.__headlessDetection.summary); // Full summary
```

---

## Behavioral Analysis Module (Separate API)

The `HeadlessBehaviorMonitor` is a standalone module that analyzes user interactions over time to detect bot-like patterns. These checks are fundamentally harder to spoof than fingerprint checks because they require genuine human interaction patterns.

**Key Concept:** The behavioral module is completely independent and can be used:
- **Standalone** - For pure behavioral analysis
- **Combined with headless detection** - Use both results in your application logic

### Using Behavioral Monitor Standalone

```javascript
// Import the module
const HeadlessBehaviorMonitor = require('headless-detector/scripts/behavior-monitor.js');
// Or in browser: window.HeadlessBehaviorMonitor

// Create and start monitor
const monitor = new HeadlessBehaviorMonitor({
    mouse: true,
    keyboard: true,
    scroll: true,
    timeout: 10000
});

monitor.start();

// Wait for enough user interaction data
await monitor.waitForReady(10000);

// Get behavioral analysis results
const behaviorResults = monitor.getResults();
console.log('Behavioral Score:', behaviorResults.overallScore);
console.log('Confidence:', behaviorResults.confidence);
console.log('Mouse Efficiency:', behaviorResults.mouse.metrics.mouseEfficiency);

monitor.stop();
```

### Combining Both APIs

```javascript
// Run both detections independently
const headlessResults = await detectHeadless();

const monitor = new HeadlessBehaviorMonitor({ timeout: 10000 });
monitor.start();
await monitor.waitForReady();
const behaviorResults = monitor.getResults();
monitor.stop();

// Combine results in your application logic
const combinedScore = (headlessResults.isHeadless * 0.6) + (behaviorResults.overallScore * 0.4);
console.log('Headless Score:', headlessResults.isHeadless);
console.log('Behavioral Score:', behaviorResults.overallScore);
console.log('Combined Score:', combinedScore);
```

### Behavioral Monitor - Full API

#### Configuration Options

```javascript
// Import or access the class
const HeadlessBehaviorMonitor = window.HeadlessBehaviorMonitor;
// Or: require('headless-detector/scripts/behavior-monitor.js')

// Create monitor with options
const monitor = new HeadlessBehaviorMonitor({
    mouse: true,           // Monitor mouse movements
    keyboard: true,        // Monitor keyboard timing
    scroll: true,          // Monitor scroll behavior
    touch: true,           // Monitor touch events
    events: true,          // Monitor general events
    sensors: true,         // Monitor device sensors
    webglTiming: true,     // Measure WebGL shader timing
    
    minSamples: {          // Minimum samples needed per category
        mouse: 20,
        keyboard: 10,
        scroll: 5,
        touch: 5,
        events: 10
    },
    
    timeout: 30000,        // Auto-stop after 30 seconds
    
    // Optional callbacks
    onReady: (results) => {
        console.log('Enough samples collected:', results);
    },
    onSuspicious: (signal) => {
        console.log('Suspicious signal detected:', signal);
    },
    onSample: (info) => {
        console.log('Sample collected:', info);
    }
});

// Start monitoring
monitor.start();

// Check status
const status = monitor.getStatus();
console.log('Running:', status.isRunning);
console.log('Samples collected:', status.samples);

// Wait for enough samples
await monitor.waitForReady(30000);

// Get current results
const results = monitor.getResults();
console.log('Behavioral Score:', results.overallScore);
console.log('Confidence:', results.confidence);

// Stop monitoring and get final results
const finalResults = monitor.stop();
```

#### Behavioral Checks Explained

| Check | Description | Why Hard to Spoof |
|-------|-------------|-------------------|
| **Mouse Movement Entropy** | Analyzes velocity variance, angle variance, acceleration, straight-line ratio | Human movement is chaotic & unpredictable; bots tend to move in straight lines or consistent patterns |
| **Mouse Efficiency** | Calculates ratio of straight distance vs actual path (straightDistance / pathDistance) | Bots move very directly (efficiency > 0.95); humans wander and curve (efficiency 0.3-0.8) |
| **Keyboard Biometrics** | Measures key hold times, inter-key timing variance | Typing rhythm is unique per person; automated scripts have too-consistent timing |
| **Scroll Behavior** | Checks delta variance, interval variance, unique delta counts | Real scrolling has inertia & variance; automated scrolling is too regular |
| **Touch Analysis** | Measures force variance, radius variance | Real touch has physical properties that vary; simulated touch is too consistent |
| **Event Timing** | Checks `isTrusted` flag, interval variance | Synthetic events lack the `isTrusted` flag and have suspicious timing patterns |
| **Sensor Entropy** | Analyzes accelerometer/gyroscope noise | Real hardware sensors have physical noise; simulated sensors are too stable |
| **WebGL Shader Timing** | Measures shader compilation time | GPU-specific compilation patterns are hard to fake consistently |

---

### Accessing Individual Checks

```javascript
// Use the HeadlessDetector namespace
const webdriverDetected = window.HeadlessDetector.checks.webdriver();
const cdpDetected = window.HeadlessDetector.checks.cdp();
const userAgent = window.HeadlessDetector.checks.userAgent();
```

### Using Explanations

```javascript
const detection = detectHeadless(true);

// Get all detection method explanations
console.log(detection.explanations);

// Get specific explanation
console.log(detection.explanations.cdpArtifacts.purpose);
// "Identifies ChromeDriver/CDP-based automation (Puppeteer, Playwright, Selenium 4+)"
```

### Summary Report

```javascript
const detection = detectHeadless(true);
const summary = detection.summary;

console.log(`Score: ${summary.score}`);
console.log(`Classification: ${summary.classification}`);
console.log(`Risk Level: ${summary.riskLevel}`);
console.log(`Total Issues: ${summary.totalIssues}`);
console.log(`Recommendation: ${summary.recommendation}`);

// Get specific issues
summary.detections.forEach(d => {
  console.log(`${d.severity.toUpperCase()}: ${d.message}`);
});
```

## API Reference

### Headless Detection API

#### `detectHeadless(attachToWindow)`

Main detection function for instant headless browser detection.

**Parameters:**
- `attachToWindow` (boolean, optional) - If true, attaches results to `window.__headlessDetection`

**Returns:** Promise<Object> with detection results

```javascript
// Basic usage
const results = await detectHeadless();

// With window attachment
const results = await detectHeadless(true);
```

**Result Object:**

```javascript
{
  isHeadless: 0.17,                    // Score 0.0-1.0
  webdriver: false,                    // WebDriver detected
  automationFlags: {...},              // Automation framework flags
  cdpArtifacts: {...},                 // CDP detection results
  headlessIndicators: {...},           // Headless mode indicators
  userAgentFlags: {...},               // User-Agent analysis
  webglFlags: {...},                   // WebGL renderer info
  advancedChecks: {...},               // Advanced detection methods
  mediaChecks: {...},                  // Media/WebRTC checks
  fingerprintChecks: {...},            // Fingerprinting results
  checkItemExplanations: {...},        // Method explanations
  summary: {...},                      // Detection summary
  timestamp: 1738584000000,
  userAgent: "Mozilla/5.0...",
  detectionVersion: "1.0.0"
}
```

---

### Behavioral Analysis API

#### `HeadlessBehaviorMonitor`

Class for monitoring user interactions over time to detect bot-like behavioral patterns.

**Constructor Options:**

```javascript
new HeadlessBehaviorMonitor({
    // Feature flags
    mouse: true,           // Monitor mouse movements (default: true)
    keyboard: true,        // Monitor keyboard timing (default: true)
    scroll: true,          // Monitor scroll behavior (default: true)
    touch: true,           // Monitor touch events (default: true)
    events: true,          // Monitor general events (default: true)
    sensors: true,         // Monitor device sensors (default: true)
    webglTiming: true,     // Measure WebGL timing (default: true)
    
    // Minimum samples needed
    minSamples: {
        mouse: 20,         // Default: 20
        keyboard: 10,      // Default: 10
        scroll: 5,         // Default: 5
        touch: 5,          // Default: 5
        events: 10         // Default: 10
    },
    
    // Timeout and callbacks
    timeout: 30000,        // Auto-stop timeout (default: 30000ms)
    onReady: (results) => {},      // Called when enough samples collected
    onSuspicious: (signal) => {},  // Called on suspicious patterns
    onSample: (info) => {}         // Called on each sample
});
```

**Methods:**

- `start()` - Start monitoring user interactions
- `stop()` - Stop monitoring and return final results
- `getStatus()` - Get current monitoring status
- `getResults()` - Get analysis results
- `waitForReady(timeout)` - Promise that resolves when enough samples collected

**Results Object:**

```javascript
{
    mouse: {
        available: true,
        score: 0.3,           // Suspiciousness score 0-1
        confidence: 0.85,     // Confidence in the score
        metrics: {
            sampleCount: 25,
            velocityVariance: 0.042,
            angleVariance: 0.13,
            straightLineRatio: 0.12,
            untrustedRatio: 0,
            mouseEfficiency: 0.67,      // straightDistance / pathDistance
            straightDistance: 150.5,    // Direct distance from start to end
            pathDistance: 224.8         // Total distance traveled
        }
    },
    keyboard: {...},
    scroll: {...},
    touch: {...},
    events: {...},
    sensors: {...},
    webglTiming: {...},
    overallScore: 0.28,      // Combined score 0-1
    confidence: 0.82,         // Overall confidence
    metadata: {
        samplesCollected: {...},
        duration: 15234
    }
}
```

**Mouse Efficiency Metric:**
- **mouseEfficiency** = straightDistance / pathDistance
- Bot movements: efficiency > 0.95 (very direct, straight lines)
- Human movements: efficiency typically 0.3-0.8 (curved, wandering paths)
- Lower efficiency indicates more human-like behavior

### Window Access

When `attachToWindow` is true:

```javascript
window.__headlessDetection        // Full detection object
window.__headlessDetectionScore   // Quick score access
window.HeadlessDetector          // Detection namespace
window.HeadlessDetector.checks   // Individual check functions
```

### DOM Attributes

```javascript
document.documentElement.getAttribute('data-headless-score')     // "0.170"
document.documentElement.getAttribute('data-headless-detected')  // "false"
document.documentElement.getAttribute('data-detection-version')  // "1.0.0"
```

## Demo

Open `client/detectors/index.html` in your browser to see the interactive demo with real-time detection results.

## Score Interpretation

| Score | Classification | Risk Level | Meaning |
|-------|---------------|------------|---------|
| 0.0 - 0.15 | Normal Browser | Low | Minimal or no automation signals |
| 0.15 - 0.3 | Minor Warnings | Low | Some minor indicators present |
| 0.3 - 0.5 | Suspicious | Medium | Multiple automation indicators |
| 0.5 - 0.7 | Likely Headless | High | Strong automation signals |
| 0.7 - 1.0 | Definitely Headless | High | Confirmed automation/headless |

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Edge 90+
- Safari 14+
- Opera 76+

## Research & References

This detector is based on the latest research from:
- [Castle.io Blog](https://blog.castle.io/) - CDP and Puppeteer detection
- [DataDome Research](https://datadome.co/threat-research/) - Advanced bot detection
- [FingerprintJS BotD](https://github.com/fingerprintjs/BotD) - Open-source bot detection
- [Browserless Documentation](https://docs.browserless.io/) - Stealth techniques
- [W3C Fingerprinting Guidance](https://www.w3.org/TR/fingerprinting-guidance/) - Privacy considerations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Research from Castle.io, DataDome, and FingerprintJS
- Detection techniques from the bot detection community
- W3C specifications and guidance

## Version History

### 1.2.0 (2026-02-04)
- 🎭 **Playwright Detection** - Detects `__playwright__binding__`, `__pwInitScripts` and exposed functions
- 🔧 **Worker UA Check** - Compares User-Agent between main thread and Worker
- 😀 **Emoji OS Consistency** - Verifies emoji rendering matches OS
- 🎨 **WebGL Rendering Test** - Complex 3D scene rendering test
- 18 new unit tests (46 total)
- Fixed async Worker checks and infinite loop issues

### 1.0.0 (2026-02-03)
- Initial stable release with comprehensive headless browser detection
- 10+ detection vectors for multi-layered approach
- WebDriver, CDP, and User-Agent detection
- Advanced CDP/Runtime checks with error stack trace analysis
- WebGL renderer analysis (software vs hardware GPU)
- Media Devices and WebRTC availability checks
- Canvas, Audio Context, and Font fingerprinting
- Automation framework detection (Selenium, Puppeteer, Playwright, Cypress)
- Detection explanations and summary reports
- Detailed risk assessment and classification
- NPM package with automated testing and publishing

---

Made with ❤️ for better bot detection
