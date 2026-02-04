/**
 * WebDriver Detection Module
 * Detects WebDriver flag and related properties
 * @module modules/webdriver
 */

/**
 * Detect WebDriver flag and related properties
 * @returns {boolean} True if webdriver or automation properties detected
 */
function detectWebdriver() {
    try {
        return !!(
            navigator.webdriver ||
            window.document.__webdriver_evaluate ||
            window.document.__selenium_evaluate ||
            window.document.__webdriver_script_fn ||
            window.document.__webdriver_script_func ||
            window.document.__webdriver_script_function ||
            window.document['$cdc_asdjflasutopfhvcZLmcfl_'] ||
            window.document['$wdc_'] ||
            window['_Selenium_IDE_Recorder'] ||
            window['_phantom'] ||
            window['__nightmare'] ||
            window.callPhantom ||
            window._phantom ||
            // 2026: Playwright bindings (Castle.io)
            window['__playwright__binding__'] ||
            window['__pwInitScripts']
        );
    } catch (e) {
        return false;
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { detectWebdriver };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.detectWebdriver = detectWebdriver;
}
