/**
 * Unit tests for User Agent Detection Module
 */

// Store original navigator
const originalNavigator = global.navigator;

describe('User Agent Module', () => {
    let userAgentModule;

    beforeEach(() => {
        // Reset modules first
        jest.resetModules();
        
        // Set up mock environment - must happen before module is loaded
        Object.defineProperty(global, 'navigator', {
            value: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                platform: 'Win32',
                userAgentData: undefined
            },
            configurable: true,
            writable: true
        });
        global.window = global;
        
        userAgentModule = require('../../scripts/modules/userAgent.js');
    });

    afterEach(() => {
        // Restore original navigator
        Object.defineProperty(global, 'navigator', {
            value: originalNavigator,
            configurable: true,
            writable: true
        });
    });

    describe('checkUserAgent', () => {
        test('should return not suspicious for normal user agent', () => {
            const result = userAgentModule.checkUserAgent();
            expect(result.suspicious).toBe(false);
            expect(result.matches).toEqual([]);
        });

        test('should detect HeadlessChrome in user agent', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'HeadlessChrome/91.0.4472.124',
                    platform: 'Win32',
                    userAgentData: undefined
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkUserAgent();
            expect(result.suspicious).toBe(true);
            expect(result.matches.length).toBeGreaterThan(0);
        });

        test('should detect Selenium in user agent', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'Mozilla/5.0 Selenium WebDriver',
                    platform: 'Win32',
                    userAgentData: undefined
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkUserAgent();
            expect(result.suspicious).toBe(true);
            expect(result.matches).toContain('/selenium/i');
        });

        test('should detect Puppeteer in user agent', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'Mozilla/5.0 Puppeteer',
                    platform: 'Win32',
                    userAgentData: undefined
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkUserAgent();
            expect(result.suspicious).toBe(true);
            expect(result.matches).toContain('/puppeteer/i');
        });

        test('should detect Playwright in user agent', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'Mozilla/5.0 Playwright',
                    platform: 'Win32',
                    userAgentData: undefined
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkUserAgent();
            expect(result.suspicious).toBe(true);
            expect(result.matches).toContain('/playwright/i');
        });

        test('should include client hints in result', () => {
            const result = userAgentModule.checkUserAgent();
            expect(result).toHaveProperty('clientHints');
        });
    });

    describe('checkClientHints', () => {
        test('should return platform from navigator', () => {
            const result = userAgentModule.checkClientHints();
            expect(result.platform).toBe('Win32');
        });

        test('should detect headless brand in userAgentData', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'Mozilla/5.0',
                    platform: 'Win32',
                    userAgentData: {
                        platform: 'Windows',
                        mobile: false,
                        brands: [
                            { brand: 'HeadlessChrome', version: '91' }
                        ]
                    }
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkClientHints();
            expect(result.suspicious).toBe(true);
        });

        test('should return not suspicious for normal brands', () => {
            jest.resetModules();
            Object.defineProperty(global, 'navigator', {
                value: {
                    userAgent: 'Mozilla/5.0',
                    platform: 'Win32',
                    userAgentData: {
                        platform: 'Windows',
                        mobile: false,
                        brands: [
                            { brand: 'Chrome', version: '91' },
                            { brand: 'Chromium', version: '91' }
                        ]
                    }
                },
                configurable: true,
                writable: true
            });
            const freshModule = require('../../scripts/modules/userAgent.js');
            const result = freshModule.checkClientHints();
            expect(result.suspicious).toBe(false);
        });
    });
});
