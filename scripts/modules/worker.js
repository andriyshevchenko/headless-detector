/**
 * Worker Detection Module
 * Worker-based User-Agent check (2026: NEW)
 * Chrome bug fix allows catching automation that doesn't patch Worker UA
 * @module modules/worker
 */

/**
 * Worker-based User-Agent check (2026: NEW)
 * Chrome bug fix allows catching automation that doesn't patch Worker UA
 * Reference: https://chromiumdash.appspot.com/commit/4e9b82be3e9feed8952c81eedde553dfeb746ff3
 * @returns {Promise<Object>} Worker check results with consistent schema
 */
function getWorkerChecks() {
    // Consistent result schema
    const createResult = (overrides = {}) => ({
        available: false,
        userAgentMismatch: false,
        platformMismatch: false,
        suspicious: false,
        reason: '',
        mainUserAgent: null,
        workerUserAgent: null,
        mainPlatform: null,
        workerPlatform: null,
        error: null,
        ...overrides
    });

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
                resolve(createResult({
                    reason: "Worker timeout"
                }));
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

                resolve(createResult({
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
                }));
            };

            worker.onerror = function (error) {
                clearTimeout(timeout);
                worker.terminate();
                URL.revokeObjectURL(blobUrl);
                resolve(createResult({
                    error: error.message,
                    reason: "Worker error"
                }));
            };

            worker.postMessage({});
        } catch (e) {
            resolve(createResult({
                error: e.message,
                reason: "Worker creation failed"
            }));
        }
    });
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getWorkerChecks };
}

if (typeof window !== 'undefined') {
    window.HeadlessDetectorModules = window.HeadlessDetectorModules || {};
    window.HeadlessDetectorModules.getWorkerChecks = getWorkerChecks;
}
