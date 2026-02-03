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

describe('HeadlessDetector', () => {
  let detector;

  beforeEach(() => {
    // Reset require cache to get fresh instance
    jest.resetModules();
    detector = require('../scripts/headless-detector.js');
  });

  describe('detectHeadless', () => {
    test('should return an object with detection results', () => {
      const result = detector.detectHeadless();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('isHeadless');
      expect(result).toHaveProperty('webdriver');
      expect(result).toHaveProperty('automationFlags');
      expect(result).toHaveProperty('cdpArtifacts');
      expect(result).toHaveProperty('userAgentFlags');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('detectionVersion');
    });

    test('should return a score between 0 and 1', () => {
      const result = detector.detectHeadless();
      
      expect(result.isHeadless).toBeGreaterThanOrEqual(0);
      expect(result.isHeadless).toBeLessThanOrEqual(1);
    });

    test('should include detection summary', () => {
      const result = detector.detectHeadless();
      
      expect(result.summary).toBeDefined();
      expect(result.summary).toHaveProperty('score');
      expect(result.summary).toHaveProperty('classification');
      expect(result.summary).toHaveProperty('riskLevel');
      expect(result.summary).toHaveProperty('totalIssues');
    });

    test('should include explanations', () => {
      const result = detector.detectHeadless();
      
      expect(result.explanations).toBeDefined();
      expect(typeof result.explanations).toBe('object');
    });

    test('should have correct detection version', () => {
      const result = detector.detectHeadless();
      
      expect(result.detectionVersion).toBe('1.0.0');
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

  describe('getHeadlessScore', () => {
    test('should return a number', () => {
      const score = detector.getHeadlessScore();
      
      expect(typeof score).toBe('number');
    });

    test('should return a score between 0 and 1', () => {
      const score = detector.getHeadlessScore();
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration tests', () => {
    test('should handle normal browser environment', () => {
      // Reset to normal browser
      global.navigator.webdriver = undefined;
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124';
      
      const result = detector.detectHeadless();
      
      // Normal browser should have low score
      expect(result.isHeadless).toBeLessThan(0.5);
      expect(result.summary.riskLevel).not.toBe('high');
    });

    test('should detect multiple automation signals', () => {
      // Simulate headless environment
      global.navigator.webdriver = true;
      global.navigator.userAgent = 'HeadlessChrome/91.0.4472.124';
      
      const result = detector.detectHeadless();
      
      // Should detect webdriver
      expect(result.webdriver).toBe(true);
      
      // Should have detected issues
      expect(result.summary.totalIssues).toBeGreaterThan(0);
    });

    test('should handle missing navigator properties gracefully', () => {
      // Simulate minimal environment
      global.navigator = {
        userAgent: 'Test'
      };
      
      expect(() => {
        detector.detectHeadless();
      }).not.toThrow();
    });
  });

  describe('Module exports', () => {
    test('should export detectHeadless function', () => {
      expect(detector.detectHeadless).toBeDefined();
      expect(typeof detector.detectHeadless).toBe('function');
    });

    test('should export helper functions', () => {
      expect(detector.getHeadlessScore).toBeDefined();
      expect(detector.checkWebdriver).toBeDefined();
      expect(detector.checkCDP).toBeDefined();
      expect(detector.checkUserAgent).toBeDefined();
      expect(detector.checkWebGL).toBeDefined();
    });
  });

  describe('Timestamp and metadata', () => {
    test('should include current timestamp', () => {
      const before = Date.now();
      const result = detector.detectHeadless();
      const after = Date.now();
      
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    test('should include user agent in results', () => {
      const result = detector.detectHeadless();
      
      expect(result.userAgent).toBe(global.navigator.userAgent);
    });
  });
});
