/**
 * Centralized calibration weights and thresholds for BehaviorMonitor
 * 
 * This file contains all detection thresholds and scoring weights in one place
 * for easy calibration. To tune detection:
 * 
 * 1. Run e2e tests and download `all-calibration-metrics` artifact from GitHub Actions
 * 2. Compare actual values against thresholds in this file
 * 3. If a metric triggers on bots but might trigger on humans (value near threshold),
 *    raise the threshold slightly
 * 4. If a metric fails to trigger on bots, lower the threshold
 * 5. Commit changes and re-run e2e tests
 * 6. Repeat until satisfied with detection balance
 * 
 * IMPORTANT: After changing any value, run `npm test` to verify unit tests still pass.
 */

// Use IIFE to support both browser and Node.js environments
(function(global) {
    const WEIGHTS = {
    /**
     * Per-channel weights in overall score calculation
     * These determine how much each analysis channel contributes to the final score.
     * All weights should sum to ~1.0 for consistency.
     * 
     * Calibration iteration 7:
     * - Reduced mouse weight from 0.22 to 0.18 (variance-based detection causes false positives)
     * - Increased keyboard weight from 0.22 to 0.25 (more reliable discriminator)
     * - Increased events weight from 0.13 to 0.16 (trusted events are strong signal)
     */
    CHANNEL_WEIGHTS: {
        mouse: 0.35,      // Increased from 0.30 - primary bot detection signal (iteration 18)
        keyboard: 0.40,   // Increased from 0.35 - critical for keyboard-heavy tests (iteration 19)
        scroll: 0.40,     // Increased from 0.25 - critical for scroll-heavy tests (iteration 19)
        touch: 0.13,      // Primary for mobile
        events: 0.16,     // Trusted event detection is reliable
        sensors: 0.10,    // Device motion - raised from 0.05 (iteration 21: supports single-channel detection)
        webglTiming: 0.10 // Rendering timing fingerprint
    },

    /**
     * Minimum samples required for reliable analysis
     * 
     * Calibration iteration 7:
     * - Raised mouse minimum from 20 to 50 to require more data before
     *   triggering variance-based detection (reduces false positives on
     *   slow/smooth human behavior)
     */
    MIN_SAMPLES: {
        mouse: 50,       // Raised from 20 to reduce false positives on slow humans
        keyboard: 10,
        scroll: 5,
        touch: 5,
        events: 10
    },

    /**
     * Mouse movement analysis thresholds
     * 
     * Human baselines (from real device testing):
     * - velocityVariance: 0.001 - 5.0 (humans vary naturally)
     * - angleVariance: 0.05 - 2.0 (humans have varied movement angles)
     * - straightLineRatio: 0.0 - 0.4 (humans rarely move in perfectly straight lines)
     * - mouseEfficiency: 0.3 - 0.85 (humans take indirect paths to targets)
     * 
     * Calibration iteration 4 (run 21720648925):
     * - Issue: Mouse scores dropped to 0.30 for robot tests (was 0.95)
     * - Root cause: Thresholds were too lenient, not distinguishing bot from human
     * - Fix: Made thresholds more sensitive (100x for velocity, 10x for angle/straight)
     * 
     * Calibration iteration 7 (run 21723308853):
     * - Issue: False positives on human-slow (0.28) and human-smooth (0.31)
     * - Root cause: Slow/smooth human behavior also has low variance (like robots)
     * - Fix: Lower velocity variance threshold to be less sensitive, reduce its weight,
     *   and rely more on multi-signal detection
     */
    MOUSE_THRESHOLDS: {
        lowVelocityVariance: 0.001,     // Lowered from 0.01 - only trigger on very low variance (less sensitive)
        lowAngleVariance: 0.05,         // Lowered from 0.1 - only trigger on very low angle variance
        highStraightLineRatio: 0.35,    // Bots move in straight lines (raised from 0.3 - prevents L10 false trigger)
        highUntrustedRatio: 0.1,        // Non-trusted events indicate automation
        highMouseEfficiency: 0.95,      // Bots take perfect paths (requires multi-signal)
        lowTimingVariance: 50,          // Lowered from 100 - only trigger on very uniform timing
        lowAccelVariance: 0.00001,      // Lowered from 0.0001 - only trigger on very smooth acceleration
        subMillisecondPatterns: [10, 16, 20, 33, 50, 100], // Common bot intervals (ms)
        subMillisecondTolerance: 1      // Tolerance for pattern matching (ms)
    },

    /**
     * Mouse scoring weights
     * 
     * CALIBRATION PHILOSOPHY: Scores should be INVERSELY proportional to bot sophistication.
     * Naive bots (cheap to build) → HIGH scores
     * Sophisticated bots (expensive to maintain) → LOW scores
     * 
     * Iteration 14 (inverse-sophistication scoring):
     * - highStraightLineRatio: 0.30→0.50 (MAJOR boost - straight lines are the #1 naive bot tell)
     * - constantTiming: 0.40 (NEW - catches robot-slow's 500ms fixed intervals that bypass lowTimingVariance)
     * - periodicNoise: 0.25 (NEW - catches stealth-bot's Math.sin patterns)
     * - lowTimingVariance: 0.35 (key for fast naive bots like robot)
     * - Added naiveSignalMultiplier logic in behavior-monitor.js
     * 
     * Previous iteration 12:
     * - lowTimingVariance weight from 0.20 to 0.35 (robot: 42ms timing variance vs human: 500,000+ms)
     */
    MOUSE_WEIGHTS: {
        lowVelocityVariance: 0.10,     // Slow humans also have low variance - not reliable alone
        lowAngleVariance: 0.05,        // Not reliable alone
        highStraightLineRatio: 0.55,   // MAJOR - straight lines are the #1 naive bot tell (iteration 18: 0.50→0.55)
        highUntrustedRatio: 0.30,      // Strong bot indicator
        highMouseEfficiency: 0.15,
        lowTimingVariance: 0.45,       // Key for fast naive bots (iteration 18: 0.35→0.45)
        constantTiming: 0.50,          // Catches constant intervals at ANY speed (iteration 18: 0.40→0.50)
        periodicNoise: 0.15,           // Re-enabled (iteration 21) - catches stealth-bot's Math.sin patterns
        subMillisecondPattern: 0.10,   // All Playwright tests trigger this
        lowAccelVariance: 0.10,
        bezierPattern: 0.05,           // Our human simulations use bezier curves
        pressureSuspicious: 0.05,      // Causes false positives
        lowEntropy: 0.15,
        fingerprintSuspicious: 0.05    // Causes false positives
    },
    
    /**
     * Thresholds for new inverse-sophistication detectors
     */
    SOPHISTICATION_THRESHOLDS: {
        // Constant timing: coefficient of variation threshold
        // CV < 0.15 = constant timing (catches robot-slow's 500ms)
        // Humans typically have CV > 0.3
        constantTimingCV: 0.15,
        
        // Periodic noise: autocorrelation threshold
        // AC > 0.5 = periodic pattern (catches stealth-bot's Math.sin)
        // Perlin noise (ultimate-bot) typically has AC < 0.3
        periodicNoiseAC: 0.5,
        
        // Naive signal multiplier: when multiple naive signals fire, multiply score
        // This compounds detection of obvious bots
        naiveSignalMultiplier: 1.5
    },

    /**
     * Keyboard analysis thresholds
     * 
     * Human baselines:
     * - holdTimeVariance: 20 - 1000 ms (humans vary key hold times)
     * - interKeyVariance: 200 - 10000 ms (humans have varied typing rhythm)
     */
    KEYBOARD_THRESHOLDS: {
        lowHoldTimeVariance: 10,        // Bots have robotic key hold timing
        lowInterKeyVariance: 100,       // Bots type at constant speed
        highUntrustedRatio: 0.1,        // Non-trusted events indicate automation
        highInterKeyVariance: 5000000   // Human-like reading/thinking pauses (>5M ms² variance)
    },

    /**
     * Keyboard scoring weights (sum = 1.0)
     */
    KEYBOARD_WEIGHTS: {
        lowHoldTimeVariance: 0.5,   // Increased from 0.3 - primary signal for keyboard bots (iteration 20)
        lowInterKeyVariance: 0.2,   // Reduced from 0.3 - less reliable due to interleaved actions
        highUntrustedRatio: 0.3,    // Reduced from 0.4
        highInterKeyVariance: 0.30  // Human-like pauses REDUCE score (negative weight in scoring)
    },

    /**
     * Scroll analysis thresholds
     * 
     * Human baselines:
     * - deltaVariance: 50 - 2000 (humans vary scroll amounts)
     * - eventsPerSecond: 5 - 50 (normal scrolling rate)
     */
    SCROLL_THRESHOLDS: {
        // Low variance = bot-like repetitive patterns
        lowDeltaVariance: 1,
        lowIntervalVariance: 10,
        lowUniqueDeltaRatio: 0.3,
        // High variance = unnaturally erratic (also suspicious)
        highDeltaVariance: 3000,
        // High frequency = too many events per second
        highEventsPerSecond: 100,
        // Human-like scroll pauses (>1M ms² interval variance)
        highIntervalVariance: 1000000
    },

    /**
     * Scroll scoring weights
     */
    SCROLL_WEIGHTS: {
        lowDeltaVariance: 0.2,
        lowIntervalVariance: 0.2,
        lowUniqueDeltaRatio: 0.2,
        highDeltaVariance: 0.25,      // Increased from 0.15 - catches scroll-heavy (iteration 20)
        highEventsPerSecond: 0.10,    // Reduced from 0.15
        subMillisecondPattern: 0.05,  // Reduced from 0.10
        highIntervalVariance: 0.20    // Human-like pauses REDUCE score (negative weight in scoring)
    },

    /**
     * Touch analysis thresholds
     * 
     * Human baselines:
     * - forceVariance: 0.01 - 0.12 (touch pressure varies naturally)
     * - eventsPerSecond: 5 - 35 (normal touch interaction rate)
     */
    TOUCH_THRESHOLDS: {
        // Low variance = bot-like patterns
        lowForceVariance: 0.001,
        lowPositionVariance: 0.01,
        // High variance = unnaturally erratic
        highForceVariance: 0.15,
        // High frequency = too many events per second
        highEventsPerSecond: 50
    },

    /**
     * Touch scoring weights
     */
    TOUCH_WEIGHTS: {
        lowForceVariance: 0.25,
        lowPositionVariance: 0.25,
        highForceVariance: 0.15,
        highEventsPerSecond: 0.15,
        subMillisecondPattern: 0.1
    },

    /**
     * Sensors (accelerometer/gyroscope) thresholds
     */
    SENSOR_THRESHOLDS: {
        lowAccelVariance: 0.001,
        lowGyroVariance: 0.001
    },

    /**
     * Sensor scoring weights
     */
    SENSOR_WEIGHTS: {
        lowAccelVariance: 0.5,
        lowGyroVariance: 0.5
    },

    /**
     * Events (trusted event) analysis thresholds
     */
    EVENT_THRESHOLDS: {
        highUntrustedRatio: 0.1,    // More than 10% untrusted events is suspicious
        lowUntrustedRatio: 0       // 0% untrusted is suspicious for long sessions
    },

    /**
     * WebGL timing analysis thresholds
     */
    WEBGL_THRESHOLDS: {
        suspiciouslyFastCompileMs: 1,    // Less than 1ms shader compilation is suspicious
        suspiciouslySlowCompileMs: 500,  // More than 500ms might be emulated
        roundNumberTolerance: 0.001      // Round numbers suggest emulation
    },

    /**
     * Pointer pressure analysis thresholds
     */
    PRESSURE_THRESHOLDS: {
        minVarianceForHuman: 0.001,      // Humans have some pressure variation
        constantPressureSamples: 10      // Need this many samples to detect constant pressure
    },

    /**
     * Timestamp entropy analysis thresholds
     * 
     * Calibration iteration 2: Increased minEntropyBits from 2.0 to 1.0
     * (entropy < 1.0 is suspicious - more lenient for bot detection)
     */
    ENTROPY_THRESHOLDS: {
        minEntropyBits: 1.0,             // Minimum entropy for human-like timing (lowered from 2.0)
        minSamplesForAnalysis: 20        // Need this many samples for reliable entropy
    },

    /**
     * Pointer fingerprint analysis
     */
    FINGERPRINT_THRESHOLDS: {
        missingPropertiesSuspicious: 3   // Missing this many properties is suspicious
    },

    /**
     * Global safeguard thresholds
     * 
     * Calibration iteration 2 (run 21719104733):
     * - Lowered suspiciousChannelThreshold from 0.6 to 0.45 (more channels qualify as suspicious)
     * - Increased singleChannelDownscale from 0.5 to 0.75 (less severe penalty: 25% vs 50%)
     * - Increased maxChannelContribution from 0.4 to 0.6 (allow more per-channel contribution)
     * - Lowered minConfidenceGate from 0.6 to 0.4 (include lower-confidence signals)
     * 
     * Calibration iteration 3 (run 21719942799):
     * - Lowered suspiciousChannelThreshold from 0.45 to 0.35 (more channels qualify as suspicious)
     * - Increased singleChannelDownscale from 0.75 to 0.90 (only 10% penalty instead of 25%)
     * - Robot test improved from 0.28 to expected ~0.40+ while human tests stay under 0.25
     */
    SAFEGUARDS: {
        minConfidenceGate: 0.4,          // Channels below this confidence are ignored
        suspiciousChannelThreshold: 0.25, // Channel score >= this is "suspicious" (lowered from 0.35 - iteration 20)
        minSuspiciousChannels: 2,        // Need this many suspicious channels for escalation
        singleChannelDownscale: 0.90,    // Downscale factor when only 1 suspicious channel (was 0.75)
        maxChannelContribution: 0.6,     // Max contribution per channel (60%)
        minSessionDurationZero: 5000,    // Sessions < 5s get score = 0
        minSessionDurationCap: 10000,    // Sessions < 10s get score capped at 0.5
        shortSessionScoreCap: 0.5,       // Score cap for short sessions
        botThreshold: 0.40,              // Score >= this is classified as BOT
        suspiciousThreshold: 0.25,       // Score >= this is classified as SUSPICIOUS
        likelyHumanThreshold: 0.12,      // Score >= this is classified as LIKELY_HUMAN
        // Below likelyHumanThreshold → VERIFIED_HUMAN
        minSamplesForVariance: 10,       // Need this many samples for variance checks
        sophisticationMouseThreshold: 0.40, // Mouse score below this + human kb/scroll patterns → apply discount
        sophisticationDiscount: 0.60,    // Multiply score by this when sophistication evidence found
        // SAFEGUARD 10: Multi-channel corroboration rescue
        // Catches cheap interleaved bots whose per-channel signals are diluted
        multiChannelRescueThreshold: 0.04,   // Lowered from 0.10 (iteration 21: avoids float precision issues at 0.05)
        multiChannelRescueCap: 0.42,         // Maximum score the rescue can produce (non-sophisticated tests)
        multiChannelRescueCapSophisticated: 0.39, // Cap for tests with sophistication evidence (< suspiciousThreshold max)
        multiChannelRescueBoost: 1.60,       // Raised from 1.50 (iteration 21: stronger rescue)
        multiChannelRescueMinChannels: 2,    // Lowered from 3 (iteration 21: supports 2-channel bots)
        // SAFEGUARD 11: Single-input-channel boost
        // When only 1 input channel is available, boost score to account for
        // mono-channel suspicion (real humans use multiple input channels)
        singleInputChannelBoostThreshold: 0.15, // Minimum score to apply boost
        singleInputChannelBoostFactor: 2.5,     // Multiplier for single-channel score
        singleInputChannelBoostCap: 0.55,       // Maximum boosted score
        // SAFEGUARD 12: Graduated zero-score weight for channels with negative evidence
        // Channels scoring 0 with strong human-like signals (negative evidence)
        // still dilute the overall score, but proportional to evidence strength
        zeroScoreNegStrengthScale: 150,  // Divisor for negative signal strength → weight factor
        zeroScoreNegMinFactor: 0.15,     // Minimum weight factor for any negative evidence
        zeroScoreNegMaxFactor: 0.80,     // Maximum weight factor (very strong negative evidence)
        // SAFEGUARD 9 improvements: Graduated sophistication discount
        // Uses mouse velocity variance and negative signal magnitude to scale discount
        sophisticationVelVarThreshold: 1.0,  // Mouse velVar below this indicates subtle bot tell
        sophisticationNonMouseMinScore: 0.10, // Minimum kb+scroll score sum to apply discount
        sophisticationIkvScale: 120000000,    // InterKeyVariance scale for graduated discount
        sophisticationIvScale: 70000000,      // IntervalVariance scale for graduated discount
        sophisticationDiscountMin: 0.15,      // Strongest discount (highest sophistication)
        sophisticationDiscountMax: 0.70,      // Weakest discount (lowest sophistication)
        // Rescue skip: sophisticated bots scoring above this threshold skip rescue
        // so the graduated sophistication discount can reduce their score instead
        multiChannelRescueMaxScoreForSophisticated: 0.25
    },

    /**
     * Human baseline reference values
     * These are typical ranges observed in real human behavior.
     * Use these to compare against e2e test metrics.
     */
    HUMAN_BASELINES: {
        mouse: {
            velocityVariance: { min: 0.001, typical: 0.1, max: 5.0 },
            angleVariance: { min: 0.05, typical: 0.3, max: 2.0 },
            straightLineRatio: { min: 0.0, typical: 0.15, max: 0.4 },
            mouseEfficiency: { min: 0.3, typical: 0.6, max: 0.85 }
        },
        keyboard: {
            holdTimeVariance: { min: 20, typical: 100, max: 1000 },
            interKeyVariance: { min: 200, typical: 500, max: 10000 }
        },
        scroll: {
            deltaVariance: { min: 50, typical: 500, max: 2000 },
            eventsPerSecond: { min: 5, typical: 20, max: 50 }
        },
        touch: {
            forceVariance: { min: 0.01, typical: 0.05, max: 0.12 },
            eventsPerSecond: { min: 5, typical: 15, max: 35 }
        }
    }
};

    // Export for browser (window global)
    if (typeof global.window !== 'undefined') {
        global.window.BehaviorMonitorWeights = WEIGHTS;
    }
    
    // Export for Node.js (module.exports)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = WEIGHTS;
    }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
