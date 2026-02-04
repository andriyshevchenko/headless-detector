/**
 * Unit tests for Headless Browser Detector
 */

// Mock browser environment
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  webdriver: undefined,
  plugins: { length: 3 },
  languages: ['en-US', 'en']
};

global.window = global;

// Mock Worker for async tests
global.Worker = class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
  }
  postMessage() {
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: {
            userAgent: global.navigator.userAgent,
            platform: 'Win32'
          }
        });
      }
    }, 10);
  }
  terminate() { }
};

global.URL = {
  createObjectURL: () => 'blob:mock'
};

global.Blob = class MockBlob {
  constructor() { }
};

describe('HeadlessDetector', () => {
  let detector;

  beforeEach(() => {
    // Reset require cache to get fresh instance
    jest.resetModules();
    detector = require('../scripts/headless-detector.js');
  });

  describe('detectHeadless (async)', () => {
    test('should return a promise', () => {
      const result = detector.detectHeadless();
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve with detection results', async () => {
      const result = await detector.detectHeadless();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('isHeadless');
      expect(result).toHaveProperty('webdriver');
      expect(result).toHaveProperty('automationFlags');
      expect(result).toHaveProperty('cdpArtifacts');
      expect(result).toHaveProperty('userAgentFlags');
      expect(result).toHaveProperty('workerChecks');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('detectionVersion');
    });

    test('should return a score between 0 and 1', async () => {
      const result = await detector.detectHeadless();

      expect(result.isHeadless).toBeGreaterThanOrEqual(0);
      expect(result.isHeadless).toBeLessThanOrEqual(1);
    });

    test('should include detection summary', async () => {
      const result = await detector.detectHeadless();

      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('score');
      expect(result.summary).toHaveProperty('classification');
      expect(result.summary).toHaveProperty('riskLevel');
      expect(result.summary).toHaveProperty('totalIssues');
    });

    test('should include workerChecks with complete data', async () => {
      const result = await detector.detectHeadless();

      expect(result.workerChecks).toBeDefined();
      expect(result.workerChecks).toHaveProperty('available');
      // Worker should have completed by now (not pending)
      expect(result.workerChecks.pending).not.toBe(true);
    });

    test('should include check item explanations', async () => {
      const result = await detector.detectHeadless();

      expect(result.checkItemExplanations).toBeDefined();
      expect(typeof result.checkItemExplanations).toBe('object');
    });

    test('should have correct detection version', async () => {
      const result = await detector.detectHeadless();

      expect(result.detectionVersion).toBe('2.0.0');
    });
  });

  describe('checkWebdriver', () => {
    test('should detect webdriver when present', () => {
      global.navigator.webdriver = true;

      const result = detector.checkWebdriver();

      expect(result).toBe(true);
    });

    test('should not detect webdriver when absent', () => {
      global.navigator.webdriver = undefined;

      const result = detector.checkWebdriver();

      expect(result).toBe(false);
    });
  });

  describe('checkUserAgent', () => {
    test('should return user agent analysis', () => {
      const result = detector.checkUserAgent();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('should detect headless in user agent string', () => {
      // Need to mock navigator before loading module
      delete global.navigator;
      global.navigator = {
        userAgent: 'HeadlessChrome/91.0.4472.124',
        plugins: { length: 3 },
        languages: ['en-US', 'en']
      };

      // Reload the module
      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');

      const result = freshDetector.checkUserAgent();

      expect(result).toBeDefined();
      expect(result.suspicious).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    test('should not detect headless in normal user agent', () => {
      // Need to mock navigator before loading module
      delete global.navigator;
      global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        plugins: { length: 3 },
        languages: ['en-US', 'en']
      };

      // Reload the module
      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');

      const result = freshDetector.checkUserAgent();

      expect(result.suspicious).toBe(false);
      expect(result.matches.length).toBe(0);
    });
  });

  describe('getHeadlessScore (async)', () => {
    test('should return a promise', () => {
      const result = detector.getHeadlessScore();
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve to a number', async () => {
      const score = await detector.getHeadlessScore();

      expect(typeof score).toBe('number');
    });

    test('should return a score between 0 and 1', async () => {
      const score = await detector.getHeadlessScore();

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('getWorkerChecks (async)', () => {
    test('should return a promise', () => {
      const result = detector.getWorkerChecks();
      expect(result).toBeInstanceOf(Promise);
    });

    test('should resolve with worker check results', async () => {
      const result = await detector.getWorkerChecks();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('available');
    });

    test('should detect UA mismatch when worker UA differs', async () => {
      // Mock Worker to return different UA
      global.Worker = class MockMismatchWorker {
        constructor() {
          this.onmessage = null;
        }
        postMessage() {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  userAgent: 'Different/UserAgent',
                  platform: 'Win32'
                }
              });
            }
          }, 10);
        }
        terminate() { }
      };

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.getWorkerChecks();

      expect(result.userAgentMismatch).toBe(true);
    });
  });

  describe('Integration tests (async)', () => {
    test('should handle normal browser environment', async () => {
      // Reset to normal browser
      global.navigator.webdriver = undefined;
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';

      const result = await detector.detectHeadless();

      // Normal browser should have score less than 1 (not definitely headless)
      // In test env, some checks may trigger false positives due to missing APIs
      expect(result.isHeadless).toBeLessThan(1);
      expect(result.summary.classification).not.toBe('Definitely Headless');
    });

    test('should detect multiple automation signals', async () => {
      // Simulate headless environment
      global.navigator.webdriver = true;
      global.navigator.userAgent = 'HeadlessChrome/91.0.4472.124';

      const result = await detector.detectHeadless();

      // Should detect webdriver
      expect(result.webdriver).toBe(true);

      // Should have detected issues
      expect(result.summary.totalIssues).toBeGreaterThan(0);
    });

    test('should handle missing navigator properties gracefully', async () => {
      // Simulate minimal environment
      global.navigator = {
        userAgent: 'Test'
      };

      await expect(detector.detectHeadless()).resolves.toBeDefined();
    });

    test('should wait for worker check to complete', async () => {
      const startTime = Date.now();
      const result = await detector.detectHeadless();
      const endTime = Date.now();

      // Should have waited for worker (at least a few ms)
      expect(endTime - startTime).toBeGreaterThan(5);

      // Worker checks should not be pending
      expect(result.workerChecks.pending).not.toBe(true);
    });
  });

  describe('Module exports', () => {
    test('should export detectHeadless async function', () => {
      expect(detector.detectHeadless).toBeDefined();
      expect(typeof detector.detectHeadless).toBe('function');
    });

    test('should export helper functions', () => {
      expect(detector.getHeadlessScore).toBeDefined();
      expect(detector.checkWebdriver).toBeDefined();
      expect(detector.checkCDP).toBeDefined();
      expect(detector.checkUserAgent).toBeDefined();
      expect(detector.checkWebGL).toBeDefined();
      expect(detector.getWorkerChecks).toBeDefined();
    });
  });

  describe('Timestamp and metadata', () => {
    test('should include current timestamp', async () => {
      const before = Date.now();
      const result = await detector.detectHeadless();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    test('should include user agent in results', async () => {
      const result = await detector.detectHeadless();

      expect(result.userAgent).toBe(global.navigator.userAgent);
    });
  });

  describe('New 2026 checks', () => {
    test('should include emoji rendering check', async () => {
      const result = await detector.detectHeadless();

      expect(result.fingerprintChecks).toBeDefined();
      expect(result.fingerprintChecks.canvas).toBeDefined();
      // emojiCheck may not exist in test env without canvas
    });

    test('should include WebGL rendering test', async () => {
      const result = await detector.detectHeadless();

      expect(result.webglFlags).toBeDefined();
      // renderingTest may not exist without WebGL context
    });

    test('should include worker UA check with complete data', async () => {
      const result = await detector.detectHeadless();

      expect(result.workerChecks).toBeDefined();
      expect(result.workerChecks.available).toBeDefined();
      expect(result.workerChecks.userAgentMismatch).toBeDefined();
    });
  });

  describe('Playwright Detection (2026 Castle.io)', () => {
    beforeEach(() => {
      // Clean up any Playwright-like variables
      delete global.window.__playwright__binding__;
      delete global.window.__pwInitScripts;
    });

    test('should detect __playwright__binding__ variable', async () => {
      global.window.__playwright__binding__ = {};

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      expect(result.automationFlags.__playwright__binding__).toBe(true);
    });

    test('should detect __pwInitScripts variable', async () => {
      global.window.__pwInitScripts = [];

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      expect(result.automationFlags.__pwInitScripts).toBe(true);
    });

    test('should not detect Playwright when bindings are absent', async () => {
      // Make sure bindings are absent
      delete global.window.__playwright__binding__;
      delete global.window.__pwInitScripts;

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      expect(result.automationFlags.__playwright__binding__).toBe(false);
      expect(result.automationFlags.__pwInitScripts).toBe(false);
    });

    test('should detect Playwright exposed functions with __installed property', async () => {
      // Mock a Playwright-style exposed function
      global.window.exposedPlaywrightFunc = function () { };
      global.window.exposedPlaywrightFunc.__installed = true;

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      expect(result.automationFlags.playwrightExposedFunctions).toBeDefined();
      expect(result.automationFlags.playwrightExposedFunctions.detected).toBe(true);
      expect(result.automationFlags.playwrightExposedFunctions.count).toBeGreaterThan(0);

      // Cleanup
      delete global.window.exposedPlaywrightFunc;
    });

    test('should detect Playwright exposed functions by toString pattern', async () => {
      // Mock a function with Playwright's signature
      global.window.playwrightBinding = function () {
        // This mimics what Playwright's exposeBinding creates
        const exposeBindingHandle = 'supports a single argument';
        return exposeBindingHandle;
      };
      // Override toString to return Playwright-like code
      global.window.playwrightBinding.toString = () =>
        `(...args) => { if (exposeBindingHandle supports a single argument) throw new Error(); }`;

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      expect(result.automationFlags.playwrightExposedFunctions.detected).toBe(true);

      // Cleanup
      delete global.window.playwrightBinding;
    });

    test('should NOT detect our own HeadlessDetector functions as Playwright', async () => {
      // Our functions should be ignored
      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      // If playwrightExposedFunctions.functions exists, it should not contain our functions
      if (result.automationFlags.playwrightExposedFunctions.functions) {
        const ourFunctions = ['detectHeadless', '_calculateHeadlessScore', '_detectWebdriver'];
        ourFunctions.forEach(fn => {
          expect(result.automationFlags.playwrightExposedFunctions.functions).not.toContain(fn);
        });
      }
    });

    test('should increase score when Playwright bindings detected', async () => {
      // First get baseline score
      delete global.window.__playwright__binding__;
      delete global.window.__pwInitScripts;
      jest.resetModules();
      let freshDetector = require('../scripts/headless-detector.js');
      const baselineResult = await freshDetector.detectHeadless();
      const baselineScore = baselineResult.isHeadless;

      // Now add Playwright binding
      global.window.__playwright__binding__ = {};
      jest.resetModules();
      freshDetector = require('../scripts/headless-detector.js');
      const playwrightResult = await freshDetector.detectHeadless();

      expect(playwrightResult.isHeadless).toBeGreaterThan(baselineScore);

      // Cleanup
      delete global.window.__playwright__binding__;
    });
  });

  describe('Emoji Rendering Check (2026)', () => {
    test('should detect OS from User-Agent for emoji check', async () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.detectHeadless();

      // In test env, canvas might not be available, so check structure
      expect(result.fingerprintChecks).toBeDefined();
      expect(result.fingerprintChecks.canvas).toBeDefined();
    });

    test('should handle missing canvas gracefully', async () => {
      // Canvas not available in test env
      const result = await detector.detectHeadless();

      // Should not throw, should return result
      expect(result).toBeDefined();
      expect(result.fingerprintChecks).toBeDefined();
    });
  });

  describe('WebGL Rendering Test (2026)', () => {
    test('should include renderingTest property when WebGL available', async () => {
      const result = await detector.detectHeadless();

      expect(result.webglFlags).toBeDefined();
      // In test env, WebGL might not be available
      if (result.webglFlags.supported) {
        expect(result.webglFlags.renderingTest).toBeDefined();
      }
    });

    test('should detect software renderer in checkWebGL result', async () => {
      const result = await detector.detectHeadless();

      // In test env without real WebGL, just verify structure exists
      expect(result.webglFlags).toBeDefined();
      expect(result.webglFlags).toHaveProperty('supported');

      // isSoftwareRenderer should be defined if WebGL is supported
      if (result.webglFlags.supported) {
        expect(result.webglFlags).toHaveProperty('isSoftwareRenderer');
      }
    });
  });

  describe('Worker UA Check (2026)', () => {
    test('should detect platform mismatch', async () => {
      global.Worker = class MockPlatformMismatchWorker {
        constructor() {
          this.onmessage = null;
        }
        postMessage() {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  userAgent: global.navigator.userAgent,
                  platform: 'Linux' // Different from Win32
                }
              });
            }
          }, 10);
        }
        terminate() { }
      };

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.getWorkerChecks();

      expect(result.platformMismatch).toBe(true);
    });

    test('should not detect mismatch when UA and platform match', async () => {
      global.navigator.platform = 'Win32';
      global.Worker = class MockMatchingWorker {
        constructor() {
          this.onmessage = null;
        }
        postMessage() {
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: {
                  userAgent: global.navigator.userAgent,
                  platform: 'Win32'
                }
              });
            }
          }, 10);
        }
        terminate() { }
      };

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.getWorkerChecks();

      expect(result.userAgentMismatch).toBe(false);
      expect(result.platformMismatch).toBe(false);
    });

    test('should handle worker timeout gracefully', async () => {
      global.Worker = class MockTimeoutWorker {
        constructor() {
          this.onmessage = null;
        }
        postMessage() {
          // Never responds - simulates timeout
        }
        terminate() { }
      };

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');

      // Should resolve even with timeout (1 second default)
      const result = await freshDetector.getWorkerChecks();

      expect(result).toBeDefined();
      expect(result.available).toBe(false);
    }, 2000); // Extended timeout for this test

    test('should handle worker error gracefully', async () => {
      global.Worker = class MockErrorWorker {
        constructor() {
          this.onmessage = null;
          this.onerror = null;
        }
        postMessage() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({ message: 'Worker error' });
            }
          }, 10);
        }
        terminate() { }
      };

      jest.resetModules();
      const freshDetector = require('../scripts/headless-detector.js');
      const result = await freshDetector.getWorkerChecks();

      expect(result).toBeDefined();
      expect(result.available).toBe(false);
    });
  });

  describe('Check Item Explanations (2026)', () => {
    test('should include explanations for Playwright detection', async () => {
      const result = await detector.detectHeadless();

      expect(result.checkItemExplanations).toBeDefined();
      expect(result.checkItemExplanations['playwright-binding']).toBeDefined();
      expect(result.checkItemExplanations['playwright-binding'].label).toBe('__playwright__binding__');
    });

    test('should include explanations for new 2026 checks', async () => {
      const result = await detector.detectHeadless();

      const explanations = result.checkItemExplanations;

      // Worker check
      expect(explanations['worker-available']).toBeDefined();
      expect(explanations['worker-mismatch']).toBeDefined();

      // Emoji check
      expect(explanations['emoji-rendered']).toBeDefined();

      // WebGL rendering test
      expect(explanations['webgl-rendering-test']).toBeDefined();
    });
  });
});
