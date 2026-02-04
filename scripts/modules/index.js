/**
 * Headless Browser Detection Module - Main Entry Point
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

// Import modules for Node.js environment
let modules = {};
if (typeof require !== 'undefined') {
    try {
        const webdriver = require('./webdriver.js');
        const cdp = require('./cdp.js');
        const userAgent = require('./userAgent.js');
        const webgl = require('./webgl.js');
        const automation = require('./automation.js');
        const media = require('./media.js');
        const fingerprint = require('./fingerprint.js');
        const worker = require('./worker.js');
        const explanations = require('./explanations.js');

        modules = {
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
        // Fallback if modules not available (browser environment)
    }
}

// Browser environment - use window.HeadlessDetectorModules
if (typeof window !== 'undefined' && window.HeadlessDetectorModules) {
    modules = window.HeadlessDetectorModules;
}

/**
 * Detects headless browsers and automation frameworks by aggregating
 * multiple signals from the current browser session.
 * 
 * @param {boolean} attachToWindow - If true, attaches results to window object for easy access
 * @returns {Promise<Object>} Comprehensive headless detection results with explanations
 */
async function detectHeadless(attachToWindow = false) {
    // Validate that all required module functions are available
    const requiredFunctions = [
        'detectWebdriver', 'detectCDP', 'checkUserAgent', 'checkWebGL',
        'getAutomationFlags', 'getHeadlessIndicators', 'getMediaChecks',
        'getFingerprintChecks', 'getWorkerChecks', 'getCheckItemExplanations'
    ];
    const missingFunctions = requiredFunctions.filter(fn => !modules[fn]);
    if (missingFunctions.length > 0) {
        throw new Error(`HeadlessDetector modules not loaded. Missing: ${missingFunctions.join(', ')}. Ensure detection script is loaded or window.HeadlessDetectorModules is set.`);
    }

    // Get module functions (from imports or window)
    const {
        detectWebdriver,
        detectCDP,
        checkUserAgent,
        checkWebGL,
        getAutomationFlags,
        getHeadlessIndicators,
        getMediaChecks,
        getFingerprintChecks,
        getWorkerChecks,
        getCheckItemExplanations
    } = modules;

    // Await worker checks first
    const workerChecks = await getWorkerChecks();

    const results = {
        // Core detection results
        isHeadless: await calculateHeadlessScore(workerChecks),

        // Individual signal groups
        webdriver: detectWebdriver(),
        automationFlags: getAutomationFlags(),
        cdpArtifacts: detectCDP(),
        headlessIndicators: getHeadlessIndicators(),
        userAgentFlags: checkUserAgent(),
        webglFlags: checkWebGL(),
        advancedChecks: getAdvancedChecks(),
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
    results.summary = generateDetectionSummary(results);

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
 * Get advanced detection checks
 * @returns {Object} Advanced checks results
 */
function getAdvancedChecks() {
    const { detectCDPStackTrace, detectConsoleDebugLeak, checkChromeRuntime, checkPermissions } = modules;
    
    return {
        // CDP/DevTools stack trace detection
        stackTrace: detectCDPStackTrace(),
        // Chrome Runtime checks
        chromeRuntime: checkChromeRuntime(),
        // Permissions API checks
        permissions: checkPermissions(),
        // Console.debug CDP leak detection
        consoleDebug: detectConsoleDebugLeak()
    };
}

/**
 * Calculate overall headless score (0-1, higher = more likely headless)
 * @param {Object} workerChecks - Worker check results (optional)
 * @returns {Promise<number>} Headless score between 0 and 1
 */
async function calculateHeadlessScore(workerChecks = null) {
    const {
        detectWebdriver,
        detectCDP,
        checkUserAgent,
        checkWebGL,
        getAutomationFlags,
        getHeadlessIndicators,
        getMediaChecks,
        getFingerprintChecks,
        getWorkerChecks,
        checkChromeRuntime,
        checkPermissions,
        detectCDPStackTrace
    } = modules;

    let score = 0;

    // WebDriver is a strong signal (2025: still primary detection)
    if (detectWebdriver()) score += 0.20;

    // CDP artifacts are strong indicators (2025: most reliable)
    const cdp = detectCDP();
    if (cdp.detected) {
        score += 0.25; // Increased weight for CDP detection
        // High-confidence signals get extra weight
        if (cdp.signals.includes('chromedriver_cdc')) score += 0.10;
        if (cdp.signals.includes('puppeteer_eval')) score += 0.10;
    }

    // Check automation flags
    const automation = getAutomationFlags();
    if (automation.plugins === 0) score += 0.07;
    if (!automation.languages) score += 0.07;
    // 2026: Playwright-specific detection (Castle.io)
    if (automation.__playwright__binding__ || automation.__pwInitScripts) score += 0.30;
    if (automation.playwrightExposedFunctions && automation.playwrightExposedFunctions.detected) score += 0.25;

    // Headless indicators
    const headless = getHeadlessIndicators();
    if (!headless.hasOuterDimensions) score += 0.10;
    if (headless.innerEqualsOuter) score += 0.03;

    // Chrome Headless mode headers (2025: still effective)
    if (checkUserAgent().suspicious) score += 0.12;

    // WebGL software renderer (2025: common in headless)
    const webgl = checkWebGL();
    if (webgl.isSoftwareRenderer) score += 0.10;
    // 2026: WebGL rendering test - check if rendering matches claimed GPU
    if (webgl.renderingTest && webgl.renderingTest.suspicious) score += 0.12;

    // Advanced checks (2025)
    const stackTrace = detectCDPStackTrace();
    const chromeRuntime = checkChromeRuntime();
    const permissions = checkPermissions();
    
    if (permissions && permissions.deniedByDefault) score += 0.06;
    if (chromeRuntime && chromeRuntime.missing) score += 0.05;
    if (stackTrace && stackTrace.cdpDetected) score += 0.12;

    // Media checks (2026: NEW)
    const media = getMediaChecks();
    if (media.webrtc && media.webrtc.suspicious) score += 0.08;
    if (media.mediaDevices && media.mediaDevices.suspicious) score += 0.06;

    // Fingerprint checks (2026: NEW)
    const fingerprint = getFingerprintChecks();
    if (fingerprint.canvas && fingerprint.canvas.suspicious) score += 0.07;
    if (fingerprint.audioContext && fingerprint.audioContext.suspicious) score += 0.05;
    if (fingerprint.fonts && fingerprint.fonts.suspicious) score += 0.08;

    // Worker checks (2026: NEW - Chrome bug detection)
    // Use provided worker checks or fetch them
    const worker = workerChecks || await getWorkerChecks();
    if (worker.userAgentMismatch) score += 0.15;

    return Math.min(1, score);
}

/**
 * Generate a human-readable summary of what was detected
 * @param {Object} results - Already computed detection results
 * @returns {Object} Detection summary
 */
function generateDetectionSummary(results) {
    const detections = [];
    const warnings = [];
    // Use explanations already attached to results for consistency
    // results.checkItemExplanations is set by detectHeadless() before calling this function
    const checkExplanations = results.checkItemExplanations;

    // Helper function to check if value indicates a problem
    function isProblematic(key, value, explanation) {
        if (value === null || value === undefined || value === 'N/A') return null;

        // Boolean checks - true is bad unless it's a "good" check
        if (typeof value === 'boolean') {
            // Note: adv-permissions and media-webrtc are NOT in goodChecks because their 
            // checkItems values (deniedByDefault, suspicious) are true when problematic
            const goodChecks = ['webgl-supported', 'worker-available', 'emoji-rendered',
                'outer-dims', 'languages-check', 'media-devices', 'fp-canvas', 'fp-audio'];
            const isGoodCheck = goodChecks.includes(key);

            if (isGoodCheck && !value) return 'bad'; // Should be true but isn't
            if (!isGoodCheck && value) return 'bad'; // Should be false but is true
            return 'good';
        }

        // String "YES"/"NO" checks
        if (value === 'YES' || value === 'NO') {
            // Note: adv-permissions and media-webrtc are NOT in goodChecks because their 
            // checkItems values (deniedByDefault, suspicious) are true when problematic
            const goodChecks = ['webgl-supported', 'worker-available', 'emoji-rendered',
                'outer-dims', 'languages-check', 'media-devices', 'fp-canvas', 'fp-audio'];
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
        getHeadlessScore: calculateHeadlessScore,
        checkWebdriver: modules.detectWebdriver,
        checkCDP: modules.detectCDP,
        checkUserAgent: modules.checkUserAgent,
        checkWebGL: modules.checkWebGL,
        getWorkerChecks: modules.getWorkerChecks
    };
}

if (typeof window !== 'undefined') {
    // Main detection function
    window.detectHeadless = detectHeadless;
    window.getWorkerChecks = modules.getWorkerChecks;

    // Expose individual checkers for automation testing
    window.HeadlessDetector = {
        detect: detectHeadless,
        getScore: calculateHeadlessScore,
        getWorkerChecks: modules.getWorkerChecks,
        checks: {
            webdriver: modules.detectWebdriver,
            cdp: modules.detectCDP,
            userAgent: modules.checkUserAgent,
            webgl: modules.checkWebGL,
            automationFlags: modules.getAutomationFlags,
            headlessIndicators: modules.getHeadlessIndicators,
            advanced: getAdvancedChecks,
            media: modules.getMediaChecks,
            fingerprints: modules.getFingerprintChecks
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
