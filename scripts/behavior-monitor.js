/**
 * Headless Behavior Monitor
 * Monitors user interactions over time to detect bot-like behavioral patterns.
 * 
 * These checks are fundamentally harder to spoof than fingerprint checks because
 * they require genuine human interaction patterns accumulated over time.
 * 
 * @module HeadlessBehaviorMonitor
 * @version 2.1.0
 * 
 * CALIBRATION: All detection weights are in scripts/calibration-weights.js
 * To override weights, load calibration-weights.js before this script, or set
 * window.BehaviorMonitorWeights = { ... } with your custom configuration.
 */

// Default weights (used if window.BehaviorMonitorWeights is not defined)
const DEFAULT_WEIGHTS = {
    CHANNEL_WEIGHTS: {
        mouse: 0.22,
        keyboard: 0.22,
        scroll: 0.13,
        touch: 0.13,
        events: 0.13,
        sensors: 0.05,
        webglTiming: 0.12
    },
    MOUSE_THRESHOLDS: {
        lowVelocityVariance: 0.0001,
        lowAngleVariance: 0.01,
        highStraightLineRatio: 0.5,
        highUntrustedRatio: 0.1,
        highMouseEfficiency: 0.95,
        lowTimingVariance: 50,
        lowAccelVariance: 0.00001
    },
    MOUSE_WEIGHTS: {
        lowVelocityVariance: 0.25,
        lowAngleVariance: 0.15,
        highStraightLineRatio: 0.25,
        highUntrustedRatio: 0.2,
        highMouseEfficiency: 0.15,
        lowTimingVariance: 0.15,
        subMillisecondPattern: 0.15,
        lowAccelVariance: 0.15,
        bezierPattern: 0.2,
        pressureSuspicious: 0.15,
        lowEntropy: 0.15,
        fingerprintSuspicious: 0.15
    },
    KEYBOARD_THRESHOLDS: {
        lowHoldTimeVariance: 10,
        lowInterKeyVariance: 100,
        highUntrustedRatio: 0.1
    },
    KEYBOARD_WEIGHTS: {
        lowHoldTimeVariance: 0.3,
        lowInterKeyVariance: 0.3,
        highUntrustedRatio: 0.4
    },
    SCROLL_THRESHOLDS: {
        lowDeltaVariance: 1,
        lowIntervalVariance: 10,
        lowUniqueDeltaRatio: 0.3,
        highDeltaVariance: 3000,
        highEventsPerSecond: 100
    },
    SCROLL_WEIGHTS: {
        lowDeltaVariance: 0.2,
        lowIntervalVariance: 0.2,
        lowUniqueDeltaRatio: 0.2,
        highDeltaVariance: 0.15,
        highEventsPerSecond: 0.15,
        subMillisecondPattern: 0.1
    },
    TOUCH_THRESHOLDS: {
        lowForceVariance: 0.001,
        lowPositionVariance: 0.01,
        highForceVariance: 0.15,
        highEventsPerSecond: 50
    },
    TOUCH_WEIGHTS: {
        lowForceVariance: 0.25,
        lowPositionVariance: 0.25,
        highForceVariance: 0.15,
        highEventsPerSecond: 0.15,
        subMillisecondPattern: 0.1
    },
    SAFEGUARDS: {
        minConfidenceGate: 0.6,
        suspiciousChannelThreshold: 0.6,
        minSuspiciousChannels: 2,
        singleChannelDownscale: 0.5,
        maxChannelContribution: 0.4,
        minSessionDurationZero: 5000,
        minSessionDurationCap: 10000,
        shortSessionScoreCap: 0.5,
        botThreshold: 0.5,
        minSamplesForVariance: 10
    }
};

// Get weights from window.BehaviorMonitorWeights if available, otherwise use defaults
const getWeights = () => {
    if (typeof window !== 'undefined' && window.BehaviorMonitorWeights) {
        // Deep merge with defaults to ensure all keys exist
        return {
            ...DEFAULT_WEIGHTS,
            ...window.BehaviorMonitorWeights,
            CHANNEL_WEIGHTS: { ...DEFAULT_WEIGHTS.CHANNEL_WEIGHTS, ...(window.BehaviorMonitorWeights.CHANNEL_WEIGHTS || {}) },
            MOUSE_THRESHOLDS: { ...DEFAULT_WEIGHTS.MOUSE_THRESHOLDS, ...(window.BehaviorMonitorWeights.MOUSE_THRESHOLDS || {}) },
            MOUSE_WEIGHTS: { ...DEFAULT_WEIGHTS.MOUSE_WEIGHTS, ...(window.BehaviorMonitorWeights.MOUSE_WEIGHTS || {}) },
            KEYBOARD_THRESHOLDS: { ...DEFAULT_WEIGHTS.KEYBOARD_THRESHOLDS, ...(window.BehaviorMonitorWeights.KEYBOARD_THRESHOLDS || {}) },
            KEYBOARD_WEIGHTS: { ...DEFAULT_WEIGHTS.KEYBOARD_WEIGHTS, ...(window.BehaviorMonitorWeights.KEYBOARD_WEIGHTS || {}) },
            SCROLL_THRESHOLDS: { ...DEFAULT_WEIGHTS.SCROLL_THRESHOLDS, ...(window.BehaviorMonitorWeights.SCROLL_THRESHOLDS || {}) },
            SCROLL_WEIGHTS: { ...DEFAULT_WEIGHTS.SCROLL_WEIGHTS, ...(window.BehaviorMonitorWeights.SCROLL_WEIGHTS || {}) },
            TOUCH_THRESHOLDS: { ...DEFAULT_WEIGHTS.TOUCH_THRESHOLDS, ...(window.BehaviorMonitorWeights.TOUCH_THRESHOLDS || {}) },
            TOUCH_WEIGHTS: { ...DEFAULT_WEIGHTS.TOUCH_WEIGHTS, ...(window.BehaviorMonitorWeights.TOUCH_WEIGHTS || {}) },
            SAFEGUARDS: { ...DEFAULT_WEIGHTS.SAFEGUARDS, ...(window.BehaviorMonitorWeights.SAFEGUARDS || {}) }
        };
    }
    return DEFAULT_WEIGHTS;
};

class HeadlessBehaviorMonitor {
    constructor(options = {}) {
        // Feature flags
        this.options = {
            mouse: options.mouse !== false,
            keyboard: options.keyboard !== false,
            scroll: options.scroll !== false,
            touch: options.touch !== false,
            events: options.events !== false,
            sensors: options.sensors !== false,
            webglTiming: options.webglTiming !== false,
            
            minSamples: {
                mouse: options.minSamples?.mouse || 20,
                keyboard: options.minSamples?.keyboard || 10,
                scroll: options.minSamples?.scroll || 5,
                touch: options.minSamples?.touch || 5,
                events: options.minSamples?.events || 10
            },
            
            timeout: options.timeout || 30000,
            onReady: options.onReady || null,
            onSample: options.onSample || null
        };
        
        // Load calibration weights (from window.BehaviorMonitorWeights or defaults)
        this.weights = getWeights();
        
        // Data storage
        this.data = {
            mouse: [],
            keyboard: [],
            scroll: [],
            touch: [],
            events: [],
            sensors: [],
            webglTiming: null
        };
        
        // State
        this.isRunning = false;
        this.startTime = null;
        this.readyResolvers = [];
        this.timeoutId = null;
        this.readyFired = false;
        
        // Event handlers (bound methods for proper removal)
        this.handlers = {
            mousemove: this._handleMouseMove.bind(this),
            keydown: this._handleKeyDown.bind(this),
            keyup: this._handleKeyUp.bind(this),
            scroll: this._handleScroll.bind(this),
            touchstart: this._handleTouchStart.bind(this),
            touchmove: this._handleTouchMove.bind(this),
            click: this._handleEvent.bind(this, 'click'),
            focus: this._handleEvent.bind(this, 'focus')
        };
        
        this.lastKeyDownTime = null;
        this.sensorHandler = null;
        this.sensorTimeoutId = null;
    }
    
    /**
     * Start monitoring user interactions
     * 
     * This method is synchronous and returns immediately after attaching event listeners.
     * Use waitForReady() to wait for enough samples to be collected.
     * 
     * Starting a new session clears any pending promise resolvers from a previous session.
     * Note: If you had pending waitForReady() promises from a previous session that was
     * stopped, those were already resolved with false by stop().
     * 
     * Data accumulates across multiple start/stop cycles - previously collected data is not
     * cleared. This allows you to pause and resume monitoring. If you need to start fresh,
     * create a new HeadlessBehaviorMonitor instance.
     * 
     * @returns {void}
     * 
     * @example
     * monitor.start();
     * await monitor.waitForReady(10000);
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        this.readyFired = false;
        this.readyResolvers = [];
        
        // Attach event listeners
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (this.options.mouse) {
                document.addEventListener('mousemove', this.handlers.mousemove, { passive: true });
            }
            if (this.options.keyboard) {
                document.addEventListener('keydown', this.handlers.keydown, { passive: true });
                document.addEventListener('keyup', this.handlers.keyup, { passive: true });
            }
            if (this.options.scroll) {
                window.addEventListener('scroll', this.handlers.scroll, { passive: true });
            }
            if (this.options.touch) {
                document.addEventListener('touchstart', this.handlers.touchstart, { passive: true });
                document.addEventListener('touchmove', this.handlers.touchmove, { passive: true });
            }
            if (this.options.events) {
                document.addEventListener('click', this.handlers.click, { passive: true });
                window.addEventListener('focus', this.handlers.focus, { passive: true });
            }
            
            // Start sensor monitoring if supported
            if (this.options.sensors) {
                this._startSensorMonitoring();
            }
            
            // Measure WebGL shader compilation timing
            if (this.options.webglTiming) {
                this._measureWebGLTiming();
            }
        }
        
        // Set timeout
        if (this.options.timeout > 0) {
            this.timeoutId = setTimeout(() => {
                this._checkReadiness(true);
            }, this.options.timeout);
        }
    }
    
    /**
     * Stop monitoring and return final results
     * 
     * This method is synchronous. It removes all event listeners and returns
     * the final analysis results immediately.
     * 
     * Note: Any pending waitForReady() promises will be resolved with false.
     * 
     * @returns {Object|null} Final analysis results, or null if not running
     * 
     * @example
     * const finalResults = monitor.stop();
     * if (finalResults) {
     *     console.log('Score:', finalResults.overallScore);
     * }
     */
    stop() {
        if (!this.isRunning) return null;
        
        this.isRunning = false;
        
        // Remove event listeners
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            document.removeEventListener('mousemove', this.handlers.mousemove);
            document.removeEventListener('keydown', this.handlers.keydown);
            document.removeEventListener('keyup', this.handlers.keyup);
            window.removeEventListener('scroll', this.handlers.scroll);
            document.removeEventListener('touchstart', this.handlers.touchstart);
            document.removeEventListener('touchmove', this.handlers.touchmove);
            document.removeEventListener('click', this.handlers.click);
            window.removeEventListener('focus', this.handlers.focus);
            
            // Remove sensor handler if active
            if (this.sensorHandler) {
                window.removeEventListener('devicemotion', this.sensorHandler);
                this.sensorHandler = null;
            }
        }
        
        // Clear timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        // Clear sensor timeout
        if (this.sensorTimeoutId) {
            clearTimeout(this.sensorTimeoutId);
            this.sensorTimeoutId = null;
        }
        
        // Resolve any pending waitForReady() promises as not ready
        if (Array.isArray(this.readyResolvers) && this.readyResolvers.length > 0) {
            for (const resolve of this.readyResolvers) {
                try {
                    resolve(false);
                } catch (e) {
                    // Ignore errors thrown by user-provided resolvers
                }
            }
            this.readyResolvers = [];
        }
        
        return this.getResults();
    }
    
    /**
     * Get current monitoring status
     * 
     * This method is synchronous and returns the current state immediately.
     * 
     * @returns {Object} Status object with isRunning, elapsedTime, samples, and ready
     * 
     * @example
     * const status = monitor.getStatus();
     * console.log('Ready:', status.ready);
     */
    getStatus() {
        const status = {
            isRunning: this.isRunning,
            elapsedTime: this.startTime ? Date.now() - this.startTime : 0,
            samples: {
                mouse: this.data.mouse.length,
                keyboard: this.data.keyboard.length,
                scroll: this.data.scroll.length,
                touch: this.data.touch.length,
                events: this.data.events.length
            },
            ready: this._isReady()
        };
        
        return status;
    }
    
    /**
     * Get analysis results
     * 
     * This method is synchronous and computes results from collected data immediately.
     * Can be called multiple times to get current analysis at any point.
     * 
     * @returns {Object} Analysis results with scores, confidence, and metrics
     * 
     * @example
     * const results = monitor.getResults();
     * console.log('Score:', results.overallScore);
     * console.log('Confidence:', results.confidence);
     */
    getResults() {
        const analysis = {
            mouse: this._analyzeMouse(),
            keyboard: this._analyzeKeyboard(),
            scroll: this._analyzeScroll(),
            touch: this._analyzeTouch(),
            events: this._analyzeEvents(),
            sensors: this._analyzeSensors(),
            webglTiming: this._analyzeWebGLTiming(),
            
            overallScore: 0,
            confidence: 0,
            
            metadata: {
                samplesCollected: {
                    mouse: this.data.mouse.length,
                    keyboard: this.data.keyboard.length,
                    scroll: this.data.scroll.length,
                    touch: this.data.touch.length,
                    events: this.data.events.length
                },
                duration: this.startTime ? Date.now() - this.startTime : 0
            }
        };
        
        // Calculate overall score and confidence
        const scoreData = this._calculateOverallScore(analysis);
        analysis.overallScore = scoreData.score;
        analysis.confidence = scoreData.confidence;
        
        return analysis;
    }
    
    /**
     * Get calibration data for weight tuning
     * 
     * Returns detailed metrics and scoring breakdowns that can be used to calibrate
     * the detection weights. This data is useful for:
     * - Understanding why a session was classified as bot/human
     * - Collecting baseline data from real users for threshold calibration
     * - Building a dataset of known bot/human samples
     * 
     * @returns {Object} Calibration data with metrics, scores, and human baselines
     * 
     * @example
     * const calibration = monitor.getCalibrationData();
     * // Save to file for analysis
     * fs.writeFileSync('session_metrics.json', JSON.stringify(calibration, null, 2));
     */
    getCalibrationData() {
        const results = this.getResults();
        
        return {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            sessionDuration: results.metadata.duration,
            
            // Overall classification
            classification: {
                overallScore: results.overallScore,
                confidence: results.confidence,
                verdict: results.overallScore >= 0.5 ? 'BOT' : 'HUMAN',
                verdictConfidence: results.confidence
            },
            
            // Per-channel detailed analysis with scoring breakdowns
            channelAnalysis: {
                mouse: results.mouse,
                keyboard: results.keyboard,
                scroll: results.scroll,
                touch: results.touch,
                events: results.events,
                sensors: results.sensors,
                webglTiming: results.webglTiming
            },
            
            // Sample counts
            sampleCounts: results.metadata.samplesCollected,
            
            // Human baseline reference values for calibration
            // These are typical ranges observed in real human behavior
            humanBaselines: {
                mouse: {
                    velocityVariance: { min: 0.001, typical: 0.1, max: 5.0, description: 'Human mouse velocity varies naturally' },
                    angleVariance: { min: 0.05, typical: 0.3, max: 2.0, description: 'Humans have varied movement angles' },
                    straightLineRatio: { min: 0.0, typical: 0.15, max: 0.4, description: 'Humans rarely move in perfectly straight lines' },
                    mouseEfficiency: { min: 0.3, typical: 0.6, max: 0.85, description: 'Humans take indirect paths to targets' },
                    timingVariance: { min: 100, typical: 500, max: 5000, description: 'Human timing is highly variable' }
                },
                keyboard: {
                    holdTimeVariance: { min: 20, typical: 100, max: 1000, description: 'Key hold times vary with typing style' },
                    interKeyVariance: { min: 200, typical: 1000, max: 10000, description: 'Time between keys is highly variable' }
                },
                scroll: {
                    deltaVariance: { min: 50, typical: 500, max: 2000, description: 'Scroll amounts vary naturally' },
                    intervalVariance: { min: 50, typical: 500, max: 5000, description: 'Scroll timing is irregular' },
                    eventsPerSecond: { min: 5, typical: 20, max: 50, description: 'Normal scroll event frequency' }
                },
                touch: {
                    forceVariance: { min: 0.01, typical: 0.05, max: 0.12, description: 'Touch pressure varies naturally' },
                    eventsPerSecond: { min: 5, typical: 15, max: 35, description: 'Normal touch event frequency' }
                }
            },
            
            // Recommendations for avoiding false positives
            calibrationNotes: [
                'To avoid false positives with real humans:',
                '1. Collect more human samples from real users on your site',
                '2. If mouse.velocityVariance triggers frequently, raise threshold from 0.0001 to 0.001',
                '3. If scroll.eventsPerSecond triggers on mobile, raise threshold from 100 to 150',
                '4. Touch detection thresholds may need adjustment for different device types',
                '5. Consider confidence-weighted scoring to reduce impact of low-sample channels',
                '6. Use the scoringBreakdown to identify which specific checks cause false positives',
                '7. Monitor which channels contribute most to human misclassification'
            ]
        };
    }
    
    /**
     * Wait for monitoring to collect enough samples
     * 
     * This is the ONLY async method in the API. It returns a Promise that resolves
     * when enough samples have been collected or when the timeout is reached.
     * 
     * IMPORTANT: You must call start() before calling waitForReady(). If the monitor
     * is not running, the promise will resolve with false immediately.
     * 
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise<boolean>} Resolves to true if ready, false if timeout or not running
     * 
     * @example
     * // With await
     * monitor.start();
     * const ready = await monitor.waitForReady(10000);
     * if (ready) {
     *     console.log('Ready to analyze');
     * }
     * 
     * @example
     * // With .then()
     * monitor.start();
     * monitor.waitForReady(10000).then(ready => {
     *     if (ready) {
     *         const results = monitor.getResults();
     *     }
     * });
     */
    async waitForReady(timeout) {
        const timeoutMs = (typeof timeout === 'number' && Number.isFinite(timeout))
            ? timeout
            : this.options.timeout;
        
        // Return false immediately if not running
        if (!this.isRunning) {
            return false;
        }
        
        if (this._isReady()) {
            return true;
        }
        
        return new Promise((resolve) => {
            let timeoutId = null;
            
            const done = (value) => {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                resolve(value);
            };
            
            this.readyResolvers.push(done);
            
            if (timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    // Remove this resolver from the list since we're handling it
                    const index = this.readyResolvers.indexOf(done);
                    if (index > -1) {
                        this.readyResolvers.splice(index, 1);
                    }
                    done(false);
                }, timeoutMs);
            }
        });
    }
    
    // Private methods
    
    _handleMouseMove(event) {
        const now = Date.now();
        const data = {
            x: event.clientX,
            y: event.clientY,
            timestamp: now,
            isTrusted: event.isTrusted,
            // Pointer device fingerprint data
            pressure: event.pressure !== undefined ? event.pressure : null,
            pointerType: event.pointerType !== undefined ? event.pointerType : 'mouse',
            width: event.width !== undefined ? event.width : null,
            height: event.height !== undefined ? event.height : null,
            tiltX: event.tiltX !== undefined ? event.tiltX : null,
            tiltY: event.tiltY !== undefined ? event.tiltY : null
        };
        
        this.data.mouse.push(data);
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'mouse', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _handleKeyDown(event) {
        const now = Date.now();
        this.lastKeyDownTime = now;
    }
    
    _handleKeyUp(event) {
        const now = Date.now();
        const data = {
            key: event.key,
            timestamp: now,
            holdTime: this.lastKeyDownTime ? now - this.lastKeyDownTime : null,
            isTrusted: event.isTrusted
        };
        
        this.data.keyboard.push(data);
        this.lastKeyDownTime = null;
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'keyboard', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _handleScroll(event) {
        const now = Date.now();
        const data = {
            scrollY: window.scrollY || window.pageYOffset,
            scrollX: window.scrollX || window.pageXOffset,
            timestamp: now
        };
        
        this.data.scroll.push(data);
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'scroll', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _handleTouchStart(event) {
        if (event.touches.length === 0) return;
        
        const touch = event.touches[0];
        const now = Date.now();
        const data = {
            x: touch.clientX,
            y: touch.clientY,
            force: touch.force,
            radiusX: touch.radiusX,
            radiusY: touch.radiusY,
            timestamp: now,
            isTrusted: event.isTrusted,
            type: 'start'
        };
        
        this.data.touch.push(data);
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'touch', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _handleTouchMove(event) {
        if (event.touches.length === 0) return;
        
        const touch = event.touches[0];
        const now = Date.now();
        const data = {
            x: touch.clientX,
            y: touch.clientY,
            force: touch.force,
            radiusX: touch.radiusX,
            radiusY: touch.radiusY,
            timestamp: now,
            isTrusted: event.isTrusted,
            type: 'move'
        };
        
        this.data.touch.push(data);
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'touch', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _handleEvent(eventType, event) {
        const now = Date.now();
        const data = {
            type: eventType,
            timestamp: now,
            isTrusted: event.isTrusted
        };
        
        this.data.events.push(data);
        
        if (this.options.onSample) {
            try {
                this.options.onSample({ type: 'event', data });
            } catch (e) {
                // Ignore errors from user callback to prevent disrupting event handling
            }
        }
        
        this._checkReadiness();
    }
    
    _startSensorMonitoring() {
        // Try to access device motion/orientation
        if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
            this.sensorHandler = (event) => {
                if (event.acceleration) {
                    this.data.sensors.push({
                        type: 'motion',
                        x: event.acceleration.x,
                        y: event.acceleration.y,
                        z: event.acceleration.z,
                        timestamp: Date.now()
                    });
                }
            };
            
            window.addEventListener('devicemotion', this.sensorHandler, { passive: true });
            
            // Stop after collecting a few samples
            this.sensorTimeoutId = setTimeout(() => {
                if (this.sensorHandler) {
                    window.removeEventListener('devicemotion', this.sensorHandler);
                    this.sensorHandler = null;
                }
                this.sensorTimeoutId = null;
            }, 5000);
        }
    }
    
    _measureWebGLTiming() {
        if (typeof window === 'undefined' || !window.WebGLRenderingContext) {
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return;
            
            const startTime = performance.now();
            
            // Create and compile a simple shader
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, `
                attribute vec4 position;
                void main() {
                    gl_Position = position;
                }
            `);
            gl.compileShader(vertexShader);
            
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, `
                precision mediump float;
                void main() {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `);
            gl.compileShader(fragmentShader);
            
            const endTime = performance.now();
            
            this.data.webglTiming = {
                compilationTime: endTime - startTime,
                timestamp: Date.now()
            };
            
            // Cleanup
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
        } catch (e) {
            // Ignore errors
        }
    }
    
    _isReady() {
        // Only consider input types that are actually enabled via options
        const samples = {};
        
        if (this.options.mouse) {
            samples.mouse = this.data.mouse.length >= this.options.minSamples.mouse;
        }
        
        if (this.options.keyboard) {
            samples.keyboard = this.data.keyboard.length >= this.options.minSamples.keyboard;
        }
        
        if (this.options.scroll) {
            samples.scroll = this.data.scroll.length >= this.options.minSamples.scroll;
        }
        
        if (this.options.touch) {
            samples.touch = this.data.touch.length >= this.options.minSamples.touch;
        }
        
        if (this.options.events) {
            samples.events = this.data.events.length >= this.options.minSamples.events;
        }
        
        const enabledCount = Object.keys(samples).length;
        if (enabledCount === 0) {
            // No enabled input types; cannot become ready
            return false;
        }
        
        const readyCount = Object.values(samples).filter(v => v).length;
        // Require at least two ready input types when possible; otherwise one is enough
        const requiredReady = Math.min(2, enabledCount);
        return readyCount >= requiredReady;
    }
    
    _checkReadiness(forceTimeout = false) {
        const isReady = this._isReady();
        
        if (isReady) {
            // Clear global timeout since we're ready
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            
            // Fire onReady callback only once
            if (!this.readyFired && this.options.onReady) {
                this.readyFired = true;
                try {
                    this.options.onReady(this.getResults());
                } catch (e) {
                    // Ignore errors from user callback to prevent disrupting internal state
                }
            }
            
            // Resolve all pending waiters with true
            this.readyResolvers.forEach(resolve => {
                try {
                    resolve(true);
                } catch (e) {
                    // Ignore resolver errors to ensure all waiters are processed
                }
            });
            this.readyResolvers = [];
        } else if (forceTimeout) {
            // Timeout reached but not ready - resolve with false
            this.readyResolvers.forEach(resolve => {
                try {
                    resolve(false);
                } catch (e) {
                    // Ignore resolver errors to ensure all waiters are processed
                }
            });
            this.readyResolvers = [];
            
            // Fire onReady callback on timeout (only once)
            if (!this.readyFired && this.options.onReady) {
                this.readyFired = true;
                try {
                    this.options.onReady(this.getResults());
                } catch (e) {
                    // Ignore errors from user callback to prevent disrupting internal state
                }
            }
        }
    }
    
    _analyzeMouse() {
        if (this.data.mouse.length < 2) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const movements = this.data.mouse;
        let totalDistance = 0;
        let velocities = [];
        let angles = [];
        let straightLineSegments = 0;
        let untrustedCount = 0;
        
        for (let i = 1; i < movements.length; i++) {
            const prev = movements[i - 1];
            const curr = movements[i];
            
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const timeDiff = curr.timestamp - prev.timestamp;
            
            totalDistance += distance;
            
            if (timeDiff > 0) {
                const velocity = distance / timeDiff;
                velocities.push(velocity);
                
                // Calculate angle
                if (i > 1) {
                    const prevDx = prev.x - movements[i - 2].x;
                    const prevDy = prev.y - movements[i - 2].y;
                    const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
                    angles.push(Math.abs(angle));
                }
            }
            
            // Check for perfectly straight lines (bot-like) with actual movement
            // Only count horizontal or vertical lines, not stationary points
            if (distance > 0.01 && (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01)) {
                straightLineSegments++;
            }
            
            if (!curr.isTrusted) {
                untrustedCount++;
            }
        }
        
        // Calculate mouse_efficiency (Ernest Behinov's suggestion)
        // Measures how directly the mouse moved from start to end
        const firstPoint = movements[0];
        const lastPoint = movements[movements.length - 1];
        const straightDistance = Math.sqrt(
            Math.pow(lastPoint.x - firstPoint.x, 2) + 
            Math.pow(lastPoint.y - firstPoint.y, 2)
        );
        const pathDistance = totalDistance;
        const mouseEfficiency = pathDistance > 0 ? straightDistance / pathDistance : 1.0;
        
        // Calculate entropy/variance metrics
        const velocityVariance = this._calculateVariance(velocities);
        const angleVariance = this._calculateVariance(angles);
        const segmentCount = movements.length - 1;
        const straightLineRatio = segmentCount > 0 ? straightLineSegments / segmentCount : 0;
        const untrustedRatio = untrustedCount / movements.length;
        
        // Suspicious indicators:
        // - Very low velocity variance (too consistent)
        // - Very low angle variance (too straight)
        // - High straight line ratio (> 0.5 means more than half of segments are straight)
        // - High untrusted event ratio
        // - Very high mouse efficiency (too direct, bot-like)
        // - Timing precision patterns (bots often have too-perfect timing)
        // - Bezier curve patterns (smooth but mathematical movement)
        let suspiciousScore = 0;
        
        // Check for timing pattern uniformity (bots often have regular intervals)
        const timingIntervals = [];
        for (let i = 1; i < movements.length; i++) {
            const interval = movements[i].timestamp - movements[i - 1].timestamp;
            timingIntervals.push(interval);
        }
        const timingVariance = this._calculateVariance(timingIntervals);
        
        // Analyze acceleration patterns - bots often have unnatural acceleration curves
        const accelerations = [];
        for (let i = 1; i < velocities.length; i++) {
            const accel = Math.abs(velocities[i] - velocities[i - 1]);
            accelerations.push(accel);
        }
        const accelVariance = this._calculateVariance(accelerations);
        
        // Check for sub-millisecond precision patterns in movements
        const hasSubMillisecondPattern = this._detectSubMillisecondPattern(movements);
        
        // Detect Bezier curve smoothness
        const hasBezierPattern = this._detectBezierPattern(movements);
        
        // SAFEGUARD 6: Require sufficient samples (>=10) for variance-based checks
        const hasSufficientSamples = movements.length >= 10;
        
        // SAFEGUARD 3: lowVelocityVariance must ALSO require low acceleration variance OR sub-millisecond pattern
        // Use configurable thresholds with fallbacks to defaults
        const defaultThresholds = {
            lowVelocityVariance: 0.01,
            lowAngleVariance: 0.1,
            highStraightLineRatio: 0.3,
            highUntrustedRatio: 0.1,
            highMouseEfficiency: 0.95,
            lowTimingVariance: 100,
            lowAccelVariance: 0.0001
        };
        const defaultWeights = {
            lowVelocityVariance: 0.10,      // Matches calibration-weights.js
            lowAngleVariance: 0.05,         // Matches calibration-weights.js
            highStraightLineRatio: 0.30,    // Matches calibration-weights.js
            highUntrustedRatio: 0.30,       // Matches calibration-weights.js
            highMouseEfficiency: 0.15,
            lowTimingVariance: 0.20,        // Matches calibration-weights.js
            subMillisecondPattern: 0.10,    // Matches calibration-weights.js
            lowAccelVariance: 0.10,         // Matches calibration-weights.js
            bezierPattern: 0.05,            // Matches calibration-weights.js
            pressureSuspicious: 0.05,       // Matches calibration-weights.js
            lowEntropy: 0.15,
            fingerprintSuspicious: 0.05     // Matches calibration-weights.js
        };
        const thresholds = (this.WEIGHTS && this.WEIGHTS.MOUSE_THRESHOLDS) || defaultThresholds;
        const weights = (this.WEIGHTS && this.WEIGHTS.MOUSE_WEIGHTS) || defaultWeights;
        const lowVelocityTriggered = velocityVariance < thresholds.lowVelocityVariance && hasSufficientSamples &&
            (accelVariance < thresholds.lowAccelVariance || hasSubMillisecondPattern);
        if (lowVelocityTriggered) suspiciousScore += weights.lowVelocityVariance;
        
        // SAFEGUARD 6: angleVariance requires sufficient samples AND another signal
        const lowAngleTriggered = angleVariance < thresholds.lowAngleVariance && hasSufficientSamples && 
            (lowVelocityTriggered || straightLineRatio > thresholds.highStraightLineRatio);
        if (lowAngleTriggered) suspiciousScore += weights.lowAngleVariance;
        
        // straightLineRatio can stand alone with sufficient samples
        if (straightLineRatio > thresholds.highStraightLineRatio && hasSufficientSamples) suspiciousScore += weights.highStraightLineRatio;
        
        // Untrusted ratio is context-independent
        if (untrustedRatio > thresholds.highUntrustedRatio) suspiciousScore += weights.highUntrustedRatio;
        
        // SAFEGUARD 3: mouseEfficiency > 0.95 must ALSO require low angle variance AND low timing entropy
        const lowTimingVarianceTriggered = timingVariance < thresholds.lowTimingVariance && timingIntervals.length > 5;
        const highEfficiencyTriggered = mouseEfficiency > thresholds.highMouseEfficiency && angleVariance < 0.05 && lowTimingVarianceTriggered;
        if (highEfficiencyTriggered) suspiciousScore += weights.highMouseEfficiency;
        
        // SAFEGUARD 6: Very low timing variance requires sufficient samples
        if (lowTimingVarianceTriggered && hasSufficientSamples) suspiciousScore += weights.lowTimingVariance;
        
        if (hasSubMillisecondPattern && hasSufficientSamples) suspiciousScore += weights.subMillisecondPattern;
        
        // SAFEGUARD 6: Low acceleration variance requires sufficient samples
        const lowAccelTriggered = accelVariance < thresholds.lowAccelVariance && accelerations.length >= 10;
        if (lowAccelTriggered) suspiciousScore += weights.lowAccelVariance;
        
        if (hasBezierPattern && hasSufficientSamples) suspiciousScore += weights.bezierPattern;
        
        // Check for lack of pointer pressure variation
        const pressureAnalysis = this._analyzePointerPressure(movements);
        // SAFEGUARD 6: Pressure requires another signal
        if (pressureAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern)) suspiciousScore += weights.pressureSuspicious;
        
        // Analyze event timestamp entropy
        const entropyAnalysis = this._analyzeTimestampEntropy(movements);
        // SAFEGUARD 6: Entropy requires another signal
        if (entropyAnalysis.suspicious && hasSufficientSamples) suspiciousScore += weights.lowEntropy;
        
        // Check for pointer device fingerprint mismatches
        const fingerprintAnalysis = this._analyzePointerFingerprint(movements);
        // SAFEGUARD 6: Fingerprint requires another signal
        if (fingerprintAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern)) suspiciousScore += weights.fingerprintSuspicious;
        
        const confidence = Math.min(movements.length / this.options.minSamples.mouse, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: movements.length,
                velocityVariance: velocityVariance,
                angleVariance: angleVariance,
                straightLineRatio: straightLineRatio,
                untrustedRatio: untrustedRatio,
                totalDistance: totalDistance,
                mouseEfficiency: mouseEfficiency,
                straightDistance: straightDistance,
                pathDistance: pathDistance,
                timingVariance: timingVariance,
                accelVariance: accelVariance
            },
            // Detailed scoring breakdown for calibration (reflects multi-signal safeguards)
            scoringBreakdown: {
                lowVelocityVariance: { triggered: lowVelocityTriggered, weight: weights.lowVelocityVariance, value: velocityVariance, threshold: thresholds.lowVelocityVariance, requiresMultiSignal: true },
                lowAngleVariance: { triggered: lowAngleTriggered, weight: weights.lowAngleVariance, value: angleVariance, threshold: thresholds.lowAngleVariance, requiresMultiSignal: true },
                highStraightLineRatio: { triggered: straightLineRatio > thresholds.highStraightLineRatio && hasSufficientSamples, weight: weights.highStraightLineRatio, value: straightLineRatio, threshold: thresholds.highStraightLineRatio },
                highUntrustedRatio: { triggered: untrustedRatio > thresholds.highUntrustedRatio, weight: weights.highUntrustedRatio, value: untrustedRatio, threshold: thresholds.highUntrustedRatio },
                highMouseEfficiency: { triggered: highEfficiencyTriggered, weight: weights.highMouseEfficiency, value: mouseEfficiency, threshold: thresholds.highMouseEfficiency, requiresMultiSignal: true },
                lowTimingVariance: { triggered: lowTimingVarianceTriggered && hasSufficientSamples, weight: weights.lowTimingVariance, value: timingVariance, threshold: thresholds.lowTimingVariance },
                subMillisecondPattern: { triggered: hasSubMillisecondPattern && hasSufficientSamples, weight: weights.subMillisecondPattern, value: hasSubMillisecondPattern },
                lowAccelVariance: { triggered: lowAccelTriggered, weight: weights.lowAccelVariance, value: accelVariance, threshold: thresholds.lowAccelVariance },
                bezierPattern: { triggered: hasBezierPattern && hasSufficientSamples, weight: weights.bezierPattern, value: hasBezierPattern },
                pressureSuspicious: { triggered: pressureAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern), weight: weights.pressureSuspicious, details: pressureAnalysis, requiresMultiSignal: true },
                lowEntropy: { triggered: entropyAnalysis.suspicious && hasSufficientSamples, weight: weights.lowEntropy, details: entropyAnalysis },
                fingerprintSuspicious: { triggered: fingerprintAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern), weight: weights.fingerprintSuspicious, details: fingerprintAnalysis, requiresMultiSignal: true }
            }
        };
    }
    
    _analyzeKeyboard() {
        if (this.data.keyboard.length < 2) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const keystrokes = this.data.keyboard;
        let holdTimes = [];
        let interKeyTimes = [];
        let untrustedCount = 0;
        
        for (let i = 0; i < keystrokes.length; i++) {
            const key = keystrokes[i];
            
            if (key.holdTime !== null) {
                holdTimes.push(key.holdTime);
            }
            
            if (i > 0) {
                const timeDiff = key.timestamp - keystrokes[i - 1].timestamp;
                interKeyTimes.push(timeDiff);
            }
            
            if (!key.isTrusted) {
                untrustedCount++;
            }
        }
        
        const holdTimeVariance = this._calculateVariance(holdTimes);
        const interKeyVariance = this._calculateVariance(interKeyTimes);
        const untrustedRatio = untrustedCount / keystrokes.length;
        
        // Suspicious indicators:
        // - Very low hold time variance (too consistent)
        // - Very low inter-key time variance (robotic typing)
        // - High untrusted event ratio
        let suspiciousScore = 0;
        
        if (holdTimeVariance < 10) suspiciousScore += 0.3;
        if (interKeyVariance < 100) suspiciousScore += 0.3;
        if (untrustedRatio > 0.1) suspiciousScore += 0.4;
        
        const confidence = Math.min(keystrokes.length / this.options.minSamples.keyboard, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: keystrokes.length,
                holdTimeVariance: holdTimeVariance,
                interKeyVariance: interKeyVariance,
                untrustedRatio: untrustedRatio
            },
            // Detailed scoring breakdown for calibration
            scoringBreakdown: {
                lowHoldTimeVariance: { triggered: holdTimeVariance < 10, weight: 0.3, value: holdTimeVariance, threshold: 10 },
                lowInterKeyVariance: { triggered: interKeyVariance < 100, weight: 0.3, value: interKeyVariance, threshold: 100 },
                highUntrustedRatio: { triggered: untrustedRatio > 0.1, weight: 0.4, value: untrustedRatio, threshold: 0.1 }
            }
        };
    }
    
    _analyzeScroll() {
        if (this.data.scroll.length < 2) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const scrolls = this.data.scroll;
        let deltas = [];
        let intervals = [];
        let uniqueDeltas = new Set();
        
        for (let i = 1; i < scrolls.length; i++) {
            const prev = scrolls[i - 1];
            const curr = scrolls[i];
            
            const deltaY = curr.scrollY - prev.scrollY;
            const interval = curr.timestamp - prev.timestamp;
            
            deltas.push(Math.abs(deltaY));
            intervals.push(interval);
            uniqueDeltas.add(deltaY);
        }
        
        const deltaVariance = this._calculateVariance(deltas);
        const intervalVariance = this._calculateVariance(intervals);
        const uniqueDeltaRatio = uniqueDeltas.size / deltas.length;
        
        // Calculate event frequency (events per second)
        const totalDuration = scrolls.length > 1 
            ? (scrolls[scrolls.length - 1].timestamp - scrolls[0].timestamp) / 1000 
            : 1;
        const eventsPerSecond = scrolls.length / Math.max(totalDuration, 0.001);
        
        // Suspicious indicators:
        // - Very low delta variance (always same scroll amount)
        // - Very low interval variance (perfectly timed)
        // - Low unique delta ratio (repetitive pattern)
        // - Bot timing pattern detection
        // - EXTREMELY HIGH delta variance (unnaturally erratic)
        // - HIGH event frequency (too many events per second)
        let suspiciousScore = 0;
        
        // Low variance = bot-like repetitive patterns (weights: 0.2 each)
        if (deltaVariance < 1) suspiciousScore += 0.2;
        if (intervalVariance < 10) suspiciousScore += 0.2;
        if (uniqueDeltaRatio < 0.3) suspiciousScore += 0.2;
        
        // EXTREMELY HIGH variance = unnaturally erratic (weights: 0.15 each)
        // Normal human scroll variance is typically 100-1000
        // Variance > 3000 suggests artificially erratic behavior
        if (deltaVariance > 3000) suspiciousScore += 0.15;
        
        // HIGH event frequency = too many events per second (weight: 0.15)
        // Normal human scrolling is 10-50 events/sec
        // > 100 events/sec suggests automation or scripted rapid scrolling
        if (eventsPerSecond > 100) suspiciousScore += 0.15;
        
        // Check for automation timing patterns in scroll events
        const hasSubMillisecondPattern = this._detectSubMillisecondPattern(scrolls);
        if (hasSubMillisecondPattern) suspiciousScore += 0.1;
        
        const confidence = Math.min(scrolls.length / this.options.minSamples.scroll, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: scrolls.length,
                deltaVariance: deltaVariance,
                intervalVariance: intervalVariance,
                uniqueDeltaRatio: uniqueDeltaRatio,
                eventsPerSecond: eventsPerSecond
            },
            // Detailed scoring breakdown for calibration
            scoringBreakdown: {
                lowDeltaVariance: { triggered: deltaVariance < 1, weight: 0.2, value: deltaVariance, threshold: 1 },
                lowIntervalVariance: { triggered: intervalVariance < 10, weight: 0.2, value: intervalVariance, threshold: 10 },
                lowUniqueDeltaRatio: { triggered: uniqueDeltaRatio < 0.3, weight: 0.2, value: uniqueDeltaRatio, threshold: 0.3 },
                highDeltaVariance: { triggered: deltaVariance > 3000, weight: 0.15, value: deltaVariance, threshold: 3000 },
                highEventFrequency: { triggered: eventsPerSecond > 100, weight: 0.15, value: eventsPerSecond, threshold: 100 },
                subMillisecondPattern: { triggered: hasSubMillisecondPattern, weight: 0.1, value: hasSubMillisecondPattern }
            }
        };
    }
    
    _analyzeTouch() {
        if (this.data.touch.length < 2) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const touches = this.data.touch;
        let forces = [];
        let radii = [];
        let intervals = [];
        let untrustedCount = 0;
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            
            if (touch.force !== undefined && touch.force > 0) {
                forces.push(touch.force);
            }
            
            if (touch.radiusX !== undefined && touch.radiusX > 0) {
                radii.push(touch.radiusX);
            }
            
            if (!touch.isTrusted) {
                untrustedCount++;
            }
            
            // Calculate intervals between touch events
            if (i > 0 && touches[i].timestamp && touches[i - 1].timestamp) {
                intervals.push(touches[i].timestamp - touches[i - 1].timestamp);
            }
        }
        
        const forceVariance = this._calculateVariance(forces);
        const radiusVariance = this._calculateVariance(radii);
        const untrustedRatio = untrustedCount / touches.length;
        
        // Calculate event frequency (events per second)
        const totalDuration = touches.length > 1 && touches[touches.length - 1].timestamp && touches[0].timestamp
            ? (touches[touches.length - 1].timestamp - touches[0].timestamp) / 1000 
            : 1;
        const eventsPerSecond = touches.length / Math.max(totalDuration, 0.001);
        
        // Suspicious indicators:
        // - Very low force variance (unrealistic - bots have no force variation)
        // - Very low radius variance (unrealistic)
        // - High untrusted event ratio
        // - EXTREMELY HIGH force variance (unnaturally erratic)
        // - HIGH event frequency (too many touch events per second)
        let suspiciousScore = 0;
        
        // Low variance = bot-like patterns (weights: 0.2 each)
        if (forces.length > 0 && forceVariance < 0.001) suspiciousScore += 0.2;
        if (radii.length > 0 && radiusVariance < 0.1) suspiciousScore += 0.2;
        
        // Untrusted events (weight: 0.2)
        if (untrustedRatio > 0.1) suspiciousScore += 0.2;
        
        // EXTREMELY HIGH force variance = unnaturally erratic (weight: 0.2)
        // Normal human touch force variance is typically 0.01-0.1
        // Variance > 0.15 suggests artificially erratic behavior
        if (forces.length > 0 && forceVariance > 0.15) suspiciousScore += 0.2;
        
        // HIGH event frequency = too many events per second (weight: 0.2)
        // Normal human touch is 5-30 events/sec
        // > 50 events/sec suggests automation or scripted rapid touching
        if (eventsPerSecond > 50) suspiciousScore += 0.2;
        
        const confidence = Math.min(touches.length / this.options.minSamples.touch, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: touches.length,
                forceVariance: forceVariance,
                radiusVariance: radiusVariance,
                untrustedRatio: untrustedRatio,
                eventsPerSecond: eventsPerSecond
            },
            // Detailed scoring breakdown for calibration
            scoringBreakdown: {
                lowForceVariance: { triggered: forces.length > 0 && forceVariance < 0.001, weight: 0.2, value: forceVariance, threshold: 0.001 },
                lowRadiusVariance: { triggered: radii.length > 0 && radiusVariance < 1, weight: 0.2, value: radiusVariance, threshold: 1 },
                highUntrustedRatio: { triggered: untrustedRatio > 0.1, weight: 0.3, value: untrustedRatio, threshold: 0.1 },
                highForceVariance: { triggered: forces.length > 0 && forceVariance > 0.15, weight: 0.2, value: forceVariance, threshold: 0.15 },
                highEventFrequency: { triggered: eventsPerSecond > 50, weight: 0.2, value: eventsPerSecond, threshold: 50 }
            }
        };
    }
    
    _analyzeEvents() {
        if (this.data.events.length < 2) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const events = this.data.events;
        let intervals = [];
        let untrustedCount = 0;
        
        for (let i = 1; i < events.length; i++) {
            const interval = events[i].timestamp - events[i - 1].timestamp;
            intervals.push(interval);
        }
        
        for (let i = 0; i < events.length; i++) {
            if (!events[i].isTrusted) {
                untrustedCount++;
            }
        }
        
        const intervalVariance = this._calculateVariance(intervals);
        const untrustedRatio = untrustedCount / events.length;
        
        // Suspicious indicators:
        // - Very low interval variance (too regular)
        // - High untrusted event ratio
        let suspiciousScore = 0;
        
        if (intervalVariance < 100) suspiciousScore += 0.4;
        if (untrustedRatio > 0.1) suspiciousScore += 0.6;
        
        const confidence = Math.min(events.length / this.options.minSamples.events, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: events.length,
                intervalVariance: intervalVariance,
                untrustedRatio: untrustedRatio
            },
            // Detailed scoring breakdown for calibration
            scoringBreakdown: {
                lowIntervalVariance: { triggered: intervalVariance < 100, weight: 0.4, value: intervalVariance, threshold: 100 },
                highUntrustedRatio: { triggered: untrustedRatio > 0.1, weight: 0.6, value: untrustedRatio, threshold: 0.1 }
            }
        };
    }
    
    _analyzeSensors() {
        if (this.data.sensors.length === 0) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const sensors = this.data.sensors;
        let xValues = [];
        let yValues = [];
        let zValues = [];
        
        for (let i = 0; i < sensors.length; i++) {
            const sensor = sensors[i];
            if (sensor.x !== undefined) xValues.push(sensor.x);
            if (sensor.y !== undefined) yValues.push(sensor.y);
            if (sensor.z !== undefined) zValues.push(sensor.z);
        }
        
        const xVariance = this._calculateVariance(xValues);
        const yVariance = this._calculateVariance(yValues);
        const zVariance = this._calculateVariance(zValues);
        
        // Real sensors have noise; perfectly stable readings are suspicious
        let suspiciousScore = 0;
        
        if (xValues.length > 0 && xVariance < 0.0001) suspiciousScore += 0.33;
        if (yValues.length > 0 && yVariance < 0.0001) suspiciousScore += 0.33;
        if (zValues.length > 0 && zVariance < 0.0001) suspiciousScore += 0.34;
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: 0.5, // Lower confidence for sensor data
            metrics: {
                sampleCount: sensors.length,
                xVariance: xVariance,
                yVariance: yVariance,
                zVariance: zVariance
            }
        };
    }
    
    _calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        
        return variance;
    }
    
    /**
     * Detect sub-millisecond timing patterns that suggest automation
     * Bots often produce events with unnaturally precise timing intervals
     * @param {Array} events - Array of events with timestamp property
     * @returns {boolean} True if suspicious pattern detected
     */
    _detectSubMillisecondPattern(events) {
        if (events.length < 10) return false;
        
        // Check if timing intervals follow a suspiciously regular pattern
        const intervals = [];
        for (let i = 1; i < events.length; i++) {
            intervals.push(events[i].timestamp - events[i - 1].timestamp);
        }
        
        // Count intervals that are exact multiples of common automation delays
        // (e.g., exactly 10ms, 20ms, 50ms intervals suggest setInterval/setTimeout usage)
        let suspiciousIntervals = 0;
        const commonBotIntervals = [10, 16, 20, 33, 50, 100];
        
        for (const interval of intervals) {
            for (const botInterval of commonBotIntervals) {
                // Check if the interval is a near-exact multiple of a common bot interval
                // Allowing 1ms tolerance
                const remainder = interval % botInterval;
                if (remainder <= 1 || remainder >= botInterval - 1) {
                    suspiciousIntervals++;
                    break;
                }
            }
        }
        
        // If more than 70% of intervals match bot patterns, flag as suspicious
        return (suspiciousIntervals / intervals.length) > 0.7;
    }
    
    /**
     * Detect Bezier curve patterns in mouse movements
     * Bots using Bezier curves for movement produce unnaturally smooth paths
     * that lack the micro-tremor and correction of real human movement
     * @param {Array} movements - Array of mouse movements
     * @returns {boolean} True if Bezier pattern detected
     */
    _detectBezierPattern(movements) {
        if (movements.length < 10) return false;
        
        // Calculate second derivatives (acceleration of direction)
        // Real human movement has high-frequency noise/tremor
        // Bezier curves are mathematically smooth with low-frequency changes
        const curvatures = [];
        for (let i = 2; i < movements.length; i++) {
            const p0 = movements[i - 2];
            const p1 = movements[i - 1];
            const p2 = movements[i];
            
            // First derivatives (velocity)
            const v1x = p1.x - p0.x;
            const v1y = p1.y - p0.y;
            const v2x = p2.x - p1.x;
            const v2y = p2.y - p1.y;
            
            // Second derivatives (acceleration)
            const ax = v2x - v1x;
            const ay = v2y - v1y;
            
            // Curvature approximation
            const curvature = Math.sqrt(ax * ax + ay * ay);
            curvatures.push(curvature);
        }
        
        if (curvatures.length < 5) return false;
        
        // Bezier curves have very consistent curvature changes
        // Human movement has erratic curvature with micro-corrections
        const curvatureVariance = this._calculateVariance(curvatures);
        const meanCurvature = curvatures.reduce((a, b) => a + b, 0) / curvatures.length;
        
        // Coefficient of variation (normalized variance)
        const cv = meanCurvature > 0 ? Math.sqrt(curvatureVariance) / meanCurvature : 0;
        
        // Low CV suggests smooth Bezier-like movement
        // Human movement typically has CV > 1.0 due to tremor
        return cv < 0.5;
    }
    
    /**
     * Analyze pointer pressure variation
     * Real humans have varying pressure when moving the mouse/touchpad
     * Bots typically have null, 0, or constant pressure values
     * @param {Array} movements - Array of mouse movements
     * @returns {Object} Analysis result with suspicious flag
     */
    _analyzePointerPressure(movements) {
        const pressures = movements
            .filter(m => m.pressure !== null && m.pressure !== undefined)
            .map(m => m.pressure);
        
        if (pressures.length < 5) {
            // No pressure data available - common for bots using basic mouse events
            // If we have many movements but no pressure, that's suspicious
            return { suspicious: movements.length > 20 };
        }
        
        const variance = this._calculateVariance(pressures);
        const uniquePressures = new Set(pressures);
        
        // Suspicious if:
        // - All pressure values are the same (variance near 0)
        // - Very few unique pressure values relative to sample count
        const uniqueRatio = uniquePressures.size / pressures.length;
        
        return {
            suspicious: variance < 0.0001 || uniqueRatio < 0.1,
            variance,
            uniqueRatio
        };
    }
    
    /**
     * Analyze event timestamp entropy
     * Bots generate events with low entropy (predictable) timing patterns
     * Humans have high entropy (unpredictable) timing
     * @param {Array} events - Array of events with timestamp property
     * @returns {Object} Analysis result with suspicious flag
     */
    _analyzeTimestampEntropy(events) {
        if (events.length < 10) {
            return { suspicious: false, entropy: 0 };
        }
        
        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < events.length; i++) {
            intervals.push(events[i].timestamp - events[i - 1].timestamp);
        }
        
        // Bucket intervals into bins (0-10ms, 10-20ms, 20-30ms, etc.)
        const buckets = {};
        const bucketSize = 10;
        
        for (const interval of intervals) {
            const bucket = Math.floor(interval / bucketSize) * bucketSize;
            buckets[bucket] = (buckets[bucket] || 0) + 1;
        }
        
        // Calculate Shannon entropy
        let entropy = 0;
        const total = intervals.length;
        
        for (const count of Object.values(buckets)) {
            if (count > 0) {
                const p = count / total;
                entropy -= p * Math.log2(p);
            }
        }
        
        // Normalize entropy (max entropy for n buckets is log2(n))
        const maxEntropy = Math.log2(Object.keys(buckets).length || 1);
        const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
        
        // Low entropy (< 0.5) suggests predictable, bot-like timing
        return {
            suspicious: normalizedEntropy < 0.5,
            entropy: normalizedEntropy
        };
    }
    
    /**
     * Analyze pointer device fingerprint for mismatches
     * Bots may have inconsistent or missing pointer event properties
     * Real pointer devices have consistent characteristics
     * @param {Array} movements - Array of mouse movements with pointer properties
     * @returns {Object} Analysis result with suspicious flag
     */
    _analyzePointerFingerprint(movements) {
        if (movements.length < 5) {
            return { suspicious: false };
        }
        
        // Check for consistent pointer type
        const pointerTypes = movements.map(m => m.pointerType).filter(p => p != null);
        const uniquePointerTypes = new Set(pointerTypes);
        
        // Check for presence of pointer properties
        const hasWidth = movements.some(m => m.width !== null && m.width !== undefined);
        const hasHeight = movements.some(m => m.height !== null && m.height !== undefined);
        const hasTilt = movements.some(m => m.tiltX !== null || m.tiltY !== null);
        const hasPressure = movements.some(m => m.pressure !== null && m.pressure !== undefined);
        
        // Suspicious indicators:
        // 1. Inconsistent pointer types (switching between mouse/pen/touch unexpectedly)
        // 2. Missing all advanced pointer properties (width, height, tilt, pressure)
        //    when events claim to be from a pointer device
        
        const hasAdvancedProperties = hasWidth || hasHeight || hasTilt || hasPressure;
        
        // If we have a modern browser but no advanced pointer properties, likely automation
        const missingExpectedProperties = movements.length > 20 && !hasAdvancedProperties;
        
        // Switching pointer types mid-session is suspicious
        const inconsistentPointerType = uniquePointerTypes.size > 1;
        
        return {
            suspicious: missingExpectedProperties || inconsistentPointerType,
            missingExpectedProperties,
            inconsistentPointerType,
            hasAdvancedProperties
        };
    }
    
    /**
     * Analyze WebGL rendering timing for bot detection
     * Bots often have unnaturally fast or slow WebGL operations
     * @returns {Object} Analysis result with score and confidence
     */
    _analyzeWebGLTiming() {
        if (!this.data.webglTiming) {
            return { available: false, score: 0, confidence: 0 };
        }
        
        const timing = this.data.webglTiming;
        let suspiciousScore = 0;
        
        // Suspicious indicators:
        // 1. Extremely fast compilation (< 0.1ms) - suggests cached/mocked WebGL
        // 2. Extremely slow compilation (> 100ms) - suggests software rendering/virtualization
        // 3. Exact round-number timing (suggests synthetic timing)
        
        if (timing.compilationTime < 0.1) {
            suspiciousScore += 0.5; // Suspiciously fast
        } else if (timing.compilationTime > 100) {
            suspiciousScore += 0.3; // Suspiciously slow
        }
        
        // Check for round-number timing (e.g., exactly 1.000ms, 2.000ms)
        const fractionalPart = timing.compilationTime % 1;
        if (fractionalPart === 0 || (fractionalPart > 0.999 || fractionalPart < 0.001)) {
            suspiciousScore += 0.2; // Too precise
        }
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: 0.6, // Moderate confidence for WebGL timing
            metrics: {
                compilationTime: timing.compilationTime
            }
        };
    }
    
    _calculateOverallScore(analysis) {
        const W = this.weights;
        const S = W.SAFEGUARDS;
        const CW = W.CHANNEL_WEIGHTS;
        
        // Define channel groups for independence checking
        const inputChannels = [
            { name: 'mouse', result: analysis.mouse, weight: CW.mouse, isSensor: false, isWebgl: false },
            { name: 'keyboard', result: analysis.keyboard, weight: CW.keyboard, isSensor: false, isWebgl: false },
            { name: 'scroll', result: analysis.scroll, weight: CW.scroll, isSensor: false, isWebgl: false },
            { name: 'touch', result: analysis.touch, weight: CW.touch, isSensor: false, isWebgl: false },
            { name: 'events', result: analysis.events, weight: CW.events, isSensor: false, isWebgl: false }
        ];
        const sensorChannel = { name: 'sensors', result: analysis.sensors, weight: CW.sensors, isSensor: true, isWebgl: false };
        const webglChannel = { name: 'webglTiming', result: analysis.webglTiming, weight: CW.webglTiming, isSensor: false, isWebgl: true };
        
        const allChannels = [...inputChannels, sensorChannel, webglChannel];
        
        // SAFEGUARD 2: Minimum confidence gate - skip channels with confidence < threshold
        const confidentChannels = allChannels.filter(ch => 
            ch.result && ch.result.available && ch.result.confidence >= S.minConfidenceGate
        );
        
        // SAFEGUARD 1: Count suspicious channels (score >= threshold) for multi-channel corroboration
        const suspiciousInputChannels = confidentChannels.filter(ch => 
            !ch.isSensor && !ch.isWebgl && ch.result.score >= S.suspiciousChannelThreshold
        );
        const suspiciousCount = suspiciousInputChannels.length;
        
        // SAFEGUARD 7: Sensors only contribute if another non-sensor channel is suspicious
        const hasNonSensorSuspicion = suspiciousInputChannels.length > 0;
        
        let totalScore = 0;
        let totalWeight = 0;
        let totalConfidence = 0;
        let availableChecks = 0;
        
        for (const ch of confidentChannels) {
            // SAFEGUARD 7: Skip sensors if no other channel is suspicious
            if (ch.isSensor && !hasNonSensorSuspicion) {
                continue;
            }
            
            // SAFEGUARD 8: WebGL timing can add suspicion but never be decisive
            // If webgl is the only suspicious channel, downweight it significantly
            if (ch.isWebgl && suspiciousCount === 0 && ch.result.score >= S.suspiciousChannelThreshold) {
                // WebGL alone cannot trigger bot - cap its contribution
                const cappedScore = Math.min(ch.result.score, S.maxChannelContribution);
                const contribution = cappedScore * ch.result.confidence * ch.weight;
                // SAFEGUARD 4: Cap per-channel contribution
                const maxContribution = S.maxChannelContribution * ch.weight;
                totalScore += Math.min(contribution, maxContribution);
                totalWeight += ch.result.confidence * ch.weight;
                totalConfidence += ch.result.confidence;
                availableChecks++;
                continue;
            }
            
            const contribution = ch.result.score * ch.result.confidence * ch.weight;
            // SAFEGUARD 4: Cap per-channel contribution to maxChannelContribution of total weight
            const maxContribution = S.maxChannelContribution * ch.weight * ch.result.score;
            totalScore += Math.min(contribution, maxContribution * ch.result.confidence);
            totalWeight += ch.result.confidence * ch.weight;
            totalConfidence += ch.result.confidence;
            availableChecks++;
        }
        
        let score = totalWeight > 0 ? totalScore / totalWeight : 0;
        const confidence = availableChecks > 0 ? totalConfidence / availableChecks : 0;
        
        // SAFEGUARD 1: Multi-channel corroboration - downscale if < minSuspiciousChannels
        if (suspiciousCount < S.minSuspiciousChannels && score >= S.botThreshold) {
            score *= S.singleChannelDownscale;
        }
        
        // SAFEGUARD 5: Time accumulation before escalation
        const sessionDuration = this._getSessionDuration();
        if (sessionDuration < S.minSessionDurationZero) {
            // Sessions < 5s: force score = 0
            score = 0;
        } else if (sessionDuration < S.minSessionDurationCap) {
            // Sessions < 10s: cap score at shortSessionScoreCap
            score = Math.min(score, S.shortSessionScoreCap);
        }
        
        return { score, confidence };
    }
    
    /**
     * Get session duration in milliseconds
     */
    _getSessionDuration() {
        if (!this.startTime) {
            return 0;
        }
        return Date.now() - this.startTime;
    }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeadlessBehaviorMonitor;
}

if (typeof window !== 'undefined') {
    window.HeadlessBehaviorMonitor = HeadlessBehaviorMonitor;
}
