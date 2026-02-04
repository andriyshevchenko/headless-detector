/**
 * Unit tests for Automation Detection Module
 */

// Store original values
const originalNavigator = global.navigator;
const originalWindow = global.window;

describe('Automation Module', () => {
    let automationModule;

    beforeEach(() => {
        // Reset modules first
        jest.resetModules();
        
        // Set up mock environment - must happen before module is loaded
        const mockNavigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            webdriver: undefined,
            plugins: { length: 5 },
            languages: ['en-US', 'en'],
            mimeTypes: { length: 4 },
            cookieEnabled: true,
            doNotTrack: null,
            permissions: {},
            connection: null,
            language: 'en-US',
            platform: 'Win32',
            hardwareConcurrency: 8,
            deviceMemory: 8,
            maxTouchPoints: 0
        };

        Object.defineProperty(global, 'navigator', {
            value: mockNavigator,
            configurable: true,
            writable: true
        });

        global.window = {
            ...global,
            outerWidth: 1920,
            outerHeight: 1080,
            innerWidth: 1900,
            innerHeight: 1040,
            devicePixelRatio: 1,
            chrome: { runtime: { id: 'test-id' } },
            screen: {
                colorDepth: 24,
                pixelDepth: 24,
                width: 1920,
                height: 1080
            }
        };

        global.screen = global.window.screen;
        global.Notification = { permission: 'default' };
        global.Intl = {
            DateTimeFormat: () => ({
                resolvedOptions: () => ({ timeZone: 'America/New_York' })
            })
        };

        automationModule = require('../../scripts/modules/automation.js');
    });

    afterEach(() => {
        // Clean up automation properties
        if (global.window) {
            delete global.window.domAutomation;
            delete global.window.domAutomationController;
            delete global.window._selenium;
            delete global.window.__playwright;
            delete global.window.__playwright__binding__;
            delete global.window.__pwInitScripts;
            delete global.window.exposedFunc;
        }
    });

    describe('getAutomationFlags', () => {
        test('should return automation flags object', () => {
            const result = automationModule.getAutomationFlags();
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });

        test('should detect webdriver flag', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    ...global.navigator,
                    webdriver: true
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/automation.js');
            const result = freshModule.getAutomationFlags();
            expect(result.webdriver).toBe(true);
        });

        test('should detect Playwright bindings', () => {
            global.window.__playwright__binding__ = {};
            jest.resetModules();
            const freshModule = require('../../scripts/modules/automation.js');
            const result = freshModule.getAutomationFlags();
            expect(result.__playwright__binding__).toBe(true);
        });

        test('should report plugins count', () => {
            const result = automationModule.getAutomationFlags();
            expect(result.plugins).toBe(5);
        });

        test('should report languages availability', () => {
            const result = automationModule.getAutomationFlags();
            expect(result.languages).toBe(true);
        });

        test('should include chrome property', () => {
            const result = automationModule.getAutomationFlags();
            expect(result).toHaveProperty('chrome');
            expect(result).toHaveProperty('chromeRuntime');
        });
    });

    describe('getHeadlessIndicators', () => {
        test('should return headless indicators object', () => {
            const result = automationModule.getHeadlessIndicators();
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });

        test('should detect outer dimensions', () => {
            const result = automationModule.getHeadlessIndicators();
            expect(result).toHaveProperty('hasOuterDimensions');
        });

        test('should include innerEqualsOuter property', () => {
            const result = automationModule.getHeadlessIndicators();
            expect(result).toHaveProperty('innerEqualsOuter');
        });

        test('should include screen properties', () => {
            const result = automationModule.getHeadlessIndicators();
            expect(result).toHaveProperty('screenColorDepth');
            expect(result).toHaveProperty('screenWidth');
            expect(result).toHaveProperty('screenHeight');
        });

        test('should include timezone info', () => {
            const result = automationModule.getHeadlessIndicators();
            expect(result.timezone).toBeDefined();
            expect(result.timezoneOffset).toBeDefined();
        });
    });

    describe('checkChromeRuntime', () => {
        test('should return chrome runtime check result', () => {
            const result = automationModule.checkChromeRuntime();
            expect(result).toHaveProperty('hasChrome');
            expect(result).toHaveProperty('hasRuntime');
        });

        test('should detect missing runtime when chrome exists but runtime does not', () => {
            global.window.chrome = {};
            jest.resetModules();
            const freshModule = require('../../scripts/modules/automation.js');
            const result = freshModule.checkChromeRuntime();
            expect(result.hasChrome).toBe(true);
            expect(result.hasRuntime).toBe(false);
            expect(result.missing).toBe(true);
        });
    });

    describe('checkPermissions', () => {
        test('should detect permissions API availability', () => {
            const result = automationModule.checkPermissions();
            expect(result.available).toBe(true);
        });

        test('should detect denied by default', () => {
            global.Notification.permission = 'denied';
            jest.resetModules();
            const freshModule = require('../../scripts/modules/automation.js');
            const result = freshModule.checkPermissions();
            expect(result.deniedByDefault).toBe(true);
        });
    });

    describe('detectPlaywrightExposedFunctions', () => {
        test('should return detection result object', () => {
            const result = automationModule.detectPlaywrightExposedFunctions();
            expect(result).toHaveProperty('detected');
            expect(result).toHaveProperty('count');
        });

        test('should detect function with __installed property', () => {
            global.window.exposedFunc = function() {};
            global.window.exposedFunc.__installed = true;
            
            jest.resetModules();
            const freshModule = require('../../scripts/modules/automation.js');
            const result = freshModule.detectPlaywrightExposedFunctions();
            
            expect(result.detected).toBe(true);
            expect(result.count).toBeGreaterThan(0);
        });
    });
});
