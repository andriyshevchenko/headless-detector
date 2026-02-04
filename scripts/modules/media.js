/**
 * Media Detection Module
 * Checks MediaDevices, WebRTC, and Battery APIs
 * @module modules/media
 */

/**
 * Check MediaDevices API (2026 method)
 * Headless browsers often have 0 media devices
 * @returns {Object} Media devices check results
 */
function checkMediaDevices() {
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
 * @returns {Object} WebRTC check results
 */
function checkWebRTC() {
    try {
        const hasRTC = !!window.RTCPeerConnection;
        const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

        // Check if WebRTC is artificially disabled (common in headless)
        // Only attempt instantiation if API is available
        let rtcDisabled = false;
        if (hasRTC) {
            try {
                new RTCPeerConnection();
            } catch (e) {
                rtcDisabled = true;
            }
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
 * @returns {Object} Battery check results
 */
function checkBattery() {
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
 * Get all media checks
 * @returns {Object} All media check results
 */
function getMediaChecks() {
    return {
        mediaDevices: checkMediaDevices(),
        webrtc: checkWebRTC(),
        battery: checkBattery()
    };
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        checkMediaDevices,
        checkWebRTC,
        checkBattery,
        getMediaChecks
    };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.checkMediaDevices = checkMediaDevices;
    window.HeadlessDetectorModules.checkWebRTC = checkWebRTC;
    window.HeadlessDetectorModules.checkBattery = checkBattery;
    window.HeadlessDetectorModules.getMediaChecks = getMediaChecks;
}
