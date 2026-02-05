/**
 * Headless Behavior Monitor
 * Monitors user interactions over time to detect bot-like behavioral patterns.
 * 
 * These checks are fundamentally harder to spoof than fingerprint checks because
 * they require genuine human interaction patterns accumulated over time.
 * 
 * @module HeadlessBehaviorMonitor
 * @version 2.0.0
 */

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
        
        if (velocityVariance < 0.0001) suspiciousScore += 0.25;
        if (angleVariance < 0.01) suspiciousScore += 0.15;
        if (straightLineRatio > 0.5) suspiciousScore += 0.25;
        if (untrustedRatio > 0.1) suspiciousScore += 0.2;
        // Bots tend to move very directly (efficiency close to 1.0)
        // Humans tend to have efficiency between 0.3-0.8
        if (mouseEfficiency > 0.95) suspiciousScore += 0.15;
        
        // Check for timing pattern uniformity (bots often have regular intervals)
        const timingIntervals = [];
        for (let i = 1; i < movements.length; i++) {
            const interval = movements[i].timestamp - movements[i - 1].timestamp;
            timingIntervals.push(interval);
        }
        const timingVariance = this._calculateVariance(timingIntervals);
        // Very low timing variance suggests automation
        if (timingVariance < 50 && timingIntervals.length > 5) suspiciousScore += 0.15;
        
        // Check for sub-millisecond precision patterns in movements
        // Bots often generate events with unnatural timing precision
        const hasSubMillisecondPattern = this._detectSubMillisecondPattern(movements);
        if (hasSubMillisecondPattern) suspiciousScore += 0.15;
        
        // Analyze acceleration patterns - bots often have unnatural acceleration curves
        const accelerations = [];
        for (let i = 1; i < velocities.length; i++) {
            const accel = Math.abs(velocities[i] - velocities[i - 1]);
            accelerations.push(accel);
        }
        const accelVariance = this._calculateVariance(accelerations);
        // Very smooth acceleration (low variance) is suspicious - human movement is jerky
        if (accelVariance < 0.00001 && accelerations.length > 3) suspiciousScore += 0.15;
        
        // Detect Bezier curve smoothness - our bot uses Bezier curves
        // Real human movement has micro-corrections and tremor that Bezier curves lack
        const hasBezierPattern = this._detectBezierPattern(movements);
        if (hasBezierPattern) suspiciousScore += 0.2;
        
        // Check for lack of pointer pressure variation
        // Real humans have varying pressure when moving the mouse/touchpad
        const pressureAnalysis = this._analyzePointerPressure(movements);
        if (pressureAnalysis.suspicious) suspiciousScore += 0.15;
        
        // Analyze event timestamp entropy
        // Bots generate events with low entropy (predictable) timing
        const entropyAnalysis = this._analyzeTimestampEntropy(movements);
        if (entropyAnalysis.suspicious) suspiciousScore += 0.15;
        
        // Check for pointer device fingerprint mismatches
        // Bots may have inconsistent or missing pointer event properties
        const fingerprintAnalysis = this._analyzePointerFingerprint(movements);
        if (fingerprintAnalysis.suspicious) suspiciousScore += 0.15;
        
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
                pathDistance: pathDistance
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
        
        // Suspicious indicators:
        // - Very low delta variance (always same scroll amount)
        // - Very low interval variance (perfectly timed)
        // - Low unique delta ratio (repetitive pattern)
        // - Bot timing pattern detection
        let suspiciousScore = 0;
        
        if (deltaVariance < 1) suspiciousScore += 0.3;
        if (intervalVariance < 10) suspiciousScore += 0.3;
        if (uniqueDeltaRatio < 0.3) suspiciousScore += 0.3;
        
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
                uniqueDeltaRatio: uniqueDeltaRatio
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
        }
        
        const forceVariance = this._calculateVariance(forces);
        const radiusVariance = this._calculateVariance(radii);
        const untrustedRatio = untrustedCount / touches.length;
        
        // Suspicious indicators:
        // - Very low force variance (unrealistic)
        // - Very low radius variance (unrealistic)
        // - High untrusted event ratio
        let suspiciousScore = 0;
        
        if (forces.length > 0 && forceVariance < 0.001) suspiciousScore += 0.3;
        if (radii.length > 0 && radiusVariance < 0.1) suspiciousScore += 0.3;
        if (untrustedRatio > 0.1) suspiciousScore += 0.4;
        
        const confidence = Math.min(touches.length / this.options.minSamples.touch, 1);
        
        return {
            available: true,
            score: Math.min(suspiciousScore, 1),
            confidence: confidence,
            metrics: {
                sampleCount: touches.length,
                forceVariance: forceVariance,
                radiusVariance: radiusVariance,
                untrustedRatio: untrustedRatio
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
        const checks = [
            { result: analysis.mouse, weight: 0.22 },
            { result: analysis.keyboard, weight: 0.22 },
            { result: analysis.scroll, weight: 0.13 },
            { result: analysis.touch, weight: 0.13 },
            { result: analysis.events, weight: 0.13 },
            { result: analysis.sensors, weight: 0.05 },
            { result: analysis.webglTiming, weight: 0.12 }
        ];
        
        let totalScore = 0;
        let totalWeight = 0;
        let totalConfidence = 0;
        let availableChecks = 0;
        
        for (const check of checks) {
            if (check.result && check.result.available && check.result.confidence > 0) {
                totalScore += check.result.score * check.result.confidence * check.weight;
                totalWeight += check.result.confidence * check.weight;
                totalConfidence += check.result.confidence;
                availableChecks++;
            }
        }
        
        const score = totalWeight > 0 ? totalScore / totalWeight : 0;
        const confidence = availableChecks > 0 ? totalConfidence / availableChecks : 0;
        
        return { score, confidence };
    }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeadlessBehaviorMonitor;
}

if (typeof window !== 'undefined') {
    window.HeadlessBehaviorMonitor = HeadlessBehaviorMonitor;
}
