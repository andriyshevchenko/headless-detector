/**
 * Unit tests for HeadlessBehaviorMonitor
 */

const HeadlessBehaviorMonitor = require('../scripts/behavior-monitor.js');

// Mock browser environment
global.window = global;
global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement: jest.fn(() => ({
        getContext: jest.fn()
    }))
};
global.performance = {
    now: jest.fn(() => Date.now())
};

describe('HeadlessBehaviorMonitor', () => {
    let monitor;

    beforeEach(() => {
        monitor = new HeadlessBehaviorMonitor();
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with default options', () => {
            expect(monitor).toBeDefined();
            expect(monitor.options.mouse).toBe(true);
            expect(monitor.options.keyboard).toBe(true);
            expect(monitor.options.scroll).toBe(true);
            expect(monitor.options.touch).toBe(true);
        });

        test('should accept custom options', () => {
            const customMonitor = new HeadlessBehaviorMonitor({
                mouse: false,
                timeout: 5000,
                minSamples: { mouse: 10 }
            });

            expect(customMonitor.options.mouse).toBe(false);
            expect(customMonitor.options.timeout).toBe(5000);
            expect(customMonitor.options.minSamples.mouse).toBe(10);
        });

        test('should initialize data storage', () => {
            expect(monitor.data.mouse).toEqual([]);
            expect(monitor.data.keyboard).toEqual([]);
            expect(monitor.data.scroll).toEqual([]);
            expect(monitor.data.touch).toEqual([]);
            expect(monitor.data.events).toEqual([]);
        });
    });

    describe('Lifecycle Methods', () => {
        test('start() should set running state', () => {
            monitor.start();

            expect(monitor.isRunning).toBe(true);
            expect(monitor.startTime).toBeDefined();
        });

        test('stop() should clear running state and return results', () => {
            monitor.start();
            const results = monitor.stop();

            expect(monitor.isRunning).toBe(false);
            expect(results).toBeDefined();
            expect(results).toHaveProperty('overallScore');
            expect(results).toHaveProperty('confidence');
        });

        test('should not start twice', () => {
            monitor.start();
            const firstStartTime = monitor.startTime;
            
            monitor.start();
            expect(monitor.startTime).toBe(firstStartTime);
        });

        test('stop() should return null if not running', () => {
            const results = monitor.stop();
            expect(results).toBeNull();
        });
    });

    describe('Status and Results', () => {
        test('getStatus() should return current monitoring state', () => {
            monitor.start();
            
            // Simulate some data
            monitor.data.mouse.push({ x: 100, y: 200, timestamp: Date.now() });
            monitor.data.keyboard.push({ key: 'a', timestamp: Date.now() });

            const status = monitor.getStatus();

            expect(status).toHaveProperty('isRunning', true);
            expect(status).toHaveProperty('elapsedTime');
            expect(status.samples.mouse).toBe(1);
            expect(status.samples.keyboard).toBe(1);
        });

        test('getResults() should return analysis of collected data', () => {
            const results = monitor.getResults();

            expect(results).toHaveProperty('mouse');
            expect(results).toHaveProperty('keyboard');
            expect(results).toHaveProperty('scroll');
            expect(results).toHaveProperty('touch');
            expect(results).toHaveProperty('events');
            expect(results).toHaveProperty('overallScore');
            expect(results).toHaveProperty('confidence');
            expect(results).toHaveProperty('metadata');
        });
    });

    describe('Event Handlers', () => {
        test('should collect mouse movement data', () => {
            monitor.start();

            const mockEvent = {
                clientX: 100,
                clientY: 200,
                isTrusted: true
            };

            monitor._handleMouseMove(mockEvent);

            expect(monitor.data.mouse.length).toBe(1);
            expect(monitor.data.mouse[0].x).toBe(100);
            expect(monitor.data.mouse[0].y).toBe(200);
            expect(monitor.data.mouse[0].isTrusted).toBe(true);
        });

        test('should collect keyboard data', () => {
            monitor.start();

            const keyDownEvent = { key: 'a' };
            const keyUpEvent = { key: 'a', isTrusted: true };

            monitor._handleKeyDown(keyDownEvent);
            monitor._handleKeyUp(keyUpEvent);

            expect(monitor.data.keyboard.length).toBe(1);
            expect(monitor.data.keyboard[0].key).toBe('a');
            expect(monitor.data.keyboard[0].isTrusted).toBe(true);
            expect(monitor.data.keyboard[0].holdTime).toBeDefined();
        });

        test('should collect scroll data', () => {
            global.window.scrollY = 100;
            global.window.scrollX = 0;

            monitor.start();
            monitor._handleScroll({});

            expect(monitor.data.scroll.length).toBe(1);
            expect(monitor.data.scroll[0].scrollY).toBe(100);
        });

        test('should collect touch data', () => {
            monitor.start();

            const mockTouchEvent = {
                touches: [{
                    clientX: 150,
                    clientY: 250,
                    force: 0.5,
                    radiusX: 10,
                    radiusY: 10
                }],
                isTrusted: true
            };

            monitor._handleTouchStart(mockTouchEvent);

            expect(monitor.data.touch.length).toBe(1);
            expect(monitor.data.touch[0].x).toBe(150);
            expect(monitor.data.touch[0].force).toBe(0.5);
        });

        test('should trigger onSample callback', (done) => {
            const onSampleSpy = jest.fn();
            const monitorWithCallback = new HeadlessBehaviorMonitor({
                onSample: onSampleSpy
            });

            monitorWithCallback.start();
            monitorWithCallback._handleMouseMove({
                clientX: 100,
                clientY: 200,
                isTrusted: true
            });

            setTimeout(() => {
                expect(onSampleSpy).toHaveBeenCalled();
                done();
            }, 10);
        });
    });

    describe('Analysis Functions', () => {
        test('_analyzeMouse() should return low score for insufficient data', () => {
            const result = monitor._analyzeMouse();

            expect(result.available).toBe(false);
            expect(result.score).toBe(0);
            expect(result.confidence).toBe(0);
        });

        test('_analyzeMouse() should detect suspicious patterns', () => {
            // Add suspicious mouse data (perfectly straight line)
            for (let i = 0; i < 25; i++) {
                monitor.data.mouse.push({
                    x: i * 10,
                    y: 100, // Perfectly straight horizontal line
                    timestamp: Date.now() + i * 10,
                    isTrusted: false // Untrusted events
                });
            }

            const result = monitor._analyzeMouse();

            expect(result.available).toBe(true);
            expect(result.score).toBeGreaterThan(0);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.metrics).toBeDefined();
        });

        test('_analyzeKeyboard() should detect robotic typing', () => {
            // Add suspiciously consistent keyboard data
            for (let i = 0; i < 15; i++) {
                monitor.data.keyboard.push({
                    key: 'a',
                    timestamp: Date.now() + i * 100, // Perfectly timed
                    holdTime: 50, // Exactly same hold time
                    isTrusted: false
                });
            }

            const result = monitor._analyzeKeyboard();

            expect(result.available).toBe(true);
            expect(result.score).toBeGreaterThan(0);
            expect(result.metrics.holdTimeVariance).toBeDefined();
        });

        test('_analyzeScroll() should detect robotic scrolling', () => {
            // Add suspiciously consistent scroll data
            for (let i = 0; i < 10; i++) {
                monitor.data.scroll.push({
                    scrollY: i * 100, // Always same delta
                    scrollX: 0,
                    timestamp: Date.now() + i * 100 // Perfectly timed
                });
            }

            const result = monitor._analyzeScroll();

            expect(result.available).toBe(true);
            expect(result.score).toBeGreaterThan(0);
        });

        test('_calculateVariance() should calculate correctly', () => {
            const values = [1, 2, 3, 4, 5];
            const variance = monitor._calculateVariance(values);

            expect(variance).toBeGreaterThan(0);
            expect(variance).toBe(2); // Known variance for this set
        });

        test('_calculateVariance() should return 0 for empty array', () => {
            const variance = monitor._calculateVariance([]);
            expect(variance).toBe(0);
        });

        test('_analyzeMouse() should calculate mouse_efficiency metric', () => {
            // Add mouse data with some curvature (not perfectly straight)
            // Create a path from (0,0) to (100,100) with some detours
            monitor.data.mouse.push({ x: 0, y: 0, timestamp: Date.now(), isTrusted: true });
            monitor.data.mouse.push({ x: 20, y: 10, timestamp: Date.now() + 10, isTrusted: true });
            monitor.data.mouse.push({ x: 40, y: 30, timestamp: Date.now() + 20, isTrusted: true });
            monitor.data.mouse.push({ x: 60, y: 50, timestamp: Date.now() + 30, isTrusted: true });
            monitor.data.mouse.push({ x: 80, y: 70, timestamp: Date.now() + 40, isTrusted: true });
            monitor.data.mouse.push({ x: 100, y: 100, timestamp: Date.now() + 50, isTrusted: true });

            const result = monitor._analyzeMouse();

            expect(result.available).toBe(true);
            expect(result.metrics.mouseEfficiency).toBeDefined();
            expect(result.metrics.straightDistance).toBeDefined();
            expect(result.metrics.pathDistance).toBeDefined();
            // For this path, efficiency should be less than 1.0 but greater than 0
            expect(result.metrics.mouseEfficiency).toBeGreaterThan(0);
            expect(result.metrics.mouseEfficiency).toBeLessThanOrEqual(1.0);
        });

        test('_analyzeMouse() should detect perfect straight line (efficiency ~1.0)', () => {
            // Perfectly straight diagonal line
            for (let i = 0; i <= 10; i++) {
                monitor.data.mouse.push({
                    x: i * 10,
                    y: i * 10,
                    timestamp: Date.now() + i * 10,
                    isTrusted: true
                });
            }

            const result = monitor._analyzeMouse();

            expect(result.available).toBe(true);
            expect(result.metrics.mouseEfficiency).toBeDefined();
            // Perfect straight line should have efficiency very close to 1.0
            expect(result.metrics.mouseEfficiency).toBeGreaterThan(0.99);
        });

        test('_analyzeMouse() should detect suspicious high efficiency movements', () => {
            // Very direct movement (bot-like)
            for (let i = 0; i <= 20; i++) {
                monitor.data.mouse.push({
                    x: i * 5,
                    y: i * 5,
                    timestamp: Date.now() + i * 10,
                    isTrusted: true
                });
            }

            const result = monitor._analyzeMouse();

            expect(result.available).toBe(true);
            expect(result.metrics.mouseEfficiency).toBeGreaterThan(0.95);
            // High efficiency should contribute to suspiciousness
            expect(result.score).toBeGreaterThan(0);
        });

        test('_analyzeMouse() should handle curved path (lower efficiency)', () => {
            // Create a curved path
            for (let i = 0; i <= 20; i++) {
                const angle = (i / 20) * Math.PI; // 0 to π
                monitor.data.mouse.push({
                    x: i * 5,
                    y: Math.sin(angle) * 50, // Curved path
                    timestamp: Date.now() + i * 10,
                    isTrusted: true
                });
            }

            const result = monitor._analyzeMouse();

            expect(result.available).toBe(true);
            expect(result.metrics.mouseEfficiency).toBeDefined();
            // Curved path should have lower efficiency
            expect(result.metrics.mouseEfficiency).toBeLessThan(0.95);
        });
    });

    describe('Overall Score Calculation', () => {
        test('should calculate weighted overall score', () => {
            // Add some data to different categories
            for (let i = 0; i < 25; i++) {
                monitor.data.mouse.push({
                    x: i * 10,
                    y: 100,
                    timestamp: Date.now() + i * 10,
                    isTrusted: false
                });
            }

            for (let i = 0; i < 15; i++) {
                monitor.data.keyboard.push({
                    key: 'a',
                    timestamp: Date.now() + i * 100,
                    holdTime: 50,
                    isTrusted: false
                });
            }

            const analysis = {
                mouse: monitor._analyzeMouse(),
                keyboard: monitor._analyzeKeyboard(),
                scroll: { available: false, score: 0, confidence: 0 },
                touch: { available: false, score: 0, confidence: 0 },
                events: { available: false, score: 0, confidence: 0 },
                sensors: { available: false, score: 0, confidence: 0 }
            };

            const scoreData = monitor._calculateOverallScore(analysis);

            expect(scoreData.score).toBeGreaterThanOrEqual(0);
            expect(scoreData.score).toBeLessThanOrEqual(1);
            expect(scoreData.confidence).toBeGreaterThan(0);
        });

        test('should handle case with no available checks', () => {
            const analysis = {
                mouse: { available: false, score: 0, confidence: 0 },
                keyboard: { available: false, score: 0, confidence: 0 },
                scroll: { available: false, score: 0, confidence: 0 },
                touch: { available: false, score: 0, confidence: 0 },
                events: { available: false, score: 0, confidence: 0 },
                sensors: { available: false, score: 0, confidence: 0 }
            };

            const scoreData = monitor._calculateOverallScore(analysis);

            expect(scoreData.score).toBe(0);
            expect(scoreData.confidence).toBe(0);
        });
    });

    describe('Readiness Detection', () => {
        test('_isReady() should return false with insufficient samples', () => {
            expect(monitor._isReady()).toBe(false);
        });

        test('_isReady() should return true with sufficient samples in 2+ categories', () => {
            // Add enough mouse samples
            for (let i = 0; i < 20; i++) {
                monitor.data.mouse.push({
                    x: i, y: i, timestamp: Date.now(), isTrusted: true
                });
            }

            // Add enough keyboard samples
            for (let i = 0; i < 10; i++) {
                monitor.data.keyboard.push({
                    key: 'a', timestamp: Date.now(), holdTime: 50, isTrusted: true
                });
            }

            expect(monitor._isReady()).toBe(true);
        });

        test('_isReady() should return true with single enabled channel', () => {
            // Create monitor with only mouse enabled
            const singleChannelMonitor = new HeadlessBehaviorMonitor({
                mouse: true,
                keyboard: false,
                scroll: false,
                touch: false,
                events: false
            });

            // Add enough mouse samples
            for (let i = 0; i < 20; i++) {
                singleChannelMonitor.data.mouse.push({
                    x: i, y: i, timestamp: Date.now(), isTrusted: true
                });
            }

            expect(singleChannelMonitor._isReady()).toBe(true);
        });

        test('_isReady() should return false with no enabled channels', () => {
            const noChannelMonitor = new HeadlessBehaviorMonitor({
                mouse: false,
                keyboard: false,
                scroll: false,
                touch: false,
                events: false
            });

            expect(noChannelMonitor._isReady()).toBe(false);
        });

        test('waitForReady() should resolve when ready', async () => {
            monitor.start();

            // Add sufficient samples
            for (let i = 0; i < 20; i++) {
                monitor.data.mouse.push({
                    x: i, y: i, timestamp: Date.now(), isTrusted: true
                });
            }
            for (let i = 0; i < 10; i++) {
                monitor.data.keyboard.push({
                    key: 'a', timestamp: Date.now(), holdTime: 50, isTrusted: true
                });
            }

            // Trigger readiness check
            monitor._checkReadiness();

            const result = await monitor.waitForReady(100);
            expect(result).toBe(true);
        });

        test('waitForReady() should timeout if not ready', async () => {
            monitor.start();

            const result = await monitor.waitForReady(100);
            expect(result).toBe(false);
        });

        test('onReady callback should be triggered', (done) => {
            const onReadySpy = jest.fn();
            const monitorWithCallback = new HeadlessBehaviorMonitor({
                onReady: onReadySpy
            });

            monitorWithCallback.start();

            // Add sufficient samples
            for (let i = 0; i < 20; i++) {
                monitorWithCallback.data.mouse.push({
                    x: i, y: i, timestamp: Date.now(), isTrusted: true
                });
            }
            for (let i = 0; i < 10; i++) {
                monitorWithCallback.data.keyboard.push({
                    key: 'a', timestamp: Date.now(), holdTime: 50, isTrusted: true
                });
            }

            monitorWithCallback._checkReadiness();

            setTimeout(() => {
                expect(onReadySpy).toHaveBeenCalled();
                done();
            }, 10);
        });

        test('_checkReadiness(true) should resolve waiters with false when not ready', async () => {
            monitor.start();

            // Start waiting (no samples, so not ready)
            const waitPromise = monitor.waitForReady(5000);

            // Force timeout before actual timeout
            setTimeout(() => {
                monitor._checkReadiness(true);
            }, 50);

            const result = await waitPromise;
            expect(result).toBe(false);
        });

        test('_checkReadiness(true) should trigger onReady even on timeout', (done) => {
            const onReadySpy = jest.fn();
            const monitorWithCallback = new HeadlessBehaviorMonitor({
                onReady: onReadySpy,
                timeout: 100
            });

            monitorWithCallback.start();

            // Don't add enough samples - will timeout

            // Force timeout
            monitorWithCallback._checkReadiness(true);

            setTimeout(() => {
                expect(onReadySpy).toHaveBeenCalled();
                const results = onReadySpy.mock.calls[0][0];
                expect(results).toHaveProperty('overallScore');
                done();
            }, 10);
        });
    });

    describe('Integration', () => {
        test('should work through complete lifecycle', () => {
            monitor.start();
            expect(monitor.isRunning).toBe(true);

            // Simulate user interactions
            monitor._handleMouseMove({ clientX: 100, clientY: 200, isTrusted: true });
            monitor._handleMouseMove({ clientX: 105, clientY: 205, isTrusted: true });
            
            const keyDown = { key: 'a' };
            const keyUp = { key: 'a', isTrusted: true };
            monitor._handleKeyDown(keyDown);
            monitor._handleKeyUp(keyUp);

            const status = monitor.getStatus();
            expect(status.samples.mouse).toBe(2);
            expect(status.samples.keyboard).toBe(1);

            const results = monitor.stop();
            expect(results).toBeDefined();
            expect(results.metadata.samplesCollected.mouse).toBe(2);
        });
    });

    describe('Sensor and WebGL', () => {
        test('should collect sensor data when available', () => {
            // Mock window for sensor monitoring
            let sensorHandler = null;
            const mockAddEventListener = jest.fn((event, handler, options) => {
                if (event === 'devicemotion') {
                    sensorHandler = handler;
                }
            });
            
            global.window.addEventListener = mockAddEventListener;
            global.window.DeviceMotionEvent = function() {};
            
            const sensorMonitor = new HeadlessBehaviorMonitor({ sensors: true });
            sensorMonitor.start();
            
            // Verify sensor monitoring was set up
            expect(sensorHandler).not.toBeNull();
            
            // Simulate sensor event
            if (sensorHandler) {
                sensorHandler({
                    acceleration: { x: 0.1, y: 0.2, z: 9.8 },
                    rotationRate: { alpha: 0.01, beta: 0.02, gamma: 0.03 }
                });
                
                expect(sensorMonitor.data.sensors.length).toBeGreaterThan(0);
            }
            
            sensorMonitor.stop();
        });

        test('should analyze sensor data', () => {
            // Add some mock sensor data
            monitor.data.sensors = [
                { x: 0.1, y: 0.2, z: 9.8, alpha: 0.01, beta: 0.02, gamma: 0.03, timestamp: Date.now() },
                { x: 0.12, y: 0.21, z: 9.79, alpha: 0.011, beta: 0.021, gamma: 0.031, timestamp: Date.now() + 100 }
            ];
            
            const result = monitor._analyzeSensors();
            
            expect(result).toBeDefined();
            expect(result).toHaveProperty('available');
            expect(result).toHaveProperty('score');
            expect(result).toHaveProperty('confidence');
        });

        test('should measure WebGL timing', () => {
            // Mock WebGLRenderingContext
            global.window.WebGLRenderingContext = function() {};
            
            // Mock WebGL context with proper shader compilation
            const mockShader = {};
            const mockGl = {
                VERTEX_SHADER: 35633,
                FRAGMENT_SHADER: 35632,
                createShader: jest.fn(() => mockShader),
                shaderSource: jest.fn(),
                compileShader: jest.fn(),
                deleteShader: jest.fn()
            };
            
            const mockCanvas = {
                getContext: jest.fn((type) => {
                    if (type === 'webgl' || type === 'experimental-webgl') {
                        return mockGl;
                    }
                    return null;
                })
            };
            
            global.document.createElement = jest.fn((tag) => {
                if (tag === 'canvas') {
                    return mockCanvas;
                }
                return { getContext: jest.fn(() => null) };
            });
            
            const webglMonitor = new HeadlessBehaviorMonitor({ webglTiming: true });
            webglMonitor.start();
            
            // Check that WebGL timing was measured
            expect(webglMonitor.data.webglTiming).not.toBeNull();
            expect(webglMonitor.data.webglTiming).toHaveProperty('compilationTime');
            expect(webglMonitor.data.webglTiming).toHaveProperty('timestamp');
            expect(typeof webglMonitor.data.webglTiming.compilationTime).toBe('number');
            
            webglMonitor.stop();
            
            // Cleanup
            delete global.window.WebGLRenderingContext;
        });

        test('should include WebGL timing in results', () => {
            monitor.data.webglTiming = {
                compilationTime: 5.2,
                timestamp: Date.now()
            };
            
            const results = monitor.getResults();
            
            expect(results.webglTiming).toBeDefined();
            expect(results.webglTiming.compilationTime).toBe(5.2);
        });

        test('should handle missing WebGL gracefully', () => {
            global.document.createElement = jest.fn(() => ({
                getContext: jest.fn(() => null)
            }));
            
            const webglMonitor = new HeadlessBehaviorMonitor({ webglTiming: true });
            webglMonitor.start();
            
            // Should not throw and webglTiming should remain null
            expect(webglMonitor.data.webglTiming).toBeNull();
            
            webglMonitor.stop();
        });
    });
});
