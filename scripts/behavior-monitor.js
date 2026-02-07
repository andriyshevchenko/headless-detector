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
        highUntrustedRatio: 0.1,
        highInterKeyVariance: 5000000
    },
    KEYBOARD_WEIGHTS: {
        lowHoldTimeVariance: 0.3,
        lowInterKeyVariance: 0.3,
        highUntrustedRatio: 0.4,
        highInterKeyVariance: 0.30
    },
    SCROLL_THRESHOLDS: {
        lowDeltaVariance: 1,
        lowIntervalVariance: 10,
        lowUniqueDeltaRatio: 0.3,
        highDeltaVariance: 3000,
        highEventsPerSecond: 100,
        highIntervalVariance: 1000000
    },
    SCROLL_WEIGHTS: {
        lowDeltaVariance: 0.2,
        lowIntervalVariance: 0.2,
        lowUniqueDeltaRatio: 0.2,
        highDeltaVariance: 0.15,
        highEventsPerSecond: 0.15,
        subMillisecondPattern: 0.1,
        highIntervalVariance: 0.20
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
        botThreshold: 0.40,
        suspiciousThreshold: 0.25,
        likelyHumanThreshold: 0.12,
        minSamplesForVariance: 10,
        sophisticationMouseThreshold: 0.40,
        sophisticationDiscount: 0.60
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
            SOPHISTICATION_THRESHOLDS: { ...(DEFAULT_WEIGHTS.SOPHISTICATION_THRESHOLDS || {}), ...(window.BehaviorMonitorWeights.SOPHISTICATION_THRESHOLDS || {}) },
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
            onSample: options.onSample || null,
            
            // Persistence: store telemetry in sessionStorage across page refreshes
            persist: options.persist === true,
            storageKey: options.storageKey || 'hbm_data'
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
        
        // Persistence state
        this._saveTimerId = null;
        this._beforeUnloadHandler = null;
        
        // Restore persisted data if enabled
        if (this.options.persist) {
            this._loadFromStorage();
        }
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
        // Preserve earlier startTime restored from persistence
        if (!this.startTime) {
            this.startTime = Date.now();
        }
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
        
        // Attach beforeunload handler for persistence
        if (this.options.persist && typeof window !== 'undefined') {
            this._beforeUnloadHandler = () => this._saveToStorage();
            window.addEventListener('beforeunload', this._beforeUnloadHandler);
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
        
        // Save and clean up persistence
        if (this.options.persist) {
            if (this._saveTimerId) {
                clearTimeout(this._saveTimerId);
                this._saveTimerId = null;
            }
            this._saveToStorage();
            if (typeof window !== 'undefined' && this._beforeUnloadHandler) {
                window.removeEventListener('beforeunload', this._beforeUnloadHandler);
                this._beforeUnloadHandler = null;
            }
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
        analysis.classification = this._classify(scoreData.score);
        
        return analysis;
    }
    
    /**
     * Classify a score into one of 4 detection categories.
     * 
     * Categories map to bot implementation cost tiers:
     * - BOT (≥0.40): Trivial/cheap bots that are easy to build and maintain
     * - SUSPICIOUS (0.25-0.40): Budget/moderate bots requiring some investment
     * - LIKELY_HUMAN (0.12-0.25): Expensive bots requiring days of development
     * - VERIFIED_HUMAN (≤0.12): Expert-level bots requiring weeks of research
     * 
     * @param {number} score - Overall behavior score (0-1)
     * @returns {Object} Classification with verdict, label, and description
     * @private
     */
    _classify(score) {
        const S = this.weights.SAFEGUARDS || {};
        const botThreshold = S.botThreshold ?? 0.40;
        const suspiciousThreshold = S.suspiciousThreshold ?? 0.25;
        const likelyHumanThreshold = S.likelyHumanThreshold ?? 0.12;
        
        // Thresholds must be in descending order for correct classification
        if (botThreshold <= suspiciousThreshold || suspiciousThreshold <= likelyHumanThreshold) {
            return { verdict: 'ERROR', label: '❓ ERROR', description: 'Invalid classification thresholds' };
        }
        
        if (score >= botThreshold) {
            return { verdict: 'BOT', label: '🤖 BOT', description: 'Automated behavior detected' };
        } else if (score >= suspiciousThreshold) {
            return { verdict: 'SUSPICIOUS', label: '⚠️ SUSPICIOUS', description: 'Suspicious patterns detected' };
        } else if (score >= likelyHumanThreshold) {
            return { verdict: 'LIKELY_HUMAN', label: '👤 LIKELY_HUMAN', description: 'Likely human with some anomalies' };
        } else {
            return { verdict: 'VERIFIED_HUMAN', label: '✅ VERIFIED_HUMAN', description: 'Behavior consistent with human' };
        }
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
                verdict: results.classification.verdict,
                label: results.classification.label,
                description: results.classification.description,
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
        this._scheduleSave();
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
        this._scheduleSave();
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
        this._scheduleSave();
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
        this._scheduleSave();
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
        this._scheduleSave();
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
        this._scheduleSave();
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
    
    /**
     * Save telemetry data to sessionStorage.
     * Called on stop(), beforeunload, and periodically during collection.
     * @private
     */
    _saveToStorage() {
        if (typeof sessionStorage === 'undefined') return;
        
        try {
            const payload = JSON.stringify({
                data: this.data,
                startTime: this.startTime
            });
            sessionStorage.setItem(this.options.storageKey, payload);
        } catch (e) {
            // Quota exceeded or other storage errors - silently ignore
        }
    }
    
    /**
     * Load persisted telemetry data from sessionStorage.
     * Merges stored data arrays with current (empty) data.
     * @private
     */
    _loadFromStorage() {
        if (typeof sessionStorage === 'undefined') return;
        
        try {
            const raw = sessionStorage.getItem(this.options.storageKey);
            if (!raw) return;
            
            const stored = JSON.parse(raw);
            if (!stored || !stored.data) return;
            
            // Restore data arrays
            const channels = ['mouse', 'keyboard', 'scroll', 'touch', 'events', 'sensors'];
            for (const ch of channels) {
                if (Array.isArray(stored.data[ch]) && stored.data[ch].length > 0) {
                    this.data[ch] = stored.data[ch];
                }
            }
            
            // Restore webglTiming if not already set
            if (stored.data.webglTiming && !this.data.webglTiming) {
                this.data.webglTiming = stored.data.webglTiming;
            }
            
            // Use persisted startTime if valid (not in the future)
            if (stored.startTime && stored.startTime <= Date.now()) {
                this.startTime = stored.startTime;
            }
        } catch (e) {
            // Corrupted data or parse error - silently ignore
        }
    }
    
    /**
     * Schedule a debounced save to sessionStorage.
     * Batches rapid events into a single write every 1 second.
     * @private
     */
    _scheduleSave() {
        if (!this.options.persist || this._saveTimerId) return;
        
        this._saveTimerId = setTimeout(() => {
            this._saveTimerId = null;
            this._saveToStorage();
        }, 1000);
    }
    
    /**
     * Clear persisted telemetry data from sessionStorage.
     * Call this when starting a fresh detection session.
     */
    clearStorage() {
        if (typeof sessionStorage === 'undefined') return;
        
        try {
            sessionStorage.removeItem(this.options.storageKey);
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
            // Count horizontal, vertical, or diagonal straight-line segments
            // A diagonal segment is detected by checking if it continues the same direction
            if (distance > 0.01) {
                if (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01) {
                    // Horizontal or vertical line
                    straightLineSegments++;
                } else if (i >= 2) {
                    // Check if this segment continues the same angle as the previous one
                    // (characteristic of page.mouse.move() which moves in straight lines)
                    const prevDx = prev.x - movements[i - 2].x;
                    const prevDy = prev.y - movements[i - 2].y;
                    const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
                    if (prevDist > 0.01) {
                        // Normalize both vectors
                        const currAngle = Math.atan2(dy, dx);
                        const prevAngle = Math.atan2(prevDy, prevDx);
                        const angleDiff = Math.abs(currAngle - prevAngle);
                        // If angle difference is very small, it's a straight diagonal line
                        if (angleDiff < 0.05 || angleDiff > Math.PI * 2 - 0.05) {
                            straightLineSegments++;
                        }
                    }
                }
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
            highStraightLineRatio: 0.55,    // Iteration 18 - #1 naive bot tell
            highUntrustedRatio: 0.30,       // Matches calibration-weights.js
            highMouseEfficiency: 0.15,
            lowTimingVariance: 0.45,        // Iteration 18 - key for fast naive bots
            constantTiming: 0.50,           // Iteration 18 - catches constant intervals at ANY speed
            periodicNoise: 0.00,            // DISABLED (iteration 19) - Bezier false positives
            subMillisecondPattern: 0.10,    // Matches calibration-weights.js
            lowAccelVariance: 0.10,         // Matches calibration-weights.js
            bezierPattern: 0.05,            // Matches calibration-weights.js
            pressureSuspicious: 0.05,       // Matches calibration-weights.js
            lowEntropy: 0.15,
            fingerprintSuspicious: 0.05     // Matches calibration-weights.js
        };
        const defaultSophisticationThresholds = {
            constantTimingCV: 0.15,         // Coefficient of variation threshold
            periodicNoiseAC: 0.5,           // Autocorrelation threshold
            naiveSignalMultiplier: 1.5      // Multiplier when multiple naive signals fire
        };
        const thresholds = (this.weights && this.weights.MOUSE_THRESHOLDS) || defaultThresholds;
        const weights = (this.weights && this.weights.MOUSE_WEIGHTS) || defaultWeights;
        const sophThresholds = (this.weights && this.weights.SOPHISTICATION_THRESHOLDS) || defaultSophisticationThresholds;
        
        // Track naive signals for multiplier
        let naiveSignalCount = 0;
        
        const lowVelocityTriggered = velocityVariance < thresholds.lowVelocityVariance && hasSufficientSamples &&
            (accelVariance < thresholds.lowAccelVariance || hasSubMillisecondPattern);
        if (lowVelocityTriggered) suspiciousScore += weights.lowVelocityVariance;
        
        // SAFEGUARD 6: angleVariance requires sufficient samples AND another signal
        const lowAngleTriggered = angleVariance < thresholds.lowAngleVariance && hasSufficientSamples && 
            (lowVelocityTriggered || straightLineRatio > thresholds.highStraightLineRatio);
        if (lowAngleTriggered) suspiciousScore += weights.lowAngleVariance;
        
        // straightLineRatio can stand alone with sufficient samples - MAJOR naive bot indicator
        const straightLineTriggered = straightLineRatio > thresholds.highStraightLineRatio && hasSufficientSamples;
        if (straightLineTriggered) {
            suspiciousScore += weights.highStraightLineRatio;
            naiveSignalCount++;  // Straight lines are a key naive signal
        }
        
        // Untrusted ratio is context-independent
        if (untrustedRatio > thresholds.highUntrustedRatio) suspiciousScore += weights.highUntrustedRatio;
        
        // SAFEGUARD 3: mouseEfficiency > 0.95 must ALSO require low angle variance AND low timing entropy
        const lowTimingVarianceTriggered = timingVariance < thresholds.lowTimingVariance && timingIntervals.length > 5;
        const highEfficiencyTriggered = mouseEfficiency > thresholds.highMouseEfficiency && angleVariance < 0.05 && lowTimingVarianceTriggered;
        if (highEfficiencyTriggered) suspiciousScore += weights.highMouseEfficiency;
        
        // SAFEGUARD 6: Very low timing variance requires sufficient samples
        if (lowTimingVarianceTriggered && hasSufficientSamples) {
            suspiciousScore += weights.lowTimingVariance;
            naiveSignalCount++;  // Low timing variance is a key naive signal
        }
        
        // NEW: Constant timing detection - catches robot-slow's 500ms fixed intervals
        const constantTimingAnalysis = this._detectConstantTiming(movements);
        const constantTimingTriggered = constantTimingAnalysis.constantTiming && hasSufficientSamples;
        if (constantTimingTriggered) {
            suspiciousScore += weights.constantTiming ?? 0.40;
            naiveSignalCount++;  // Constant timing is a key naive signal
        }
        
        // NEW: Periodic noise detection - catches stealth-bot's Math.sin patterns
        const periodicNoiseAnalysis = this._detectPeriodicNoise(movements);
        const periodicNoiseTriggered = periodicNoiseAnalysis.periodicNoise && hasSufficientSamples;
        if (periodicNoiseTriggered) {
            suspiciousScore += weights.periodicNoise ?? 0.25;
        }
        
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
        
        // NAIVE SIGNAL MULTIPLIER: When multiple naive signals fire together, boost the score
        // This creates the inverse-sophistication scoring: naive bots trigger multiple obvious signals
        if (naiveSignalCount >= 2) {
            const multiplier = sophThresholds.naiveSignalMultiplier || 1.5;
            suspiciousScore *= multiplier;
        }
        
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
                accelVariance: accelVariance,
                constantTimingCV: constantTimingAnalysis.coefficientOfVariation,
                periodicNoiseAC: periodicNoiseAnalysis.autocorrelation,
                naiveSignalCount: naiveSignalCount
            },
            // Detailed scoring breakdown for calibration (reflects multi-signal safeguards)
            scoringBreakdown: {
                lowVelocityVariance: { triggered: lowVelocityTriggered, weight: weights.lowVelocityVariance, value: velocityVariance, threshold: thresholds.lowVelocityVariance, requiresMultiSignal: true },
                lowAngleVariance: { triggered: lowAngleTriggered, weight: weights.lowAngleVariance, value: angleVariance, threshold: thresholds.lowAngleVariance, requiresMultiSignal: true },
                highStraightLineRatio: { triggered: straightLineTriggered, weight: weights.highStraightLineRatio, value: straightLineRatio, threshold: thresholds.highStraightLineRatio, isNaiveSignal: true },
                highUntrustedRatio: { triggered: untrustedRatio > thresholds.highUntrustedRatio, weight: weights.highUntrustedRatio, value: untrustedRatio, threshold: thresholds.highUntrustedRatio },
                highMouseEfficiency: { triggered: highEfficiencyTriggered, weight: weights.highMouseEfficiency, value: mouseEfficiency, threshold: thresholds.highMouseEfficiency, requiresMultiSignal: true },
                lowTimingVariance: { triggered: lowTimingVarianceTriggered && hasSufficientSamples, weight: weights.lowTimingVariance, value: timingVariance, threshold: thresholds.lowTimingVariance, isNaiveSignal: true },
                constantTiming: { triggered: constantTimingTriggered, weight: weights.constantTiming ?? 0.40, value: constantTimingAnalysis.coefficientOfVariation, threshold: sophThresholds.constantTimingCV, isNaiveSignal: true, meanInterval: constantTimingAnalysis.meanInterval },
                periodicNoise: { triggered: periodicNoiseTriggered, weight: weights.periodicNoise ?? 0.25, value: periodicNoiseAnalysis.autocorrelation, threshold: sophThresholds.periodicNoiseAC },
                subMillisecondPattern: { triggered: hasSubMillisecondPattern && hasSufficientSamples, weight: weights.subMillisecondPattern, value: hasSubMillisecondPattern },
                lowAccelVariance: { triggered: lowAccelTriggered, weight: weights.lowAccelVariance, value: accelVariance, threshold: thresholds.lowAccelVariance },
                bezierPattern: { triggered: hasBezierPattern && hasSufficientSamples, weight: weights.bezierPattern, value: hasBezierPattern },
                pressureSuspicious: { triggered: pressureAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern), weight: weights.pressureSuspicious, details: pressureAnalysis, requiresMultiSignal: true },
                lowEntropy: { triggered: entropyAnalysis.suspicious && hasSufficientSamples, weight: weights.lowEntropy, details: entropyAnalysis },
                fingerprintSuspicious: { triggered: fingerprintAnalysis.suspicious && (lowVelocityTriggered || hasBezierPattern), weight: weights.fingerprintSuspicious, details: fingerprintAnalysis, requiresMultiSignal: true },
                naiveSignalMultiplier: { applied: naiveSignalCount >= 2, naiveSignalCount: naiveSignalCount, multiplier: naiveSignalCount >= 2 ? (sophThresholds.naiveSignalMultiplier || 1.5) : 1 }
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
        
        // Use configurable thresholds and weights from calibration
        const kbThresholds = (this.weights && this.weights.KEYBOARD_THRESHOLDS) || {
            lowHoldTimeVariance: 10,
            lowInterKeyVariance: 100,
            highUntrustedRatio: 0.1,
            highInterKeyVariance: 5000000
        };
        const kbWeights = (this.weights && this.weights.KEYBOARD_WEIGHTS) || {
            lowHoldTimeVariance: 0.3,
            lowInterKeyVariance: 0.3,
            highUntrustedRatio: 0.4,
            highInterKeyVariance: 0.30
        };
        
        // Suspicious indicators:
        // - Very low hold time variance (too consistent)
        // - Very low inter-key time variance (robotic typing)
        // - High untrusted event ratio
        // - High inter-key variance indicates human-like reading pauses (REDUCES score)
        let suspiciousScore = 0;
        
        const lowHoldTimeTriggered = holdTimeVariance < kbThresholds.lowHoldTimeVariance;
        if (lowHoldTimeTriggered) suspiciousScore += kbWeights.lowHoldTimeVariance;
        
        const lowInterKeyTriggered = interKeyVariance < kbThresholds.lowInterKeyVariance;
        if (lowInterKeyTriggered) suspiciousScore += kbWeights.lowInterKeyVariance;
        
        if (untrustedRatio > kbThresholds.highUntrustedRatio) suspiciousScore += kbWeights.highUntrustedRatio;
        
        // Human-like inter-key variance: very high variance indicates reading/thinking pauses
        // This REDUCES the score because it's evidence of human-like behavior
        const highInterKeyThreshold = kbThresholds.highInterKeyVariance ?? 5000000;
        const highInterKeyWeight = kbWeights.highInterKeyVariance ?? 0.30;
        const highInterKeyTriggered = interKeyVariance > highInterKeyThreshold;
        if (highInterKeyTriggered) suspiciousScore -= highInterKeyWeight;
        
        // Clamp to [0, 1]: human-like signals (highInterKeyVariance) can push score negative
        suspiciousScore = Math.max(suspiciousScore, 0);
        
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
                lowHoldTimeVariance: { triggered: lowHoldTimeTriggered, weight: kbWeights.lowHoldTimeVariance, value: holdTimeVariance, threshold: kbThresholds.lowHoldTimeVariance },
                lowInterKeyVariance: { triggered: lowInterKeyTriggered, weight: kbWeights.lowInterKeyVariance, value: interKeyVariance, threshold: kbThresholds.lowInterKeyVariance },
                highUntrustedRatio: { triggered: untrustedRatio > kbThresholds.highUntrustedRatio, weight: kbWeights.highUntrustedRatio, value: untrustedRatio, threshold: kbThresholds.highUntrustedRatio },
                highInterKeyVariance: { triggered: highInterKeyTriggered, weight: highInterKeyWeight, value: interKeyVariance, threshold: highInterKeyThreshold, isNegative: true }
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
        
        // Use configurable thresholds and weights from calibration
        const scThresholds = (this.weights && this.weights.SCROLL_THRESHOLDS) || {
            lowDeltaVariance: 1,
            lowIntervalVariance: 10,
            lowUniqueDeltaRatio: 0.3,
            highDeltaVariance: 3000,
            highEventsPerSecond: 100,
            highIntervalVariance: 1000000
        };
        const scWeights = (this.weights && this.weights.SCROLL_WEIGHTS) || {
            lowDeltaVariance: 0.2,
            lowIntervalVariance: 0.2,
            lowUniqueDeltaRatio: 0.2,
            highDeltaVariance: 0.15,
            highEventsPerSecond: 0.15,
            subMillisecondPattern: 0.1,
            highIntervalVariance: 0.20
        };
        
        // Suspicious indicators:
        // - Very low delta variance (always same scroll amount)
        // - Very low interval variance (perfectly timed)
        // - Low unique delta ratio (repetitive pattern)
        // - Bot timing pattern detection
        // - EXTREMELY HIGH delta variance (unnaturally erratic)
        // - HIGH event frequency (too many events per second)
        // - HIGH interval variance indicates human-like reading pauses (REDUCES score)
        let suspiciousScore = 0;
        
        // Low variance = bot-like repetitive patterns
        if (deltaVariance < scThresholds.lowDeltaVariance) suspiciousScore += scWeights.lowDeltaVariance;
        if (intervalVariance < scThresholds.lowIntervalVariance) suspiciousScore += scWeights.lowIntervalVariance;
        if (uniqueDeltaRatio < scThresholds.lowUniqueDeltaRatio) suspiciousScore += scWeights.lowUniqueDeltaRatio;
        
        // EXTREMELY HIGH variance = unnaturally erratic
        // Normal human scroll variance is typically 100-1000
        // Variance > 3000 suggests artificially erratic behavior
        if (deltaVariance > scThresholds.highDeltaVariance) suspiciousScore += scWeights.highDeltaVariance;
        
        // HIGH event frequency = too many events per second
        // Normal human scrolling is 10-50 events/sec
        // > 100 events/sec suggests automation or scripted rapid scrolling
        if (eventsPerSecond > scThresholds.highEventsPerSecond) suspiciousScore += scWeights.highEventsPerSecond;
        
        // Check for automation timing patterns in scroll events
        const hasSubMillisecondPattern = this._detectSubMillisecondPattern(scrolls);
        if (hasSubMillisecondPattern) suspiciousScore += scWeights.subMillisecondPattern;
        
        // Human-like interval variance: very high variance indicates reading/thinking pauses
        // This REDUCES the score because it's evidence of human-like behavior
        const highIntervalThreshold = scThresholds.highIntervalVariance ?? 1000000;
        const highIntervalWeight = scWeights.highIntervalVariance ?? 0.20;
        const highIntervalTriggered = intervalVariance > highIntervalThreshold;
        if (highIntervalTriggered) suspiciousScore -= highIntervalWeight;
        
        // Clamp to [0, 1]: human-like signals (highIntervalVariance) can push score negative
        suspiciousScore = Math.max(suspiciousScore, 0);
        
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
                lowDeltaVariance: { triggered: deltaVariance < scThresholds.lowDeltaVariance, weight: scWeights.lowDeltaVariance, value: deltaVariance, threshold: scThresholds.lowDeltaVariance },
                lowIntervalVariance: { triggered: intervalVariance < scThresholds.lowIntervalVariance, weight: scWeights.lowIntervalVariance, value: intervalVariance, threshold: scThresholds.lowIntervalVariance },
                lowUniqueDeltaRatio: { triggered: uniqueDeltaRatio < scThresholds.lowUniqueDeltaRatio, weight: scWeights.lowUniqueDeltaRatio, value: uniqueDeltaRatio, threshold: scThresholds.lowUniqueDeltaRatio },
                highDeltaVariance: { triggered: deltaVariance > scThresholds.highDeltaVariance, weight: scWeights.highDeltaVariance, value: deltaVariance, threshold: scThresholds.highDeltaVariance },
                highEventFrequency: { triggered: eventsPerSecond > scThresholds.highEventsPerSecond, weight: scWeights.highEventsPerSecond, value: eventsPerSecond, threshold: scThresholds.highEventsPerSecond },
                subMillisecondPattern: { triggered: hasSubMillisecondPattern, weight: scWeights.subMillisecondPattern, value: hasSubMillisecondPattern },
                highIntervalVariance: { triggered: highIntervalTriggered, weight: highIntervalWeight, value: intervalVariance, threshold: highIntervalThreshold, isNegative: true }
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
     * Detect constant timing patterns regardless of interval length
     * Naive bots use fixed intervals (e.g., 100ms, 500ms) which have very low coefficient of variation
     * This catches robot-slow (500ms) that bypasses the lowTimingVariance check (50ms threshold)
     * @param {Array} events - Array of events with timestamp property
     * @returns {Object} Analysis result with constantTiming flag and coefficient of variation
     */
    _detectConstantTiming(events) {
        if (events.length < 10) {
            return { constantTiming: false, coefficientOfVariation: 1 };
        }
        
        const intervals = [];
        for (let i = 1; i < events.length; i++) {
            const interval = events[i].timestamp - events[i - 1].timestamp;
            if (interval > 0) {  // Ignore zero intervals
                intervals.push(interval);
            }
        }
        
        if (intervals.length < 5) {
            return { constantTiming: false, coefficientOfVariation: 1 };
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = this._calculateVariance(intervals);
        const stdDev = Math.sqrt(variance);
        
        // Coefficient of Variation (CV) = stdDev / mean
        // CV < 0.15 means very constant timing (regardless of interval length)
        // Human timing typically has CV > 0.3-0.5
        const cv = mean > 0 ? stdDev / mean : 0;
        
        return {
            constantTiming: cv < 0.15,  // Very low CV = constant timing
            coefficientOfVariation: cv,
            meanInterval: mean
        };
    }
    
    /**
     * Detect periodic (sinusoidal) noise patterns
     * Stealth bots use Math.sin() for noise which creates detectable periodicity
     * Real human noise is chaotic and aperiodic
     * @param {Array} movements - Array of mouse movements
     * @returns {Object} Analysis result with periodicNoise flag
     */
    _detectPeriodicNoise(movements) {
        if (movements.length < 20) {
            return { periodicNoise: false, autocorrelation: 0 };
        }
        
        // Extract residuals from linear trend (the "noise" component)
        const xValues = movements.map(m => m.x);
        const yValues = movements.map(m => m.y);
        
        // Calculate residuals from linear fit
        const xResiduals = this._calculateResiduals(xValues);
        const yResiduals = this._calculateResiduals(yValues);
        
        // Combine residuals
        const residuals = xResiduals.map((xr, i) => Math.sqrt(xr * xr + yResiduals[i] * yResiduals[i]));
        
        // Calculate autocorrelation at various lags (2 to maxLag)
        // Periodic signals have high autocorrelation at specific lags
        const maxLag = Math.min(20, Math.floor(residuals.length / 2));
        let maxAutocorrelation = 0;
        
        for (let lag = 2; lag <= maxLag; lag++) {
            const ac = this._autocorrelation(residuals, lag);
            if (ac > maxAutocorrelation) {
                maxAutocorrelation = ac;
            }
        }
        
        // High autocorrelation (> 0.5) within tested lag range suggests periodic pattern
        // Math.sin() patterns typically show AC > 0.7
        return {
            periodicNoise: maxAutocorrelation > 0.5,
            autocorrelation: maxAutocorrelation
        };
    }
    
    /**
     * Calculate residuals from linear regression
     * Uses index position as x-axis and values[i] as y-axis: value = m * index + b
     * @param {Array} values - Array of values to fit
     * @returns {Array} Residuals (difference between actual and predicted values)
     */
    _calculateResiduals(values) {
        const n = values.length;
        if (n < 2) return values.map(() => 0);
        
        // Linear regression: value = m * index + b
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }
        
        // Guard against division by zero (impossible with sequential indices, but safe)
        const denominator = n * sumX2 - sumX * sumX;
        if (Math.abs(denominator) < 1e-10) {
            return values.map(() => 0);
        }
        
        const m = (n * sumXY - sumX * sumY) / denominator;
        const b = (sumY - m * sumX) / n;
        
        // Calculate residuals
        return values.map((v, i) => v - (m * i + b));
    }
    
    /**
     * Calculate autocorrelation at a given lag
     */
    _autocorrelation(values, lag) {
        const n = values.length;
        if (lag >= n) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / n;
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n - lag; i++) {
            numerator += (values[i] - mean) * (values[i + lag] - mean);
        }
        
        for (let i = 0; i < n; i++) {
            denominator += (values[i] - mean) * (values[i] - mean);
        }
        
        return denominator > 0 ? numerator / denominator : 0;
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
            const maxContribution = S.maxChannelContribution * ch.weight;
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
        
        // SAFEGUARD 10: Multi-channel corroboration rescue
        // When 3+ input channels show signals but individual scores are moderate,
        // the combined evidence of bot activity across channels justifies a higher
        // overall score. This catches cheap interleaved bots whose per-channel
        // timing patterns are diluted by cross-channel action mixing.
        // Only applied when no Bezier pattern is detected (Bezier = more sophisticated bot).
        const mouseBreakdown = analysis.mouse && analysis.mouse.scoringBreakdown;
        const hasBezier = mouseBreakdown && mouseBreakdown.bezierPattern && mouseBreakdown.bezierPattern.triggered;
        const rescueThreshold = S.multiChannelRescueThreshold ?? 0.10;
        const rescueCap = S.multiChannelRescueCap ?? 0.42;
        const rescueBoost = S.multiChannelRescueBoost ?? 1.50;
        const rescueMinChannels = S.multiChannelRescueMinChannels ?? 3;
        const activeInputChannels = confidentChannels.filter(ch =>
            !ch.isSensor && !ch.isWebgl && ch.result.score >= rescueThreshold
        );
        if (activeInputChannels.length >= rescueMinChannels && score < rescueCap && !hasBezier) {
            score = Math.min(rescueCap, score * rescueBoost);
        }
        
        // SAFEGUARD 9: Sophistication-aware modulation
        // When BOTH keyboard AND scroll show human-like timing patterns (high variance)
        // AND mouse is not strongly flagged, this indicates a sophisticated bot that
        // leaks only through automation tool artifacts, not through behavioral patterns.
        // Apply a discount to reflect lower detection confidence.
        // Requires BOTH channels to show human-like patterns to avoid false discounts
        // on cheap interleaved bots where only one channel has high variance.
        const mouseScore = analysis.mouse && analysis.mouse.available ? analysis.mouse.score : 0;
        const kbBreakdown = analysis.keyboard && analysis.keyboard.scoringBreakdown;
        const scrollBreakdown = analysis.scroll && analysis.scroll.scoringBreakdown;
        const hasHumanKeyboard = kbBreakdown && kbBreakdown.highInterKeyVariance && kbBreakdown.highInterKeyVariance.triggered;
        const hasHumanScroll = scrollBreakdown && scrollBreakdown.highIntervalVariance && scrollBreakdown.highIntervalVariance.triggered;
        
        // Only apply discount when mouse isn't strongly detecting the bot
        // (if mouse score >= 0.40, the bot is detectable through mouse regardless of kb/scroll patterns)
        const sophisticationThreshold = S.sophisticationMouseThreshold ?? 0.40;
        const sophisticationDiscount = S.sophisticationDiscount ?? 0.60;
        if (mouseScore < sophisticationThreshold && (hasHumanKeyboard && hasHumanScroll)) {
            score *= sophisticationDiscount;
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
