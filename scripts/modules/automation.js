/**
 * Automation Flags Detection Module
 * Detects automation-related flags and variables
 * @module modules/automation
 */

/**
 * Detect Playwright exposed functions (2026: Castle.io method)
 * Playwright exposes functions with __installed property and specific toString() output
 * NOTE: We exclude our own HeadlessDetector functions
 * @returns {Object} Playwright detection results
 */
function detectPlaywrightExposedFunctions() {
    try {
        let matchedCount = 0;
        const suspiciousFunctions = [];

        // Our own functions to ignore
        const ourFunctions = [
            '_calculateHeadlessScore', '_detectWebdriver', '_detectPlaywrightExposedFunctions',
            '_getAutomationFlags', '_detectCDP', '_getHeadlessIndicators', '_checkUserAgent',
            '_checkWebGL', '_getAdvancedChecks', '_getMediaChecks', '_getFingerprintChecks',
            '_getWorkerChecks', '_getWorkerChecksSync', '_getDetectionExplanations',
            '_generateDetectionSummary', '_checkCanvas', '_checkAudioContext', '_checkFonts',
            '_simpleHash', '_checkEmojiRendering', '_performWebGLRenderingTest',
            '_checkMediaDevices', '_checkWebRTC', '_checkBattery', '_detectCDPStackTrace',
            '_checkChromeRuntime', '_checkPermissions', '_detectConsoleDebugLeak',
            '_getCheckItemExplanations', 'detectHeadless', 'HeadlessDetector'
        ];

        Object.entries(window).forEach(([key, value]) => {
            // Skip our own functions
            if (ourFunctions.includes(key)) return;
            if (key.startsWith('_') && key.includes('Headless')) return;
            if (key === 'HeadlessDetector') return;

            if (typeof value === 'function') {
                // Check for __installed property (Playwright-specific)
                if (typeof value['__installed'] === 'boolean') {
                    matchedCount++;
                    suspiciousFunctions.push(key);
                }
                // Check for Playwright-specific toString pattern
                try {
                    const funcStr = value.toString();
                    // Only match actual Playwright patterns, not just any function
                    if (funcStr.includes('exposeBindingHandle supports a single argument') ||
                        funcStr.includes('serializeAsCallArgument') ||
                        funcStr.includes('globalThis[bindingName]') ||
                        funcStr.includes('me["callbacks"]') ||
                        funcStr.includes('me["lastSeq"]')) {
                        matchedCount++;
                        if (!suspiciousFunctions.includes(key)) {
                            suspiciousFunctions.push(key);
                        }
                    }
                } catch (e) {
                    // toString may throw
                }
            }
        });

        return {
            detected: matchedCount > 0,
            count: matchedCount,
            functions: suspiciousFunctions.slice(0, 5) // First 5 for privacy
        };
    } catch (e) {
        return { detected: false, count: 0, error: e.message };
    }
}

/**
 * Get all automation-related flags (2025 updated)
 * @returns {Object} Automation flags
 */
function getAutomationFlags() {
    try {
        return {
            // Core automation (2025: still relevant)
            webdriver: !!navigator.webdriver,
            domAutomation: !!window.domAutomation,
            domAutomationController: !!window.domAutomationController,

            // Selenium (2025: still in use)
            _selenium: !!window._selenium,
            __webdriver_script_fn: !!window.__webdriver_script_fn,
            __driver_evaluate: !!window.__driver_evaluate,
            __webdriver_evaluate: !!window.__webdriver_evaluate,
            __fxdriver_evaluate: !!window.__fxdriver_evaluate,
            __driver_unwrapped: !!window.__driver_unwrapped,
            __webdriver_unwrapped: !!window.__webdriver_unwrapped,
            __fxdriver_unwrapped: !!window.__fxdriver_unwrapped,
            _Selenium_IDE_Recorder: !!window._Selenium_IDE_Recorder,
            calledSelenium: !!window.calledSelenium,
            $chrome_asyncScriptInfo: !!window.$chrome_asyncScriptInfo,
            $cdc_asdjflasutopfhvcZLmcfl_: !!window.$cdc_asdjflasutopfhvcZLmcfl_,

            // Playwright specific (2025: new)
            __playwright: !!window.__playwright,
            playwrightGlobal: typeof window.playwright !== 'undefined',
            // 2026: Playwright binding detection (Castle.io method)
            __playwright__binding__: '__playwright__binding__' in window,
            __pwInitScripts: '__pwInitScripts' in window,
            playwrightExposedFunctions: detectPlaywrightExposedFunctions(),

            // Browser properties
            plugins: navigator.plugins ? navigator.plugins.length : 0,
            languages: navigator.languages && navigator.languages.length > 0,
            mimeTypes: navigator.mimeTypes ? navigator.mimeTypes.length : 0,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,

            // Chrome specific
            chrome: !!window.chrome,
            chromeRuntime: !!(window.chrome && window.chrome.runtime && window.chrome.runtime.id),

            // Permissions API
            permissionsAPI: !!navigator.permissions
        };
    } catch (e) {
        return { error: true };
    }
}

/**
 * Get headless browser indicators
 * @returns {Object} Headless indicators
 */
function getHeadlessIndicators() {
    try {
        return {
            // Window dimensions (headless often has no outer dimensions)
            hasOuterDimensions: window.outerWidth > 0 && window.outerHeight > 0,
            innerEqualsOuter: window.innerWidth === window.outerWidth &&
                window.innerHeight === window.outerHeight,
            outerWidth: window.outerWidth,
            outerHeight: window.outerHeight,
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,

            // Screen properties
            screenColorDepth: window.screen.colorDepth,
            screenPixelDepth: window.screen.pixelDepth,
            screenWidth: screen.width,
            screenHeight: screen.height,
            devicePixelRatio: window.devicePixelRatio,

            // Connection info (may be missing in headless)
            connectionType: navigator.connection ? navigator.connection.type : 'unknown',
            connectionRtt: navigator.connection ? navigator.connection.rtt : -1,
            connectionDownlink: navigator.connection ? navigator.connection.downlink : -1,

            // Notification permission (often denied by default in headless)
            notificationPermission: typeof Notification !== 'undefined' ?
                Notification.permission : 'unsupported',

            // API availability
            hasBattery: 'getBattery' in navigator,
            hasCredentials: 'credentials' in navigator,
            hasMediaDevices: 'mediaDevices' in navigator,
            hasServiceWorker: 'serviceWorker' in navigator,

            // Language/locale
            language: navigator.language,
            languages: navigator.languages ? Array.from(navigator.languages) : [],
            languageCount: navigator.languages ? navigator.languages.length : 0,

            // Platform info
            platform: navigator.platform,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            maxTouchPoints: navigator.maxTouchPoints || 0,

            // Timezone
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset()
        };
    } catch (e) {
        return { error: true };
    }
}

/**
 * Check Chrome Runtime availability (2025 method)
 * Headless Chrome often lacks chrome.runtime
 * @returns {Object} Chrome runtime check results
 */
function checkChromeRuntime() {
    try {
        const hasChrome = !!window.chrome;
        const hasRuntime = !!(window.chrome && window.chrome.runtime);
        const hasRuntimeId = !!(window.chrome && window.chrome.runtime && window.chrome.runtime.id);

        // Normal Chrome should have chrome.runtime, headless often doesn't
        const missing = hasChrome && !hasRuntime;

        return {
            hasChrome,
            hasRuntime,
            hasRuntimeId,
            missing,
            suspicious: missing
        };
    } catch (e) {
        return { error: true };
    }
}

/**
 * Check Permissions API behavior (2025 method)
 * Headless browsers often have different default permission states
 * @returns {Object} Permissions check results
 */
function checkPermissions() {
    try {
        if (!navigator.permissions) {
            return { available: false };
        }

        const deniedByDefault = typeof Notification !== 'undefined' &&
            Notification.permission === 'denied';

        return {
            available: true,
            notificationPermission: typeof Notification !== 'undefined' ?
                Notification.permission : 'unsupported',
            deniedByDefault
        };
    } catch (e) {
        return { available: false, error: true };
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectPlaywrightExposedFunctions,
        getAutomationFlags,
        getHeadlessIndicators,
        checkChromeRuntime,
        checkPermissions
    };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.detectPlaywrightExposedFunctions = detectPlaywrightExposedFunctions;
    window.HeadlessDetectorModules.getAutomationFlags = getAutomationFlags;
    window.HeadlessDetectorModules.getHeadlessIndicators = getHeadlessIndicators;
    window.HeadlessDetectorModules.checkChromeRuntime = checkChromeRuntime;
    window.HeadlessDetectorModules.checkPermissions = checkPermissions;
}
