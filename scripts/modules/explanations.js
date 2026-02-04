/**
 * Check Item Explanations Module
 * Provides human-readable descriptions for each specific check
 * @module modules/explanations
 */

/**
 * Get detailed explanations for individual check items (2026)
 * Provides human-readable descriptions for each specific check within cards
 * @returns {Object} Check item explanations
 */
function getCheckItemExplanations() {
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
            description: "Operating system extracted from User-Agent string",
            info: "OS parsed from User-Agent for reference (not from emoji rendering)"
        },
        'emoji-suspicious': {
            label: "Suspicious",
            description: "Emoji failed to render on canvas",
            good: "Emoji rendered successfully",
            bad: "Emoji not rendered - possible headless browser"
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

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getCheckItemExplanations };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.getCheckItemExplanations = getCheckItemExplanations;
}
