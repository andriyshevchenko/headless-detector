/**
 * Unit tests for CDP Detection Module
 */

// Mock browser environment
beforeEach(() => {
    global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        webdriver: undefined
    };

    global.window = global;
    global.document = {};

    // Clean up CDP properties
    Object.keys(global.window).forEach(key => {
        if (key.startsWith('cdc_') || key.startsWith('__')) {
            delete global.window[key];
        }
    });
});

describe('CDP Module', () => {
    let cdpModule;

    beforeEach(() => {
        jest.resetModules();
        cdpModule = require('../../scripts/modules/cdp.js');
    });

    describe('detectCDP', () => {
        test('should return detected false when no CDP artifacts', () => {
            const result = cdpModule.detectCDP();
            expect(result.detected).toBe(false);
            expect(result.signals).toEqual([]);
        });

        test('should detect ChromeDriver CDC keys', () => {
            global.window.cdc_random_key = 'value';
            const result = cdpModule.detectCDP();
            expect(result.detected).toBe(true);
            expect(result.signals).toContain('chromedriver_cdc');
            expect(result.cdcKeysFound).toBeGreaterThan(0);
        });

        test('should detect Selenium evaluate', () => {
            global.window.__webdriver_evaluate = function() {};
            const result = cdpModule.detectCDP();
            expect(result.detected).toBe(true);
            expect(result.signals).toContain('selenium_evaluate');
        });

        test('should detect Puppeteer evaluation script', () => {
            global.window.__puppeteer_evaluation_script__ = 'test';
            const result = cdpModule.detectCDP();
            expect(result.detected).toBe(true);
            expect(result.signals).toContain('puppeteer_eval');
        });

        test('should detect Firefox driver', () => {
            global.window.__fxdriver_evaluate = function() {};
            const result = cdpModule.detectCDP();
            expect(result.detected).toBe(true);
            expect(result.signals).toContain('firefox_driver');
        });
    });

    describe('detectCDPStackTrace', () => {
        test('should return cdpDetected property', () => {
            const result = cdpModule.detectCDPStackTrace();
            expect(result).toHaveProperty('cdpDetected');
            expect(result).toHaveProperty('method');
            expect(result.method).toBe('stack_trace_leak');
        });
    });

    describe('detectConsoleDebugLeak', () => {
        test('should return detected property', () => {
            const result = cdpModule.detectConsoleDebugLeak();
            expect(result).toHaveProperty('detected');
            expect(result).toHaveProperty('accessCount');
            expect(result).toHaveProperty('method');
            expect(result.method).toBe('console_debug_leak');
        });
    });
});
