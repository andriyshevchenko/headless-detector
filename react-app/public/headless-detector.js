/**
 * Headless Browser Detection Module
 * Aggregates all signals related to headless browser, automation framework,
 * and bot detection from the current browser session.
 * 
 * Based on latest 2025/2026 research from:
 * - Castle.io, DataDome, Browserless
 * - FingerprintJS BotD
 * - W3C Fingerprinting Guidance
 * 
 * This file serves as the main entry point and aggregates all detection modules.
 * For modular usage, see scripts/modules/ directory.
 * 
 * @module HeadlessDetector
 * @version 1.0.0
 */

// Import modules for Node.js environment
let _modules = {};
if (typeof require !== 'undefined') {
    try {
        const webdriver = require('./modules/webdriver.js');
        const cdp = require('./modules/cdp.js');
        const userAgent = require('./modules/userAgent.js');
        const webgl = require('./modules/webgl.js');
        const automation = require('./modules/automation.js');
        const media = require('./modules/media.js');
        const fingerprint = require('./modules/fingerprint.js');
        const worker = require('./modules/worker.js');
        const explanations = require('./modules/explanations.js');

        _modules = {
            detectWebdriver: webdriver.detectWebdriver,
            detectCDP: cdp.detectCDP,
            detectCDPStackTrace: cdp.detectCDPStackTrace,
            detectConsoleDebugLeak: cdp.detectConsoleDebugLeak,
            checkUserAgent: userAgent.checkUserAgent,
            checkWebGL: webgl.checkWebGL,
            getAutomationFlags: automation.getAutomationFlags,
            getHeadlessIndicators: automation.getHeadlessIndicators,
            checkChromeRuntime: automation.checkChromeRuntime,
            checkPermissions: automation.checkPermissions,
            getMediaChecks: media.getMediaChecks,
            getFingerprintChecks: fingerprint.getFingerprintChecks,
            getWorkerChecks: worker.getWorkerChecks,
            getCheckItemExplanations: explanations.getCheckItemExplanations
        };
    } catch (e) {
        // Fallback to inline functions (for backward compatibility)
        _modules = null;
    }
}

/**
 * Detects headless browsers and automation frameworks by aggregating
 * multiple signals from the current browser session.
 * 
 * @param {boolean} attachToWindow - If true, attaches results to window object for easy access
 * @returns {Promise<Object>} Comprehensive headless detection results with explanations
 */
async function detectHeadless(attachToWindow = false) {
    // Use modular functions if available, otherwise use inline functions
    const detectWebdriver = _modules?.detectWebdriver || _detectWebdriver;
    const detectCDP = _modules?.detectCDP || _detectCDP;
    const checkUserAgent = _modules?.checkUserAgent || _checkUserAgent;
    const checkWebGL = _modules?.checkWebGL || _checkWebGL;
    const getAutomationFlags = _modules?.getAutomationFlags || _getAutomationFlags;
    const getHeadlessIndicators = _modules?.getHeadlessIndicators || _getHeadlessIndicators;
    const getMediaChecks = _modules?.getMediaChecks || _getMediaChecks;
    const getFingerprintChecks = _modules?.getFingerprintChecks || _getFingerprintChecks;
    const getWorkerChecks = _modules?.getWorkerChecks || _getWorkerChecks;
    const getCheckItemExplanations = _modules?.getCheckItemExplanations || _getCheckItemExplanations;

    // Await worker checks first
    const workerChecks = await getWorkerChecks();

    const results = {
        // Core detection results
        isHeadless: await _calculateHeadlessScore(workerChecks),

        // Individual signal groups
        webdriver: detectWebdriver(),
        automationFlags: getAutomationFlags(),
        cdpArtifacts: detectCDP(),
        headlessIndicators: getHeadlessIndicators(),
        userAgentFlags: checkUserAgent(),
        webglFlags: checkWebGL(),
        advancedChecks: _getAdvancedChecks(),
        mediaChecks: getMediaChecks(),
        fingerprintChecks: getFingerprintChecks(),
        workerChecks: workerChecks,

        // Check item explanations (NEW 2026)
        checkItemExplanations: getCheckItemExplanations(),

        // Summary of what was detected
        summary: null, // Will be set after

        // Metadata
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        detectionVersion: '1.0.0'
    };

    // Generate summary with results to avoid re-running all checks
    results.summary = _generateDetectionSummary(results);

    // Attach to window for easy automation access
    if (attachToWindow && typeof window !== 'undefined') {
        window.__headlessDetection = results;
        window.__headlessDetectionScore = results.isHeadless;

        // Add to document for attribute-based access
        if (document.documentElement) {
            document.documentElement.setAttribute('data-headless-score', results.isHeadless.toFixed(3));
            document.documentElement.setAttribute('data-headless-detected', results.isHeadless > 0.5 ? 'true' : 'false');
            document.documentElement.setAttribute('data-detection-version', results.detectionVersion);
        }
    }

    return results;
}

/**
 * Calculate overall headless score (0-1, higher = more likely headless)
 */
async function _calculateHeadlessScore(workerChecks = null) {
    let score = 0;

    // WebDriver is a strong signal (2025: still primary detection)
    if (_detectWebdriver()) score += 0.20;

    // CDP artifacts are strong indicators (2025: most reliable)
    const cdp = _detectCDP();
    if (cdp.detected) {
        score += 0.25; // Increased weight for CDP detection
        // High-confidence signals get extra weight
        if (cdp.signals.includes('chromedriver_cdc')) score += 0.10;
        if (cdp.signals.includes('puppeteer_eval')) score += 0.10;
    }

    // Check automation flags
    const automation = _getAutomationFlags();
    if (automation.plugins === 0) score += 0.07;
    if (!automation.languages) score += 0.07;
    // 2026: Playwright-specific detection (Castle.io)
    if (automation.__playwright__binding__ || automation.__pwInitScripts) score += 0.30;
    if (automation.playwrightExposedFunctions && automation.playwrightExposedFunctions.detected) score += 0.25;

    // Headless indicators
    const headless = _getHeadlessIndicators();
    if (!headless.hasOuterDimensions) score += 0.10;
    if (headless.innerEqualsOuter) score += 0.03;

    // Chrome Headless mode headers (2025: still effective)
    if (_checkUserAgent().suspicious) score += 0.12;

    // WebGL software renderer (2025: common in headless)
    const webgl = _checkWebGL();
    if (webgl.isSoftwareRenderer) score += 0.10;
    // 2026: WebGL rendering test - check if rendering matches claimed GPU
    if (webgl.renderingTest && webgl.renderingTest.suspicious) score += 0.12;

    // Advanced checks (2025)
    const advanced = _getAdvancedChecks();
    if (advanced.permissions && advanced.permissions.deniedByDefault) score += 0.06;
    if (advanced.chromeRuntime && advanced.chromeRuntime.missing) score += 0.05;
    if (advanced.stackTrace && advanced.stackTrace.cdpDetected) score += 0.12;

    // Media checks (2026: NEW)
    const media = _getMediaChecks();
    if (media.webrtc && media.webrtc.suspicious) score += 0.08;
    if (media.mediaDevices && media.mediaDevices.suspicious) score += 0.06;

    // Fingerprint checks (2026: NEW)
    const fingerprint = _getFingerprintChecks();
    if (fingerprint.canvas && fingerprint.canvas.suspicious) score += 0.07;
    if (fingerprint.audioContext && fingerprint.audioContext.suspicious) score += 0.05;
    if (fingerprint.fonts && fingerprint.fonts.suspicious) score += 0.08;

    // Worker checks (2026: NEW - Chrome bug detection)
    // Use provided worker checks or fetch them
    const worker = workerChecks || await _getWorkerChecks();
    if (worker.userAgentMismatch) score += 0.15;

    return Math.min(1, score);
}

/**
 * Detect WebDriver flag and related properties
 */
function _detectWebdriver() {
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

/**
 * Detect Playwright exposed functions (2026: Castle.io method)
 * Playwright exposes functions with __installed property and specific toString() output
 * NOTE: We exclude our own HeadlessDetector functions
 */
function _detectPlaywrightExposedFunctions() {
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
 */
function _getAutomationFlags() {
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
            playwrightExposedFunctions: _detectPlaywrightExposedFunctions(),

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
 * Detect Chrome DevTools Protocol (CDP) artifacts
 * These appear when automation tools inject scripts via CDP
 */
function _detectCDP() {
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
 * Get headless browser indicators
 */
function _getHeadlessIndicators() {
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
 * Check User-Agent for automation patterns (2025 updated)
 */
function _checkUserAgent() {
    try {
        const ua = navigator.userAgent;
        const patterns = [
            /headless/i,
            /HeadlessChrome/i,
            /selenium/i,
            /webdriver/i,
            /puppeteer/i,
            /playwright/i,
            /cypress/i,
            /nodriver/i,  // 2025: new anti-detect framework
            /undetected/i, // 2025: undetected-chromedriver
            /bot/i,
            /crawl/i,
            /spider/i
        ];

        const matches = [];
        for (const pattern of patterns) {
            if (pattern.test(ua)) {
                matches.push(pattern.toString());
            }
        }

        // Check for Client Hints (2025: Sec-CH-UA headers)
        const clientHints = _checkClientHints();

        return {
            suspicious: matches.length > 0 || clientHints.suspicious,
            matches: matches,
            userAgent: ua,
            clientHints: clientHints
        };
    } catch (e) {
        return { suspicious: false, matches: [], error: true };
    }
}

/**
 * Check Client Hints for headless indicators (2025 new method)
 */
function _checkClientHints() {
    try {
        const hints = {
            platform: navigator.userAgentData?.platform || navigator.platform,
            mobile: navigator.userAgentData?.mobile,
            brands: navigator.userAgentData?.brands || []
        };

        // Check for "HeadlessChrome" in brands
        const hasHeadlessBrand = hints.brands.some(b =>
            b.brand && b.brand.toLowerCase().includes('headless')
        );

        return {
            suspicious: hasHeadlessBrand,
            platform: hints.platform,
            mobile: hints.mobile,
            brands: hints.brands.map(b => b.brand)
        };
    } catch (e) {
        return { suspicious: false, error: true };
    }
}

/**
 * Check WebGL renderer for software rendering (common in headless/VMs)
 * 2026 Update: Added complex rendering test to verify claimed GPU capabilities
 */
function _checkWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            return { supported: false };
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';

        const rendererLower = renderer.toLowerCase();
        const isSoftwareRenderer =
            rendererLower.includes('swiftshader') ||
            rendererLower.includes('llvmpipe') ||
            rendererLower.includes('softpipe') ||
            rendererLower.includes('virtualbox') ||
            rendererLower.includes('vmware') ||
            rendererLower.includes('mesa');

        // 2026: Perform complex rendering test to validate GPU consistency
        const renderingTest = _performWebGLRenderingTest(gl, vendor, renderer);

        return {
            supported: true,
            vendor,
            renderer,
            version: gl.getParameter(gl.VERSION),
            shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            isSoftwareRenderer,
            renderingTest: renderingTest,
            suspicious: isSoftwareRenderer || Boolean(renderingTest?.suspicious)
        };
    } catch (e) {
        return { supported: false, error: true };
    }
}

/**
 * Advanced detection checks (2025 new methods)
 * Based on latest research from Castle.io, DataDome, and Browserless
 */
function _getAdvancedChecks() {
    return {
        // CDP/DevTools stack trace detection
        stackTrace: _detectCDPStackTrace(),

        // Chrome Runtime checks
        chromeRuntime: _checkChromeRuntime(),

        // Permissions API checks
        permissions: _checkPermissions(),

        // Console.debug CDP leak detection
        consoleDebug: _detectConsoleDebugLeak()
    };
}

/**
 * Detect CDP usage via Error stack trace (2025 method)
 * When Runtime.enable is used, Error.stack getter is accessed
 */
function _detectCDPStackTrace() {
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
 * Check Chrome Runtime availability (2025 method)
 * Headless Chrome often lacks chrome.runtime
 */
function _checkChromeRuntime() {
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
 */
function _checkPermissions() {
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

/**
 * Detect console.debug CDP leak (2025 method)
 * Alternative CDP detection via console.debug
 */
function _detectConsoleDebugLeak() {
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

/**
 * Media Devices and WebRTC checks (2026 new methods)
 * Headless browsers often lack media devices or have suspicious patterns
 */
function _getMediaChecks() {
    return {
        mediaDevices: _checkMediaDevices(),
        webrtc: _checkWebRTC(),
        battery: _checkBattery()
    };
}

/**
 * Check MediaDevices API (2026 method)
 * Headless browsers often have 0 media devices
 */
function _checkMediaDevices() {
    try {
        if (!navigator.mediaDevices) {
            return { available: false, suspicious: true };
        }

        return {
            available: true,
            // Can't enumerate devices synchronously, but presence is a good sign
            enumerateDevices: typeof navigator.mediaDevices.enumerateDevices === 'function',
            getUserMedia: typeof navigator.mediaDevices.getUserMedia === 'function',
            suspicious: false
        };
    } catch (e) {
        return { available: false, error: true, suspicious: true };
    }
}

/**
 * Check WebRTC capabilities (2026 method)
 * Headless browsers often have RTCPeerConnection disabled or modified
 */
function _checkWebRTC() {
    try {
        const hasRTC = !!window.RTCPeerConnection;
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

        // Check if WebRTC is artificially disabled (common in headless)
        let rtcDisabled = false;
        try {
            new RTCPeerConnection();
        } catch (e) {
            rtcDisabled = true;
        }

        return {
            available: hasRTC,
            getUserMedia: hasGetUserMedia,
            disabled: rtcDisabled,
            suspicious: rtcDisabled || !hasGetUserMedia
        };
    } catch (e) {
        return { available: false, error: true, suspicious: true };
    }
}

/**
 * Check Battery API (2026 method)
 * Headless browsers often lack battery information
 */
function _checkBattery() {
    try {
        const hasBattery = 'getBattery' in navigator;

        return {
            available: hasBattery,
            suspicious: false // Battery API presence doesn't indicate headless
        };
    } catch (e) {
        return { available: false, error: true };
    }
}

/**
 * Advanced Fingerprinting Checks (2026 methods)
 * Canvas, Audio Context, and other fingerprinting techniques
 */
function _getFingerprintChecks() {
    return {
        canvas: _checkCanvas(),
        audioContext: _checkAudioContext(),
        fonts: _checkFonts()
    };
}

/**
 * Canvas fingerprinting check (2026 method)
 * Headless browsers may produce different canvas outputs
 * 2026 Update: Added emoji rendering OS consistency check
 */
function _checkCanvas() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return { available: false, suspicious: true };
        }

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('HeadlessTest 😀🎨', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('HeadlessTest', 4, 17);

        const dataUrl = canvas.toDataURL();

        // Generate simple hash
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
            hash = ((hash << 5) - hash) + dataUrl.charCodeAt(i);
            hash = hash & hash;
        }

        // Check for canvas noise/blocking extensions
        let hasNoise = false;
        try {
            ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            hasNoise = e.stack && e.stack.indexOf('chrome-extension') > -1;
        }

        // 2026: Emoji OS consistency check
        const emojiResult = _checkEmojiRendering();

        return {
            available: true,
            hash: hash.toString(16),
            dataLength: dataUrl.length,
            hasNoise,
            emojiCheck: emojiResult,
            // Very short data might indicate blocking, or emoji check suspicious
            suspicious: dataUrl.length < 100 || hasNoise || emojiResult.suspicious
        };
    } catch (e) {
        return { available: false, error: true, suspicious: true };
    }
}

/**
 * Audio Context fingerprinting (2026 method)
 * Headless browsers may have different audio processing
 */
function _checkAudioContext() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            return { available: false, suspicious: true };
        }

        const audioCtx = new AudioContext();
        const info = {
            available: true,
            sampleRate: audioCtx.sampleRate,
            state: audioCtx.state,
            baseLatency: audioCtx.baseLatency,
            // Standard sample rates are 44100 or 48000
            suspicious: audioCtx.sampleRate !== 44100 && audioCtx.sampleRate !== 48000
        };

        audioCtx.close();
        return info;
    } catch (e) {
        return { available: false, error: true, suspicious: true };
    }
}

/**
 * Font detection (2026 method)
 * Headless browsers often have very few fonts
 */
function _checkFonts() {
    try {
        // Detect fonts using size difference technique
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const testFonts = [
            'Arial', 'Verdana', 'Times New Roman', 'Courier New',
            'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Impact'
        ];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const baseFontSizes = {};
        baseFonts.forEach(font => {
            context.font = `${testSize} ${font}`;
            baseFontSizes[font] = context.measureText(testString).width;
        });

        let detectedFonts = 0;
        testFonts.forEach(font => {
            const detected = baseFonts.some(baseFont => {
                context.font = `${testSize} '${font}', ${baseFont}`;
                return context.measureText(testString).width !== baseFontSizes[baseFont];
            });
            if (detected) detectedFonts++;
        });

        return {
            available: true,
            detectedCount: detectedFonts,
            totalTested: testFonts.length,
            // Headless browsers typically have very few fonts
            suspicious: detectedFonts < 3
        };
    } catch (e) {
        return { available: false, error: true, suspicious: false };
    }
}

/**
 * Simple hash function for fingerprinting
 */
function _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

/**
 * Check emoji rendering consistency with claimed OS (2026: NEW)
 * Different OS render emoji differently - this should match User-Agent
 */
function _checkEmojiRendering() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const emojiCtx = canvas.getContext('2d');

        if (!emojiCtx) {
            return { suspicious: false, reason: "Cannot test emoji" };
        }

        // Draw OS-specific emoji
        emojiCtx.font = '48px Arial';
        emojiCtx.fillText('😀🎨🌍', 10, 50);

        const imageData = emojiCtx.getImageData(0, 0, 100, 100);
        const hash = _simpleHash(Array.from(imageData.data).join(','));

        // Detect OS from User-Agent
        const ua = navigator.userAgent.toLowerCase();
        const isWindows = ua.includes('windows');
        const isMac = ua.includes('mac os');
        const isLinux = ua.includes('linux') && !ua.includes('android');
        const isAndroid = ua.includes('android');
        const isIOS = /iphone|ipad|ipod/.test(ua);

        // Check if emoji rendered at all (all pixels are same = not rendered)
        const pixels = imageData.data;
        const allSame = pixels.every((val, i, arr) => val === arr[0]);

        if (allSame) {
            return {
                suspicious: true,
                reason: "Emoji not rendered - possible headless",
                hash: hash,
                detectedOS: 'none'
            };
        }

        // Known emoji rendering patterns could be added here
        // This is a simplified check - full implementation would need OS-specific hashes
        return {
            suspicious: false,
            hash: hash,
            detectedOS: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : isAndroid ? 'Android' : isIOS ? 'iOS' : 'Unknown',
            rendered: true
        };
    } catch (e) {
        return { suspicious: false, error: e.message };
    }
}

/**
 * Perform complex WebGL rendering test (2026: NEW)
 * Renders a complex 3D scene and hashes the output
 * Bots using software renderers will produce different/noisy output
 */
function _performWebGLRenderingTest(gl, claimedVendor, claimedRenderer) {
    try {
        // Create a simple rotating cube with lighting
        const vertices = new Float32Array([
            -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,  // front
            -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,  // back
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Simple shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec3 position;
            void main() {
                gl_Position = vec4(position * 0.5, 1.0);
            }
        `);
        gl.compileShader(vertexShader);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(0.2, 0.5, 0.8, 1.0);
            }
        `);
        gl.compileShader(fragmentShader);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);

        // Clear and draw
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Read pixels and hash
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const hash = _simpleHash(Array.from(pixels.slice(0, 1000)).join(','));

        // Check for noise (software renderer often produces noisy output)
        let noiseLevel = 0;
        for (let i = 0; i < pixels.length - 4; i += 4) {
            const diff = Math.abs(pixels[i] - pixels[i + 4]);
            if (diff > 5) noiseLevel++;
        }
        const noiseRatio = noiseLevel / (pixels.length / 4);

        // Check consistency with claimed GPU
        const isHighEndGPU = /nvidia|geforce|rtx|gtx|radeon|rx /i.test(claimedRenderer);
        const hasHighNoise = noiseRatio > 0.1;

        return {
            hash: hash,
            noiseRatio: noiseRatio.toFixed(4),
            suspicious: isHighEndGPU && hasHighNoise,
            reason: (isHighEndGPU && hasHighNoise) ?
                `High noise (${(noiseRatio * 100).toFixed(2)}%) inconsistent with claimed GPU: ${claimedRenderer}` :
                "Rendering appears consistent"
        };
    } catch (e) {
        return { suspicious: false, error: e.message };
    }
}

/**
 * Worker-based User-Agent check (2026: NEW)
 * Chrome bug fix allows catching automation that doesn't patch Worker UA
 * Reference: https://chromiumdash.appspot.com/commit/4e9b82be3e9feed8952c81eedde553dfeb746ff3
 */
function _getWorkerChecks() {
    return new Promise((resolve) => {
        try {
            // Create a blob worker to check UA
            const workerCode = `
                self.onmessage = function() {
                    self.postMessage({
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    });
                };
            `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            const worker = new Worker(blobUrl);

            const timeout = setTimeout(() => {
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
                resolve({
                    available: false,
                    userAgentMismatch: false,
                    platformMismatch: false,
                    suspicious: false,
                    reason: "Worker timeout"
                });
            }, 1000);

            worker.onmessage = function (e) {
                clearTimeout(timeout);
                worker.terminate();
                URL.revokeObjectURL(blobUrl);

                const workerUA = e.data.userAgent;
                const mainUA = navigator.userAgent;
                const workerPlatform = e.data.platform;
                const mainPlatform = navigator.platform;

                const uaMismatch = workerUA !== mainUA;
                const platformMismatch = workerPlatform !== mainPlatform;

                resolve({
                    available: true,
                    mainUserAgent: mainUA,
                    workerUserAgent: workerUA,
                    mainPlatform: mainPlatform,
                    workerPlatform: workerPlatform,
                    userAgentMismatch: uaMismatch,
                    platformMismatch: platformMismatch,
                    suspicious: uaMismatch || platformMismatch,
                    reason: uaMismatch ? "User-Agent differs in Worker - automation detected" :
                        platformMismatch ? "Platform differs in Worker" :
                            "Consistent"
                });
            };

            worker.onerror = function (error) {
                clearTimeout(timeout);
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
                resolve({
                    available: false,
                    userAgentMismatch: false,
                    platformMismatch: false,
                    suspicious: false,
                    error: error.message,
                    reason: "Worker error"
                });
            };

            worker.postMessage({});
        } catch (e) {
            resolve({
                available: false,
                userAgentMismatch: false,
                platformMismatch: false,
                suspicious: false,
                error: e.message,
                reason: "Worker creation failed"
            });
        }
    });
}



/**
 * Get detailed explanations for individual check items (2026)
 * Provides human-readable descriptions for each specific check within cards
 */
function _getCheckItemExplanations() {
    return {
        // WebDriver Detection
        'webdriver-status': {
            label: "WebDriver Present",
            description: "Indicates if navigator.webdriver flag is set to true",
            good: "Browser is running normally without automation framework",
            bad: "Automation tool (Selenium, Puppeteer) is controlling this browser"
        },

        // CDP Artifacts
        'cdp-detected': {
            label: "CDP Detected",
            description: "Chrome DevTools Protocol connection or ChromeDriver presence",
            good: "No CDP artifacts found - normal browser operation",
            bad: "CDP-based automation detected (Puppeteer, Playwright, Selenium 4+)"
        },
        'cdp-keys': {
            label: "CDC Keys Found",
            description: "Number of ChromeDriver-specific CDC keys in window/document",
            good: "0 keys - no ChromeDriver injection",
            bad: ">0 keys - ChromeDriver has injected tracking properties"
        },

        // User Agent
        'ua-suspicious': {
            label: "Suspicious Patterns",
            description: "User-Agent contains automation/headless keywords",
            good: "Clean User-Agent string without automation indicators",
            bad: "Contains 'headless', 'HeadlessChrome', 'selenium', 'puppeteer'"
        },

        // WebGL
        'webgl-supported': {
            label: "WebGL Supported",
            description: "Browser supports WebGL rendering API",
            good: "WebGL available - normal browser capability",
            bad: "WebGL missing - very unusual for modern browsers"
        },
        'webgl-software': {
            label: "Software Renderer",
            description: "Using CPU-based software rendering instead of GPU",
            good: "Hardware GPU rendering - normal desktop/laptop",
            bad: "Software renderer (SwiftShader, llvmpipe) - VM or headless"
        },
        'webgl-renderer': {
            label: "Renderer",
            description: "GPU vendor and model reported by WebGL",
            info: "Shows claimed GPU hardware. Can be spoofed but rendering test verifies it"
        },
        'webgl-rendering-test': {
            label: "Rendering Test",
            description: "Complex 3D scene rendering matches claimed GPU capabilities",
            good: "Rendering output consistent with reported GPU",
            bad: "Output doesn't match GPU specs - spoofing detected"
        },
        'webgl-noise': {
            label: "Noise Ratio",
            description: "Pixel variation in rendered output (hardware-specific)",
            good: "<1% noise - normal hardware rendering",
            bad: ">2% noise - suspicious uniform output, possible emulation"
        },

        // Worker UA Check
        'worker-available': {
            label: "Worker Available",
            description: "Web Workers API is supported and functional",
            good: "Workers available - normal browser",
            bad: "Workers unavailable - very unusual"
        },
        'worker-mismatch': {
            label: "UA Mismatch",
            description: "User-Agent differs between main thread and Worker",
            good: "Consistent UA - properly patched automation or real browser",
            bad: "UA mismatch - automation failed to patch Worker context"
        },
        'worker-status': {
            label: "Status",
            description: "Current state of Worker UA validation",
            info: "Shows if check is pending, completed, or any mismatch details"
        },

        // Emoji OS Check
        'emoji-rendered': {
            label: "Emoji Rendered",
            description: "Canvas successfully rendered emoji character",
            good: "Emoji rendering works - normal browser",
            bad: "Failed to render - missing fonts or headless"
        },
        'emoji-os': {
            label: "Detected OS",
            description: "Operating system detected from emoji rendering style",
            info: "Different OS render emoji differently. Should match User-Agent OS"
        },
        'emoji-suspicious': {
            label: "Suspicious",
            description: "Emoji rendering doesn't match claimed OS from User-Agent",
            good: "Emoji style matches reported OS",
            bad: "Mismatch detected - User-Agent spoofing or VM"
        },

        // Window Dimensions
        'outer-dims': {
            label: "Has Outer Dimensions",
            description: "window.outerWidth/outerHeight are available",
            good: "Outer dimensions present - normal windowed browser",
            bad: "Missing outer dimensions - common in headless mode"
        },
        'inner-outer': {
            label: "Inner = Outer",
            description: "Inner and outer window dimensions are identical",
            good: "Different dimensions - normal browser with chrome/toolbar",
            bad: "Identical - suspicious, may indicate headless or fullscreen automation"
        },
        'dimensions': {
            label: "Dimensions",
            description: "Inner dimensions / Outer dimensions (width x height)",
            info: "Inner is viewport, outer includes browser chrome. Difference indicates normal browser"
        },

        // Browser APIs
        'plugins-count': {
            label: "Plugins",
            description: "Number of browser plugins available",
            info: "Normal browsers have 3-5 plugins. Headless often has 0"
        },
        'languages-check': {
            label: "Languages",
            description: "navigator.languages array is populated",
            good: "Languages array present - normal browser",
            bad: "Empty or missing - common headless indicator"
        },
        'media-devices': {
            label: "Media Devices",
            description: "navigator.mediaDevices API is available",
            good: "MediaDevices API present - normal browser",
            bad: "Missing API - common in headless browsers"
        },
        'notifications': {
            label: "Notifications",
            description: "Notification permission state (granted/denied/default)",
            info: "Headless often defaults to 'denied', normal browsers to 'default'"
        },

        // Automation Flags
        'flag-domautomation': {
            label: "domAutomation",
            description: "Global domAutomation property - Chrome automation indicator",
            good: "Not present - normal browser",
            bad: "Present - automation framework detected"
        },
        'flag-selenium': {
            label: "_selenium",
            description: "Selenium-specific global variable",
            good: "Not present - normal browser",
            bad: "Present - Selenium WebDriver detected"
        },
        'flag-webdriver-evaluate': {
            label: "__webdriver_evaluate",
            description: "WebDriver evaluate function injection",
            good: "Not present - normal browser",
            bad: "Present - WebDriver automation detected"
        },
        'flag-phantom': {
            label: "_phantom",
            description: "PhantomJS-specific global variable",
            good: "Not present - normal browser",
            bad: "Present - PhantomJS headless browser detected"
        },
        'flag-nightmare': {
            label: "__nightmare",
            description: "Nightmare.js automation framework indicator",
            good: "Not present - normal browser",
            bad: "Present - Nightmare.js automation detected"
        },
        'flag-callphantom': {
            label: "callPhantom",
            description: "PhantomJS function for communication",
            good: "Not present - normal browser",
            bad: "Present - PhantomJS detected"
        },

        // Playwright Detection (2026: Castle.io)
        'playwright-binding': {
            label: "__playwright__binding__",
            description: "Playwright's internal binding mechanism exposed in window",
            good: "Not present - normal browser",
            bad: "Present - Playwright automation framework detected"
        },
        'playwright-initscripts': {
            label: "__pwInitScripts",
            description: "Playwright initialization scripts registry",
            good: "Not present - normal browser",
            bad: "Present - Playwright detected with init scripts"
        },
        'playwright-exposed': {
            label: "Exposed Functions",
            description: "Functions injected via page.exposeFunction() with __installed property",
            good: "None detected - normal browser",
            bad: "Detected - Playwright is using exposed bindings for automation"
        },

        // Advanced Checks
        'adv-stacktrace': {
            label: "CDP Stack Trace",
            description: "Error.stack accessed by CDP Runtime.enable",
            good: "No CDP stack trace leak detected",
            bad: "CDP detected via Error stack - automation using CDP protocol"
        },
        'adv-runtime': {
            label: "Chrome Runtime",
            description: "chrome.runtime extension API availability",
            good: "chrome.runtime present - normal Chrome browser",
            bad: "Missing chrome.runtime - unusual for Chrome, may be headless"
        },
        'adv-permissions': {
            label: "Permissions API",
            description: "navigator.permissions API behavior",
            good: "Permissions API works normally",
            bad: "Permissions denied by default - headless indicator"
        },
        'adv-console': {
            label: "Console Debug",
            description: "console.debug CDP artifact detection",
            good: "No console.debug leaks detected",
            bad: "CDP detected via console.debug modification"
        },

        // Media & WebRTC
        'media-webrtc': {
            label: "WebRTC Available",
            description: "RTCPeerConnection API for real-time communication",
            good: "WebRTC available - normal browser",
            bad: "WebRTC disabled/missing - privacy mode or headless"
        },
        'media-devices-count': {
            label: "Media Devices Count",
            description: "Number of cameras, microphones available",
            info: "Real devices usually have 1-3. Headless typically has 0"
        },
        'media-battery': {
            label: "Battery API",
            description: "navigator.getBattery() API availability",
            good: "Battery API available",
            bad: "Missing - common in VMs or headless browsers"
        },

        // Fingerprinting
        'fp-canvas': {
            label: "Canvas Available",
            description: "HTML5 Canvas API for 2D/3D graphics",
            good: "Canvas works normally",
            bad: "Canvas missing or behaving abnormally"
        },
        'fp-audio': {
            label: "Audio Context",
            description: "Web Audio API for sound processing",
            good: "Audio Context available",
            bad: "Missing - unusual for modern browsers"
        },
        'fp-fonts': {
            label: "Fonts Detected",
            description: "Number of system fonts detected via canvas measurement",
            info: "Normal systems have 8+ fonts. Headless typically <3 fonts"
        },

        // System Info
        'platform': {
            label: "Platform",
            description: "navigator.platform - operating system identifier",
            info: "Shows OS platform. Should match User-Agent OS claim"
        },
        'cpu-cores': {
            label: "CPU Cores",
            description: "navigator.hardwareConcurrency - logical CPU cores",
            info: "Real machines: 2-32 cores. VMs often have fewer"
        },
        'device-memory': {
            label: "Device Memory",
            description: "navigator.deviceMemory - RAM in GB (approximate)",
            info: "Real devices: 4-64 GB. Headless/VMs may report different values"
        },
        'touch-points': {
            label: "Touch Points",
            description: "navigator.maxTouchPoints - max simultaneous touches",
            info: "Desktop: 0, Mobile: 5-10, Tablets: 10+"
        }
    };
}

/**
 * Generate a human-readable summary of what was detected
 * @param {Object} results - Already computed detection results
 */
function _generateDetectionSummary(results) {
    const detections = [];
    const warnings = [];
    // Use the explanations already attached to results to ensure consistency
    const checkExplanations = results.checkItemExplanations || _getCheckItemExplanations();

    // Helper function to check if value indicates a problem
    function isProblematic(key, value, explanation) {
        if (value === null || value === undefined || value === 'N/A') return null;

        // Boolean checks - true is bad unless it's a "good" check
        if (typeof value === 'boolean') {
            const goodChecks = ['webgl-supported', 'worker-available', 'emoji-rendered',
                'outer-dims', 'languages-check', 'media-devices', 'adv-permissions',
                'media-webrtc', 'fp-canvas', 'fp-audio'];
            const isGoodCheck = goodChecks.includes(key);

            if (isGoodCheck && !value) return 'bad'; // Should be true but isn't
            if (!isGoodCheck && value) return 'bad'; // Should be false but is true
            return 'good';
        }

        // String "YES"/"NO" checks
        if (value === 'YES' || value === 'NO') {
            const goodChecks = ['webgl-supported', 'worker-available', 'emoji-rendered',
                'outer-dims', 'languages-check', 'media-devices', 'adv-permissions',
                'media-webrtc', 'fp-canvas', 'fp-audio'];
            const isGoodCheck = goodChecks.includes(key);

            if (isGoodCheck && value === 'NO') return 'bad';
            if (!isGoodCheck && value === 'YES') return 'bad';
            return 'good';
        }

        // Number checks
        if (typeof value === 'number') {
            if (key === 'cdp-keys' && value > 0) return 'bad';
            if (key === 'plugins-count' && value === 0) return 'warning';
        }

        return null;
    }

    // Aggregate all check items
    const checkItems = {
        'webdriver-status': results.webdriver,
        'cdp-detected': results.cdpArtifacts?.detected,
        'cdp-keys': results.cdpArtifacts?.cdcKeysFound,
        'ua-suspicious': results.userAgentFlags?.suspicious,
        'webgl-supported': results.webglFlags?.supported,
        'webgl-software': results.webglFlags?.isSoftwareRenderer,
        'webgl-rendering-test': results.webglFlags?.renderingTest?.suspicious,
        'worker-available': results.workerChecks?.available,
        'worker-mismatch': results.workerChecks?.userAgentMismatch,
        'emoji-rendered': results.fingerprintChecks?.canvas?.emojiCheck?.rendered,
        'emoji-suspicious': results.fingerprintChecks?.canvas?.emojiCheck?.suspicious,
        'outer-dims': results.headlessIndicators?.hasOuterDimensions,
        'inner-outer': results.headlessIndicators?.innerEqualsOuter,
        'languages-check': results.automationFlags?.languages,
        'media-devices': results.headlessIndicators?.hasMediaDevices,
        'adv-stacktrace': results.advancedChecks?.stackTrace?.cdpDetected,
        'adv-runtime': results.advancedChecks?.chromeRuntime?.missing,
        'adv-permissions': results.advancedChecks?.permissions?.deniedByDefault,
        'adv-console': results.advancedChecks?.consoleDebug?.detected,
        'media-webrtc': results.mediaChecks?.webrtc?.suspicious,
        'media-battery': !results.mediaChecks?.battery?.available,
        'fp-canvas': results.fingerprintChecks?.canvas?.available,
        'fp-audio': results.fingerprintChecks?.audioContext?.available,
        'plugins-count': results.automationFlags?.plugins
    };

    // Process each check item
    Object.keys(checkItems).forEach(key => {
        const value = checkItems[key];
        const explanation = checkExplanations[key];
        if (!explanation) return;

        const status = isProblematic(key, value, explanation);

        if (status === 'bad') {
            const severity = ['cdp-detected', 'cdp-keys', 'webdriver-status', 'adv-stacktrace',
                'worker-mismatch', 'emoji-suspicious', 'webgl-rendering-test'].includes(key) ?
                'critical' : 'high';

            detections.push({
                category: explanation.label,
                severity: severity,
                message: explanation.bad || explanation.description,
                checkId: key,
                value: value
            });
        } else if (status === 'warning') {
            warnings.push({
                category: explanation.label,
                severity: 'medium',
                message: explanation.description,
                checkId: key,
                value: value,
                note: explanation.info || explanation.bad
            });
        }
    });

    // Add pattern/signal details
    if (results.cdpArtifacts?.signals?.length > 0) {
        const cdpDetection = detections.find(d => d.checkId === 'cdp-detected');
        if (cdpDetection) {
            cdpDetection.signals = results.cdpArtifacts.signals;
            cdpDetection.message += ` (${results.cdpArtifacts.cdcKeysFound} CDC keys)`;
        }
    }

    if (results.userAgentFlags?.matches?.length > 0) {
        const uaDetection = detections.find(d => d.checkId === 'ua-suspicious');
        if (uaDetection) {
            uaDetection.patterns = results.userAgentFlags.matches;
        }
    }

    if (results.webglFlags?.renderer && results.webglFlags?.isSoftwareRenderer) {
        const webglDetection = detections.find(d => d.checkId === 'webgl-software');
        if (webglDetection) {
            webglDetection.renderer = results.webglFlags.renderer;
        }
    }

    const score = results.isHeadless;
    const classification = score > 0.7 ? "Definitely Headless" :
        score > 0.5 ? "Likely Headless" :
            score > 0.3 ? "Suspicious" :
                score > 0.15 ? "Minor Warnings" :
                    "Normal Browser";

    return {
        score: score,
        classification: classification,
        detections: detections,
        warnings: warnings,
        totalIssues: detections.length + warnings.length,
        riskLevel: score > 0.5 ? "high" : score > 0.3 ? "medium" : "low",
        recommendation: score > 0.5 ?
            "Strong automation signals detected. High probability of bot/headless browser." :
            score > 0.3 ?
                "Some automation indicators present. Further investigation recommended." :
                "Browser appears normal with minimal or no automation signals."
    };
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectHeadless,
        // Export individual detection functions for granular testing
        getHeadlessScore: _calculateHeadlessScore,
        checkWebdriver: _detectWebdriver,
        checkCDP: _detectCDP,
        checkUserAgent: _checkUserAgent,
        checkWebGL: _checkWebGL,
        getWorkerChecks: _getWorkerChecks
    };
}

if (typeof window !== 'undefined') {
    // Main detection function
    window.detectHeadless = detectHeadless;
    window.getWorkerChecks = _getWorkerChecks;

    // Expose individual checkers for automation testing
    window.HeadlessDetector = {
        detect: detectHeadless,
        getScore: _calculateHeadlessScore,
        getWorkerChecks: _getWorkerChecks,
        checks: {
            webdriver: _detectWebdriver,
            cdp: _detectCDP,
            userAgent: _checkUserAgent,
            webgl: _checkWebGL,
            automationFlags: _getAutomationFlags,
            headlessIndicators: _getHeadlessIndicators,
            advanced: _getAdvancedChecks,
            media: _getMediaChecks,
            fingerprints: _getFingerprintChecks
        }
    };

    // Auto-detect and expose on page load for easy access
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.__headlessDetectionReady = true;
        });
    } else {
        window.__headlessDetectionReady = true;
    }
}
