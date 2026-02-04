# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-02-04

### Added
- 🧪 **Behavior Monitor Test UI** - New interactive test page (`behavior-monitor.html`) for HeadlessBehaviorMonitor
  - Start/End Session buttons for controlling monitoring sessions
  - Real-time live sample counters (mouse, keyboard, scroll, touch, events)
  - Session status indicator with elapsed time display
  - Comprehensive analysis results display with per-category scores and metrics
  - Session metadata display (duration, total samples, timestamp)
  - Programmatic API access via `window.__behaviorMonitor`
- 🔗 **Navigation Link** - Added "Try Behavior Monitor" link in main index.html header
- ♿ **Accessibility Improvements**
  - Added `aria-label` attributes to buttons and navigation links
  - Added `role="status"` and `aria-live="polite"` to session status indicator
  - Added `aria-live="polite"` region for live sample counters
  - Added keyboard `:focus` styles for buttons
- 🛡️ **Error Handling** - Added defensive checks and try-catch for monitor initialization

### Changed
- Improved code quality with named constants for update intervals
- Changed initialization from `load` to `DOMContentLoaded` for faster page load
- Added interval cleanup to prevent memory leaks

## [2.0.0] - 2026-02-04

### Added
- 🏗️ **Modular Architecture** - Refactored monolithic codebase into separate modules
  - `scripts/modules/webdriver.js` - WebDriver/Selenium/Playwright detection
  - `scripts/modules/cdp.js` - CDP artifacts & stack trace detection
  - `scripts/modules/userAgent.js` - User-Agent pattern analysis & client hints
  - `scripts/modules/webgl.js` - WebGL renderer checks & GPU consistency tests
  - `scripts/modules/automation.js` - Automation flags & headless indicators
  - `scripts/modules/media.js` - MediaDevices & WebRTC checks
  - `scripts/modules/fingerprint.js` - Canvas, audio, font fingerprinting
  - `scripts/modules/worker.js` - Worker User-Agent mismatch detection
  - `scripts/modules/explanations.js` - Human-readable check descriptions
  - `scripts/utils/hash.js` - Shared hashing utility
- ⚛️ **React Demo App** - Modern React-based UI with Vite
  - Modular component structure (`components/`, `hooks/`)
  - Separated UI logic (`useHeadlessDetection` hook) from view components
  - Cross-platform sync scripts for keeping detection script in sync
- 🧪 **Modular Tests** - Split tests by detection module
  - `webdriver.test.js`, `cdp.test.js`, `userAgent.test.js`, `worker.test.js`
  - `automation.test.js`, `media.test.js`, `fingerprint.test.js`
  - Integration tests remain in main test file
  - 115+ tests total

### Changed
- Optimized WebGL rendering test with fixed 64x64 canvas and pixel sampling
- Canvas hash now uses base-16 (hex) format for legacy compatibility
- WebRTC check only instantiates RTCPeerConnection when API is available
- Expanded module validation to cover all required functions
- Fixed automation function counting to avoid double-counting

### Fixed
- Fixed `rendered` property missing in emoji check failure paths
- Fixed mount state tracking in React hook to prevent state updates after unmount
- Fixed timeout cleanup in useHeadlessDetection hook
- Updated emoji explanations to accurately describe current behavior

## [1.2.0] - 2026-02-04

### Added
- 🎭 **Playwright Detection (Castle.io 2026)** - Detects `__playwright__binding__`, `__pwInitScripts` and exposed functions with `__installed` property
- 🔧 **Worker UA Check** - Compares User-Agent between main thread and Web Worker to detect automation inconsistencies
- 😀 **Emoji OS Consistency Check** - Verifies emoji rendering matches declared operating system
- 🎨 **WebGL Rendering Test** - Performs complex 3D scene rendering to detect software renderers vs real GPU
- Tooltips for all Playwright detection checks in UI
- 18 new unit tests for 2026 detection methods (46 total tests)
- Check item explanations for all new detection methods

### Changed
- Score calculation now includes Playwright binding detection (+0.30) and exposed functions (+0.25)
- Improved `_generateDetectionSummary()` to use cached results instead of re-running checks
- Playwright exposed function detection now ignores HeadlessDetector's own functions

### Fixed
- Fixed infinite loop caused by recursive calls in `_generateDetectionSummary()`
- Fixed async Worker checks blocking page load
- Fixed false positives from detecting HeadlessDetector's own exported functions

## [1.0.1] - 2026-02-03

### Fixed
- Fixed HTMLCanvasElement.prototype.getContext errors in Jest test environment by mocking canvas operations in test setup

## [1.0.0] - 2026-02-03

### Added
- Initial stable release
- Comprehensive headless browser detection with 10+ detection vectors
- WebDriver detection for automation framework identification
- Chrome DevTools Protocol (CDP) artifacts detection
- User-Agent analysis for headless indicators
- Advanced CDP/Runtime checks with error stack trace analysis
- WebGL renderer detection (software vs hardware GPU)
- Media Devices & WebRTC availability checks
- Browser fingerprinting (Canvas, Audio Context, Font detection)
- Automation flags detection (Selenium, Puppeteer, Playwright, Cypress)
- Headless indicators (window dimensions, permissions)
- Detection explanations and human-readable summaries
- Detailed risk assessment and scoring (0.0 - 1.0)
- Classification system (Normal Browser, Minor Warnings, Suspicious, Likely Headless, Definitely Headless)
- DOM attributes for easy integration
- Window attachment for automation testing
- NPM package support
- Comprehensive unit test suite (19 tests)
- GitHub Actions CI/CD workflows
- Automated publishing to NPM

### Documentation
- Comprehensive README with usage examples
- API reference documentation
- Browser compatibility information
- Research references from industry leaders (Castle.io, DataDome, FingerprintJS)

[2.1.0]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v2.1.0
[2.0.0]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v2.0.0
[1.2.0]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v1.2.0
[1.0.1]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v1.0.1
[1.0.0]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v1.0.0
