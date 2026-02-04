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
            webglTiming: this.data.webglTiming,
            
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
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise<boolean>} Resolves to true if ready, false if timeout
     * 
     * @example
     * // With await
     * const ready = await monitor.waitForReady(10000);
     * if (ready) {
     *     console.log('Ready to analyze');
     * }
     * 
     * @example
     * // With .then()
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
            isTrusted: event.isTrusted
        };
        
        this.data.mouse.push(data);
        
        if (this.options.onSample) {
            this.options.onSample({ type: 'mouse', data });
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
            this.options.onSample({ type: 'keyboard', data });
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
            this.options.onSample({ type: 'scroll', data });
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
            this.options.onSample({ type: 'touch', data });
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
            this.options.onSample({ type: 'touch', data });
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
            this.options.onSample({ type: 'event', data });
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
                this.options.onReady(this.getResults());
            }
            
            // Resolve all pending waiters with true
            this.readyResolvers.forEach(resolve => resolve(true));
            this.readyResolvers = [];
        } else if (forceTimeout) {
            // Timeout reached but not ready - resolve with false
            this.readyResolvers.forEach(resolve => resolve(false));
            this.readyResolvers = [];
            
            // Fire onReady callback on timeout (only once)
            if (!this.readyFired && this.options.onReady) {
                this.readyFired = true;
                this.options.onReady(this.getResults());
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
            
            if (timeDiff > 0) {
                const velocity = distance / timeDiff;
                velocities.push(velocity);
                
                // Check for perfectly straight lines (bot-like)
                if (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01) {
                    straightLineSegments++;
                }
                
                // Calculate angle
                if (i > 1) {
                    const prevDx = prev.x - movements[i - 2].x;
                    const prevDy = prev.y - movements[i - 2].y;
                    const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
                    angles.push(Math.abs(angle));
                }
            }
            
            totalDistance += distance;
            
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
        const straightLineRatio = straightLineSegments / movements.length;
        const untrustedRatio = untrustedCount / movements.length;
        
        // Suspicious indicators:
        // - Very low velocity variance (too consistent)
        // - Very low angle variance (too straight)
        // - High straight line ratio
        // - High untrusted event ratio
        // - Very high mouse efficiency (too direct, bot-like)
        let suspiciousScore = 0;
        
        if (velocityVariance < 0.0001) suspiciousScore += 0.3;
        if (angleVariance < 0.01) suspiciousScore += 0.2;
        if (straightLineRatio > 0.5) suspiciousScore += 0.3;
        if (untrustedRatio > 0.1) suspiciousScore += 0.2;
        // Bots tend to move very directly (efficiency close to 1.0)
        // Humans tend to have efficiency between 0.3-0.8
        if (mouseEfficiency > 0.95) suspiciousScore += 0.15;
        
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
        let suspiciousScore = 0;
        
        if (deltaVariance < 1) suspiciousScore += 0.3;
        if (intervalVariance < 10) suspiciousScore += 0.3;
        if (uniqueDeltaRatio < 0.3) suspiciousScore += 0.4;
        
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
    
    _calculateOverallScore(analysis) {
        const checks = [
            { result: analysis.mouse, weight: 0.25 },
            { result: analysis.keyboard, weight: 0.25 },
            { result: analysis.scroll, weight: 0.15 },
            { result: analysis.touch, weight: 0.15 },
            { result: analysis.events, weight: 0.15 },
            { result: analysis.sensors, weight: 0.05 }
        ];
        
        let totalScore = 0;
        let totalWeight = 0;
        let totalConfidence = 0;
        let availableChecks = 0;
        
        for (const check of checks) {
            if (check.result.available && check.result.confidence > 0) {
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
