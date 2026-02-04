/**
 * Unit tests for WebDriver Detection Module
 */

// Mock browser environment
beforeEach(() => {
    global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        webdriver: undefined,
        plugins: { length: 3 },
        languages: ['en-US', 'en']
    };

    global.window = global;
    global.document = {
        __webdriver_evaluate: undefined,
        __selenium_evaluate: undefined,
        __webdriver_script_fn: undefined,
        __webdriver_script_func: undefined,
        __webdriver_script_function: undefined
    };

    // Clean up automation properties
    delete global.window._Selenium_IDE_Recorder;
    delete global.window._phantom;
    delete global.window.__nightmare;
    delete global.window.callPhantom;
    delete global.window.__playwright__binding__;
    delete global.window.__pwInitScripts;
});

describe('WebDriver Module', () => {
    let webdriverModule;

    beforeEach(() => {
        jest.resetModules();
        webdriverModule = require('../../scripts/modules/webdriver.js');
    });

    describe('detectWebdriver', () => {
        test('should detect webdriver when navigator.webdriver is true', () => {
            global.navigator.webdriver = true;
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });

        test('should not detect webdriver when navigator.webdriver is undefined', () => {
            global.navigator.webdriver = undefined;
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(false);
        });

        test('should detect Selenium IDE Recorder', () => {
            global.window._Selenium_IDE_Recorder = true;
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });

        test('should detect PhantomJS', () => {
            global.window._phantom = true;
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });

        test('should detect Nightmare', () => {
            global.window.__nightmare = true;
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });

        test('should detect Playwright binding', () => {
            global.window.__playwright__binding__ = {};
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });

        test('should detect Playwright init scripts', () => {
            global.window.__pwInitScripts = [];
            const result = webdriverModule.detectWebdriver();
            expect(result).toBe(true);
        });
    });
});
