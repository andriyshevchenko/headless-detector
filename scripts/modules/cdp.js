/**
 * CDP (Chrome DevTools Protocol) Detection Module
 * Detects CDP artifacts injected by automation tools
 * @module modules/cdp
 */

/**
 * Detect Chrome DevTools Protocol (CDP) artifacts
 * These appear when automation tools inject scripts via CDP
 * @returns {Object} CDP detection results
 */
function detectCDP() {
    try {
        const signals = [];

        // ChromeDriver injects cdc_ prefixed properties (ChromeDriver Canary Detection)
        // These are randomly named but always start with cdc_
        const cdcKeys = Object.keys(window).filter(k => k.startsWith('cdc_'));
        if (cdcKeys.length > 0) {
            signals.push('chromedriver_cdc');
        }

        // Selenium WebDriver specific properties
        if ('__webdriver_evaluate' in window) signals.push('selenium_evaluate');
        if ('__driver_evaluate' in window) signals.push('selenium_driver_evaluate');
        if ('__webdriver_unwrapped' in window) signals.push('selenium_unwrapped');
        if ('__driver_unwrapped' in window) signals.push('selenium_driver_unwrapped');
        if ('__selenium_evaluate' in window) signals.push('selenium_direct');
        if ('__fxdriver_evaluate' in window) signals.push('firefox_driver');
        if ('__fxdriver_unwrapped' in window) signals.push('firefox_driver_unwrapped');

        // Puppeteer-specific CDP artifacts
        if ('__puppeteer_evaluation_script__' in window) signals.push('puppeteer_eval');

        // Check for CDP Runtime.evaluate artifacts
        if (document.__webdriver_script_fn) signals.push('cdp_script_injection');

        // Check for modified navigator.webdriver getter
        try {
            const descriptor = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
            if (descriptor && typeof descriptor.get === 'function') {
                const getterStr = descriptor.get.toString();
                if (getterStr.indexOf('[native code]') === -1) {
                    signals.push('webdriver_getter_modified');
                }
            }
        } catch (e) {
            // Skip if can't access descriptor
        }

        return {
            detected: signals.length > 0,
            signals: signals,
            cdcKeysFound: cdcKeys.length
        };
    } catch (e) {
        return { detected: false, signals: [], error: true };
    }
}

/**
 * Detect CDP usage via Error stack trace (2025 method)
 * When Runtime.enable is used, Error.stack getter is accessed
 * @returns {Object} Stack trace detection results
 */
function detectCDPStackTrace() {
    try {
        let detected = false;
        const err = new Error();

        Object.defineProperty(err, 'stack', {
            configurable: false,
            enumerable: false,
            get() {
                detected = true;
                return '';
            }
        });

        // This will trigger stack access if CDP Runtime.enable is active
        console.debug(err);

        return {
            cdpDetected: detected,
            method: 'stack_trace_leak'
        };
    } catch (e) {
        return { cdpDetected: false, error: true };
    }
}

/**
 * Detect console.debug CDP leak (2025 method)
 * Alternative CDP detection via console.debug
 * @returns {Object} Console debug detection results
 */
function detectConsoleDebugLeak() {
    try {
        let accessCount = 0;
        const testObj = {};

        Object.defineProperty(testObj, 'id', {
            get() {
                accessCount++;
                return 'test';
            }
        });

        console.debug(testObj);

        // CDP Runtime.enable accesses properties multiple times
        return {
            detected: accessCount > 1,
            accessCount,
            method: 'console_debug_leak'
        };
    } catch (e) {
        return { detected: false, error: true };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectCDP, detectCDPStackTrace, detectConsoleDebugLeak };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.detectCDP = detectCDP;
    window.HeadlessDetectorModules.detectCDPStackTrace = detectCDPStackTrace;
    window.HeadlessDetectorModules.detectConsoleDebugLeak = detectConsoleDebugLeak;
}
