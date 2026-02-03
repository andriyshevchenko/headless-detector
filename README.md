# Headless Browser Detector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/andriyshevchenko/headless-detector)
[![CI Tests](https://github.com/andriyshevchenko/headless-detector/actions/workflows/test.yml/badge.svg)](https://github.com/andriyshevchenko/headless-detector/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/headless-detector.svg)](https://www.npmjs.com/package/headless-detector)

A comprehensive JavaScript library for detecting headless browsers, automation frameworks, and bot activity. Built with the latest 2025/2026 detection techniques from industry leaders like Castle.io, DataDome, and FingerprintJS.

## Features

- 🎯 **10+ Detection Vectors** - Multi-layered approach using various detection methods
- 🔍 **Advanced CDP Detection** - Identifies Chrome DevTools Protocol usage
- 🎨 **Fingerprinting** - Canvas, Audio Context, and Font detection
- 📱 **Media Checks** - WebRTC and MediaDevices availability
- 🤖 **Automation Detection** - Selenium, Puppeteer, Playwright identification
- 📊 **Detailed Reporting** - Human-readable explanations and risk assessments
- ⚡ **Easy Integration** - Simple API with multiple access methods

## Detection Methods

| Method | Impact | Description |
|--------|--------|-------------|
| WebDriver Detection | High | Checks for `navigator.webdriver` and automation properties |
| CDP Artifacts | Very High | Detects ChromeDriver and CDP connection signals |
| User-Agent Analysis | High | Identifies automation patterns in browser identification |
| Advanced CDP/Runtime | Very High | Error stack trace and Chrome runtime validation |
| WebGL Renderer | Medium | Detects software rendering vs hardware GPU |
| Media Devices & WebRTC | Medium | Verifies camera/microphone and WebRTC availability |
| Browser Fingerprinting | Medium-High | Canvas, Audio Context, and Font detection |
| Automation Flags | High | Scans for framework-specific global variables |
| Headless Indicators | Medium | Checks window dimensions and permissions |

## Installation

### NPM (Recommended)

```bash
npm install headless-detector
```

### Using in Node.js

```javascript
const { detectHeadless } = require('headless-detector');

// Run detection
const results = detectHeadless();
console.log('Headless Score:', results.isHeadless);
console.log('Classification:', results.summary.classification);
```

### Using in Browser

You can also use the library directly in the browser:

```html
<script src="node_modules/headless-detector/scripts/headless-detector.js"></script>
<script>
  const results = detectHeadless();
  console.log('Detection Results:', results);
</script>
```

### Clone from GitHub

```bash
# Clone the repository
git clone https://github.com/andriyshevchenko/headless-detector.git

# Navigate to the detector directory
cd headless-detector
```

## Usage

### Basic Usage

```javascript
// Run detection
const results = detectHeadless();

console.log('Headless Score:', results.isHeadless); // 0.0 - 1.0
console.log('Classification:', results.summary.classification);
console.log('Risk Level:', results.summary.riskLevel);
```

### With Window Attachment (for automation testing)

```javascript
// Attach results to window for easy access
const results = detectHeadless(true);

// Access from window object
console.log(window.__headlessDetectionScore); // Quick score access
console.log(window.__headlessDetection.summary); // Full summary
```

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

### `detectHeadless(attachToWindow)`

Main detection function.

**Parameters:**
- `attachToWindow` (boolean, optional) - If true, attaches results to `window.__headlessDetection`

**Returns:** Object with detection results

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
  explanations: {...},                 // Method explanations
  summary: {...},                      // Detection summary
  timestamp: 1738584000000,
  userAgent: "Mozilla/5.0...",
  detectionVersion: "2.1.0"
}
```

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
document.documentElement.getAttribute('data-detection-version')  // "2.1.0"
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

### 2.1.0 (2026-02-03)
- Added detection explanations and summary reports
- Enhanced automation testing access
- Added Media Devices and WebRTC checks
- Implemented Canvas, Audio Context, and Font fingerprinting
- Improved CDP detection with stack trace analysis
- Added 10+ detection vectors

### 2.0.0 (2026-02-03)
- Initial release with modern detection techniques
- WebDriver, CDP, and User-Agent detection
- WebGL renderer analysis
- Basic automation flag detection

---

Made with ❤️ for better bot detection
