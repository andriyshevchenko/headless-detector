/**
 * Utility functions for hashing
 * @module utils/hash
 */

/**
 * Simple hash function for fingerprinting
 * @param {string} str - String to hash
 * @returns {string} Hash value
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { simpleHash };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorUtils = window.HeadlessDetectorUtils || {};
    window.HeadlessDetectorUtils.simpleHash = simpleHash;
}
