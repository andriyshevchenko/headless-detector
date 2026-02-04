/**
 * Unit tests for Worker Detection Module
 */

// Mock browser environment
beforeEach(() => {
    global.navigator = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Win32'
    };

    global.window = global;

    // Default Worker mock
    global.Worker = class MockWorker {
        constructor() {
            this.onmessage = null;
            this.onerror = null;
        }
        postMessage() {
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage({
                        data: {
                            userAgent: global.navigator.userAgent,
                            platform: global.navigator.platform
                        }
                    });
                }
            }, 10);
        }
        terminate() {}
    };

    global.URL = {
        createObjectURL: () => 'blob:mock',
        revokeObjectURL: () => {}
    };

    global.Blob = class MockBlob {
        constructor() {}
    };
});

describe('Worker Module', () => {
    let workerModule;

    beforeEach(() => {
        jest.resetModules();
        workerModule = require('../../scripts/modules/worker.js');
    });

    describe('getWorkerChecks', () => {
        test('should return a promise', () => {
            const result = workerModule.getWorkerChecks();
            expect(result).toBeInstanceOf(Promise);
        });

        test('should resolve with worker check results', async () => {
            const result = await workerModule.getWorkerChecks();
            expect(result).toHaveProperty('available');
            expect(result.available).toBe(true);
        });

        test('should detect UA mismatch when worker UA differs', async () => {
            global.Worker = class MockMismatchWorker {
                constructor() {
                    this.onmessage = null;
                }
                postMessage() {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: {
                                    userAgent: 'Different/UserAgent',
                                    platform: 'Win32'
                                }
                            });
                        }
                    }, 10);
                }
                terminate() {}
            };

            jest.resetModules();
            const freshModule = require('../../scripts/modules/worker.js');
            const result = await freshModule.getWorkerChecks();
            expect(result.userAgentMismatch).toBe(true);
        });

        test('should detect platform mismatch', async () => {
            global.Worker = class MockPlatformMismatchWorker {
                constructor() {
                    this.onmessage = null;
                }
                postMessage() {
                    setTimeout(() => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: {
                                    userAgent: global.navigator.userAgent,
                                    platform: 'Linux'
                                }
                            });
                        }
                    }, 10);
                }
                terminate() {}
            };

            jest.resetModules();
            const freshModule = require('../../scripts/modules/worker.js');
            const result = await freshModule.getWorkerChecks();
            expect(result.platformMismatch).toBe(true);
        });

        test('should handle worker timeout gracefully', async () => {
            global.Worker = class MockTimeoutWorker {
                constructor() {
                    this.onmessage = null;
                }
                postMessage() {
                    // Never responds
                }
                terminate() {}
            };

            jest.resetModules();
            const freshModule = require('../../scripts/modules/worker.js');
            const result = await freshModule.getWorkerChecks();
            expect(result.available).toBe(false);
            expect(result.reason).toBe('Worker timeout');
        }, 2000);

        test('should handle worker error gracefully', async () => {
            global.Worker = class MockErrorWorker {
                constructor() {
                    this.onmessage = null;
                    this.onerror = null;
                }
                postMessage() {
                    setTimeout(() => {
                        if (this.onerror) {
                            this.onerror({ message: 'Worker error' });
                        }
                    }, 10);
                }
                terminate() {}
            };

            jest.resetModules();
            const freshModule = require('../../scripts/modules/worker.js');
            const result = await freshModule.getWorkerChecks();
            expect(result.available).toBe(false);
        });
    });
});
