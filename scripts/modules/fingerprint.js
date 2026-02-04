/**
 * Fingerprint Detection Module
 * Canvas, Audio Context, and Font detection
 * @module modules/fingerprint
 */

// Import hash utility for Node.js environment
let simpleHash;
if (typeof require !== 'undefined') {
    try {
        simpleHash = require('../utils/hash.js').simpleHash;
    } catch (e) {
        // Fallback for browser environment
    }
}

// Browser environment fallback
if (typeof window !== 'undefined' && window.HeadlessDetectorUtils) {
    simpleHash = window.HeadlessDetectorUtils.simpleHash;
}

// Inline fallback if neither is available
if (!simpleHash) {
    simpleHash = function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    };
}

/**
 * Check emoji rendering consistency with claimed OS (2026: NEW)
 * Different OS render emoji differently - this should match User-Agent
 * @returns {Object} Emoji rendering check results
 */
function checkEmojiRendering() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const emojiCtx = canvas.getContext('2d');

        if (!emojiCtx) {
            return { suspicious: false, rendered: false, reason: "Cannot test emoji" };
        }

        // Draw OS-specific emoji
        emojiCtx.font = '48px Arial';
        emojiCtx.fillText('😀🎨🌍', 10, 50);

        const imageData = emojiCtx.getImageData(0, 0, 100, 100);
        const hash = simpleHash(Array.from(imageData.data).join(','));

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
                rendered: false,
                reason: "Emoji not rendered - possible headless",
                hash: hash,
                detectedOS: 'none'
            };
        }

        // Known emoji rendering patterns could be added here
        // This is a simplified check - full implementation would need OS-specific hashes
        return {
            suspicious: false,
            rendered: true,
            hash: hash,
            detectedOS: isWindows ? 'Windows' : isMac ? 'macOS' : isLinux ? 'Linux' : isAndroid ? 'Android' : isIOS ? 'iOS' : 'Unknown'
        };
    } catch (e) {
        return { suspicious: false, rendered: false, error: e.message };
    }
}

/**
 * Canvas fingerprinting check (2026 method)
 * Headless browsers may produce different canvas outputs
 * 2026 Update: Added emoji rendering OS consistency check
 * @returns {Object} Canvas check results
 */
function checkCanvas() {
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

        // Compute hash matching legacy format (base-16 hex)
        let hashNum = 0;
        for (let i = 0; i < dataUrl.length; i++) {
            hashNum = ((hashNum << 5) - hashNum) + dataUrl.charCodeAt(i);
            hashNum = hashNum & hashNum;
        }
        const hash = hashNum.toString(16);

        // Check for canvas noise/blocking extensions
        let hasNoise = false;
        try {
            ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
            hasNoise = e.stack && e.stack.indexOf('chrome-extension') > -1;
        }

        // 2026: Emoji OS consistency check
        const emojiResult = checkEmojiRendering();

        return {
            available: true,
            hash: hash,
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
 * @returns {Object} Audio context check results
 */
function checkAudioContext() {
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
 * @returns {Object} Font check results
 */
function checkFonts() {
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
 * Get all fingerprint checks
 * @returns {Object} All fingerprint check results
 */
function getFingerprintChecks() {
    return {
        canvas: checkCanvas(),
        audioContext: checkAudioContext(),
        fonts: checkFonts()
    };
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkEmojiRendering,
        checkCanvas,
        checkAudioContext,
        checkFonts,
        getFingerprintChecks
    };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.checkEmojiRendering = checkEmojiRendering;
    window.HeadlessDetectorModules.checkCanvas = checkCanvas;
    window.HeadlessDetectorModules.checkAudioContext = checkAudioContext;
    window.HeadlessDetectorModules.checkFonts = checkFonts;
    window.HeadlessDetectorModules.getFingerprintChecks = getFingerprintChecks;
}
