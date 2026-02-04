/**
 * User Agent Detection Module
 * Checks User-Agent for automation patterns
 * @module modules/userAgent
 */

/**
 * Check User-Agent for automation patterns (2025 updated)
 * @returns {Object} User agent analysis results
 */
function checkUserAgent() {
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
        const clientHints = checkClientHints();

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
 * @returns {Object} Client hints analysis results
 */
function checkClientHints() {
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

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { checkUserAgent, checkClientHints };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.checkUserAgent = checkUserAgent;
    window.HeadlessDetectorModules.checkClientHints = checkClientHints;
}
