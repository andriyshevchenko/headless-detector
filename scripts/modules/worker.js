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
 * @returns {Promise<Object>} Worker check results
 */
function getWorkerChecks() {
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
            const worker = new Worker(URL.createObjectURL(blob));

            const timeout = setTimeout(() => {
                worker.terminate();
                resolve({
                    available: false,
                    userAgentMismatch: false,
                    reason: "Worker timeout"
                });
            }, 1000);

            worker.onmessage = function (e) {
                clearTimeout(timeout);
                worker.terminate();

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
                resolve({
                    available: false,
                    userAgentMismatch: false,
                    error: error.message
                });
            };

            worker.postMessage({});
        } catch (e) {
            resolve({
                available: false,
                userAgentMismatch: false,
                error: e.message
            });
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
