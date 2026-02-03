# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-02-03

### Fixed
- Fixed HTMLCanvasElement.prototype.getContext errors in Jest test environment by adding canvas package as dev dependency

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

[1.0.1]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v1.0.1
[1.0.0]: https://github.com/andriyshevchenko/headless-detector/releases/tag/v1.0.0
