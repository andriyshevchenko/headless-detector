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
 * @module HeadlessDetector
 * @version 1.0.0
 */

/**
 * Detects headless browsers and automation frameworks by aggregating
 * multiple signals from the current browser session.
 * 
 * @param {boolean} attachToWindow - If true, attaches results to window object for easy access
 * @returns {Object} Comprehensive headless detection results with explanations
 */
function detectHeadless(attachToWindow = false) {
    const results = {
        // Core detection results
        isHeadless: _calculateHeadlessScore(),

        // Individual signal groups
        webdriver: _detectWebdriver(),
        automationFlags: _getAutomationFlags(),
        cdpArtifacts: _detectCDP(),
        headlessIndicators: _getHeadlessIndicators(),
        userAgentFlags: _checkUserAgent(),
        webglFlags: _checkWebGL(),
        advancedChecks: _getAdvancedChecks(),
        mediaChecks: _getMediaChecks(),
        fingerprintChecks: _getFingerprintChecks(),

        // Detection explanations (NEW)
        explanations: _getDetectionExplanations(),

        // Summary of what was detected
        summary: _generateDetectionSummary(),

        // Metadata
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        detectionVersion: '1.0.0'
    };

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
function _calculateHeadlessScore() {
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

    // Headless indicators
    const headless = _getHeadlessIndicators();
    if (!headless.hasOuterDimensions) score += 0.10;
    if (headless.innerEqualsOuter) score += 0.03;

    // Chrome Headless mode headers (2025: still effective)
    if (_checkUserAgent().suspicious) score += 0.12;

    // WebGL software renderer (2025: common in headless)
    if (_checkWebGL().isSoftwareRenderer) score += 0.10;

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
            window._phantom
        );
    } catch (e) {
        return false;
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

        return {
            supported: true,
            vendor,
            renderer,
            version: gl.getParameter(gl.VERSION),
            shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            isSoftwareRenderer
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
        ctx.fillText('HeadlessTest', 2, 15);
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

        return {
            available: true,
            hash: hash.toString(16),
            dataLength: dataUrl.length,
            hasNoise,
            // Very short data might indicate blocking
            suspicious: dataUrl.length < 100 || hasNoise
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
 * Get explanations for all detection methods (2026)
 * Provides human-readable descriptions of what each check detects
 */
function _getDetectionExplanations() {
    return {
        webdriver: {
            name: "WebDriver Detection",
            description: "Checks for navigator.webdriver flag and related Selenium/WebDriver properties",
            purpose: "Detects if the browser is controlled by automation tools like Selenium or Puppeteer",
            suspicious_if: "navigator.webdriver is true or WebDriver properties are present",
            impact: "High - Primary automation detection signal"
        },
        automationFlags: {
            name: "Automation Flags",
            description: "Scans for automation framework-specific global variables and properties",
            purpose: "Identifies automation tools (Selenium, Playwright, Puppeteer, PhantomJS, Nightmare)",
            suspicious_if: "Framework-specific variables detected, missing plugins, or no languages",
            impact: "High - Directly indicates automation presence"
        },
        cdpArtifacts: {
            name: "Chrome DevTools Protocol (CDP) Artifacts",
            description: "Detects ChromeDriver-specific properties and CDP connection signals",
            purpose: "Identifies ChromeDriver/CDP-based automation (Puppeteer, Playwright, Selenium 4+)",
            suspicious_if: "CDC keys found in window/document or CDP connection active",
            impact: "Very High - Strong indicator of ChromeDriver-based automation"
        },
        headlessIndicators: {
            name: "Headless Mode Indicators",
            description: "Checks browser characteristics that differ in headless vs normal mode",
            purpose: "Detects headless Chrome/Chromium by analyzing window dimensions and permissions",
            suspicious_if: "Missing outer dimensions, inner=outer dimensions, denied notifications by default",
            impact: "Medium - Can indicate headless mode but may have false positives"
        },
        userAgentFlags: {
            name: "User-Agent Analysis",
            description: "Analyzes User-Agent string and Client Hints for automation patterns",
            purpose: "Identifies headless/automation keywords in browser identification",
            suspicious_if: "Contains 'headless', 'HeadlessChrome', 'selenium', 'puppeteer', etc.",
            impact: "High - Easy to detect but also easy for bots to spoof"
        },
        webglFlags: {
            name: "WebGL Renderer Detection",
            description: "Examines WebGL renderer information for software rendering",
            purpose: "Detects virtual machines, headless browsers using software rendering",
            suspicious_if: "Software renderer (SwiftShader, llvmpipe) instead of hardware GPU",
            impact: "Medium - Indicates VM or headless environment"
        },
        advancedChecks: {
            name: "Advanced CDP/Runtime Checks",
            description: "Sophisticated detection using Error stack traces and Chrome runtime",
            purpose: "Detects CDP Runtime.enable usage and missing Chrome extension runtime",
            suspicious_if: "Error.stack accessed by CDP, chrome.runtime missing in Chrome",
            impact: "Very High - Difficult for automation to evade"
        },
        mediaChecks: {
            name: "Media Devices & WebRTC",
            description: "Verifies availability of media devices and WebRTC capabilities",
            purpose: "Headless browsers often lack camera/microphone or have disabled WebRTC",
            suspicious_if: "MediaDevices unavailable, no getUserMedia, WebRTC disabled",
            impact: "Medium - Can indicate headless but also privacy-focused browsers"
        },
        fingerprintChecks: {
            name: "Browser Fingerprinting",
            description: "Canvas, Audio Context, and Font detection for unique browser signatures",
            purpose: "Creates unique fingerprints that differ between real and headless browsers",
            suspicious_if: "Abnormal canvas output, non-standard audio sample rates, very few fonts",
            impact: "Medium-High - Harder to spoof, indicates spoofing attempts if anomalous"
        }
    };
}

/**
 * Generate a human-readable summary of what was detected
 */
function _generateDetectionSummary() {
    const detections = [];
    const warnings = [];

    // Check each detection category
    if (_detectWebdriver()) {
        detections.push({
            category: "WebDriver",
            severity: "high",
            message: "WebDriver flag detected - browser is controlled by automation"
        });
    }

    const cdp = _detectCDP();
    if (cdp.detected) {
        detections.push({
            category: "CDP",
            severity: "critical",
            message: `ChromeDriver/CDP detected (${cdp.cdcKeysFound} CDC keys found)`,
            signals: cdp.signals
        });
    }

    const ua = _checkUserAgent();
    if (ua.suspicious) {
        detections.push({
            category: "User-Agent",
            severity: "high",
            message: `Suspicious User-Agent patterns detected`,
            patterns: ua.matches
        });
    }

    const webgl = _checkWebGL();
    if (webgl.isSoftwareRenderer) {
        warnings.push({
            category: "WebGL",
            severity: "medium",
            message: `Software renderer detected: ${webgl.renderer}`,
            note: "May indicate VM or headless environment"
        });
    }

    const advanced = _getAdvancedChecks();
    if (advanced.stackTrace && advanced.stackTrace.cdpDetected) {
        detections.push({
            category: "CDP Runtime",
            severity: "critical",
            message: "CDP Runtime.enable detected via Error stack trace leak"
        });
    }

    if (advanced.chromeRuntime && advanced.chromeRuntime.missing) {
        warnings.push({
            category: "Chrome Runtime",
            severity: "medium",
            message: "chrome.runtime missing - unusual for Chrome browser"
        });
    }

    const media = _getMediaChecks();
    if (media.webrtc && media.webrtc.suspicious) {
        warnings.push({
            category: "WebRTC",
            severity: "medium",
            message: "WebRTC disabled or unavailable"
        });
    }

    const fingerprint = _getFingerprintChecks();
    if (fingerprint.canvas && fingerprint.canvas.suspicious) {
        warnings.push({
            category: "Canvas",
            severity: "medium",
            message: "Suspicious canvas fingerprint detected"
        });
    }

    if (fingerprint.fonts && fingerprint.fonts.suspicious) {
        warnings.push({
            category: "Fonts",
            severity: "medium",
            message: `Very few fonts detected (${fingerprint.fonts.detectedCount}/${fingerprint.fonts.totalTested})`,
            note: "Headless browsers typically have <3 fonts"
        });
    }

    const score = _calculateHeadlessScore();
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
        checkWebGL: _checkWebGL
    };
}

if (typeof window !== 'undefined') {
    // Main detection function
    window.detectHeadless = detectHeadless;

    // Expose individual checkers for automation testing
    window.HeadlessDetector = {
        detect: detectHeadless,
        getScore: _calculateHeadlessScore,
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
