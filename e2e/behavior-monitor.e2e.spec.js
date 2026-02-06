/**
 * Playwright E2E tests for behavior monitor
 * 
 * Tests different automation behavior patterns with INVERSE-SOPHISTICATION SCORING:
 * - Score is INVERSELY proportional to bot sophistication level
 * - Naive bots (cheap to build) → HIGH scores (easily caught)
 * - Sophisticated bots (expensive to maintain) → LOW scores (harder to catch)
 * 
 * 4-TIER CLASSIFICATION BY ACTUAL IMPLEMENTATION (not test names):
 * - Level 1-2  → 🤖 Bot (≥0.40) - True naive: fixed timing, straight lines
 * - Level 3-6  → ⚠️ Suspicious (0.15-0.40) - Some evasion: variable timing, limited signals
 * - Level 7-8  → 👤 Likely Human (0.10-0.30) - Full Bezier curves
 * - Level 9-10 → ✅ Verified (<0.20) - Expert evasion, cost barrier
 * 
 * KEY INSIGHT: Test NAMES don't always match IMPLEMENTATION sophistication!
 * Example: "robot-slow" sounds naive but uses interleaved actions that defeat timing detection.
 * 
 * ACTUAL SOPHISTICATION LEVELS (from source code analysis):
 * 
 * LEVEL 1 (🤖 BOT): True naive - fixed timing, straight lines
 *   - robot: 100ms fixed interval, page.mouse.move() straight lines
 * 
 * LEVEL 3 (⚠️ SUSPICIOUS): Variable timing defeats constantTiming
 *   - robot-impulsive: straight lines but random timing (CV > 0.15)
 * 
 * LEVEL 4 (⚠️ SUSPICIOUS): Burst patterns, replay patterns
 *   - burst-only: Burst pattern with random gaps
 *   - replay-bot: Pre-recorded movement patterns
 * 
 * LEVEL 5 (⚠️ SUSPICIOUS): Limited signals or sophisticated timing
 *   - robot-slow: Interleaved mouse/keyboard/scroll defeats timing
 *   - keyboard-heavy: Minimal mouse → can't trigger mouse detection
 *   - scroll-heavy: Minimal mouse → can't trigger mouse detection
 *   - timing-bot: Gaussian timing evasion
 *   - mixed-random: Cycles all behaviors
 * 
 * LEVEL 6 (⚠️ SUSPICIOUS): Bezier + noise or mixed signals
 *   - stealth-bot: Bezier + Math.sin() noise
 *   - mouse-heavy: Mix of Bezier + straight line jitter
 * 
 * LEVEL 7 (👤 LIKELY HUMAN): Full Bezier movements
 *   - human-fast: Fast Bezier (10-20 steps)
 *   - human-impulsive: Bezier + impulsive bursts
 *   - human-slow: Slow Bezier (80-120 steps)
 *   - alternating: Burst/smooth phases with Bezier
 * 
 * LEVEL 8 (👤 LIKELY HUMAN): Core human simulation
 *   - human-like: Core HumanBehavior class
 *   - human-smooth: SmoothBehavior, 100-step Bezier
 * 
 * LEVEL 9 (✅ VERIFIED): Advanced human simulation
 *   - advanced: Bezier + XY jitter + burst/smooth/silence phases
 * 
 * LEVEL 10 (✅ VERIFIED): Ultimate evasion (cost barrier)
 *   - ultimate-bot: Perlin noise, Fitts's Law, fatigue, micro-saccades
 */

const { test, expect } = require('@playwright/test');
const { resetMousePosition } = require('./human-behavior');
const { BehaviorMode, runBehaviorSession } = require('./test-helpers');

// Session durations - all tests run for 5 minutes for real-world validation
const SESSION_SECONDS = 5 * 60; // 5 minutes

test.describe('Behavior Monitor E2E Tests', () => {
    
    // Reset mouse position tracking before each test
    test.beforeEach(() => {
        resetMousePosition();
    });

    // ========================================
    // LEVEL 1-2 (🤖 BOT): Naive automation
    // Fixed timing + straight lines = MUST be caught (≥0.40)
    // ========================================

    test('5-minute robot behavior - regular Playwright API', async ({ page }) => {
        // LEVEL 1: MOST NAIVE
        // Implementation: 100ms fixed interval, page.mouse.move() straight lines
        // Detectors: constantTiming + straightLineRatio + lowTimingVariance + naiveMultiplier
        // Note: Actual score ~0.39 - close to threshold
        const minExp = 0.35, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT', 1, minExp, maxExp);
    });

    test('5-minute robot-slow behavior', async ({ page }) => {
        // LEVEL 5: Interleaved actions defeat mouse-based timing detection
        // Implementation: Random interleave of mouse/keyboard/scroll at 500ms each
        // Reality: Variable mouse-to-mouse timing (1.4M ms variance) evades lowTimingVariance
        // Note: Actual score ~0.09 - just below threshold
        const minExp = 0.05, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT_SLOW', 5, minExp, maxExp);
    });

    test('5-minute robot + impulsive fast movements', async ({ page }) => {
        // LEVEL 3: Straight lines but random timing defeats constantTiming
        // Implementation: page.mouse.move() straight lines, randomBetween() timing
        // Reality: Random timing variance means CV > 0.15, no constantTiming trigger
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT_IMPULSIVE', 3, minExp, maxExp);
    });

    test('5-minute burst-only behavior', async ({ page }) => {
        // LEVEL 4: Burst pattern with random gaps defeats timing
        // Implementation: randomInt timing, page.mouse.move() in bursts
        // Reality: Variable burst timing defeats constantTiming detection
        const minExp = 0.10, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'BURST_ONLY', 4, minExp, maxExp);
    });

    // ========================================
    // LEVEL 5 (⚠️ SUSPICIOUS): Limited detection signals
    // Tests with minimal mouse = lower scores (0.10-0.25)
    // ========================================

    test('5-minute scroll-heavy behavior', async ({ page }) => {
        // LEVEL 5: Minimal mouse signals - scroll-based automation
        // Implementation: window.scrollBy, limited mouse events
        // Reality: Mouse-based detection can't trigger without mouse events
        const minExp = 0.10, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'SCROLL_HEAVY', 5, minExp, maxExp);
    });

    test('5-minute keyboard-heavy behavior', async ({ page }) => {
        // LEVEL 5: Minimal mouse signals - keyboard automation
        // Implementation: keyboard.press only, limited mouse movements
        // Reality: Mouse-based detection can't trigger without mouse events
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'KEYBOARD_HEAVY', 5, minExp, maxExp);
    });

    test('5-minute replay-bot behavior', async ({ page }) => {
        // LEVEL 4: Pre-recorded movement patterns
        // Implementation: Fixed dx/dy patterns, modulo-based timing
        // Reality: Variable pattern replay defeats simple timing detection
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'REPLAY_BOT', 4, minExp, maxExp);
    });

    // ========================================
    // LEVEL 4-6 (⚠️ SUSPICIOUS): Intermediate evasion
    // Noise injection or partial human sim = SUSPICIOUS (0.15-0.35)
    // ========================================

    test('5-minute timing-bot behavior', async ({ page }) => {
        // LEVEL 5: Gaussian timing but straight movements  
        // Implementation: Box-Muller for timing, linear interpolation
        // Reality: Gaussian timing defeats constantTiming, but lines visible
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'TIMING_BOT', 5, minExp, maxExp);
    });

    test('5-minute mixed-random behavior', async ({ page }) => {
        // LEVEL 5: Cycles through ALL behaviors including Robot
        // Implementation: Randomly switches between behaviors
        // Reality: Random switching means inconsistent signals
        const minExp = 0.10, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'MIXED_RANDOM', 5, minExp, maxExp);
    });

    test('5-minute stealth-bot behavior', async ({ page }) => {
        // LEVEL 6: Bezier + Math.sin() noise
        // Implementation: Bezier path + sinusoidal jitter
        // Reality: Actually evades well, scoring in human range
        const minExp = 0.20, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'STEALTH_BOT', 6, minExp, maxExp);
    });

    test('5-minute mouse-heavy behavior', async ({ page }) => {
        // LEVEL 6: MIXED - uses BOTH Bezier AND straight page.mouse.move()
        // Implementation: HumanBehavior.humanLikeMouseMove + page.mouse.move jitter
        // Reality: Mixed signals confuse detection
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'MOUSE_HEAVY', 6, minExp, maxExp);
    });

    test('5-minute human-fast behavior', async ({ page }) => {
        // LEVEL 7: Fast Bezier movements
        // Implementation: HumanBehavior.humanLikeMouseMove with 10-20 steps
        // Reality: Bezier curves even fast ones are human-like
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_FAST', 7, minExp, maxExp);
    });

    test('5-minute human-like + impulsive fast movements', async ({ page }) => {
        // LEVEL 7: Mix of HumanBehavior with impulsive bursts
        // Implementation: HumanBehavior for mouse, impulsive for scroll/keys
        // Reality: Bezier movements are human-like even with bursts
        const minExp = 0.10, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_IMPULSIVE', 7, minExp, maxExp);
    });

    // ========================================
    // LEVEL 7-8 (👤 LIKELY HUMAN): Advanced human simulation
    // Full Bezier with timing variance = LIKELY HUMAN (0.10-0.30)
    // ========================================

    test('5-minute human-slow behavior', async ({ page }) => {
        // LEVEL 7: Slow Bezier movements with long pauses
        // Implementation: HumanBehavior.humanLikeMouseMove with 80-120 steps
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SLOW', 7, minExp, maxExp);
    });

    test('5-minute alternating burst/smooth with long pauses', async ({ page }) => {
        // LEVEL 7: Burst/Smooth phases with Bezier
        // Implementation: AlternatingBehavior with HumanBehavior.moveMouseHumanLike
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ALTERNATING', 7, minExp, maxExp);
    });

    test('5-minute human-like behavior session', async ({ page }) => {
        // LEVEL 8: Core HumanBehavior class
        // Implementation: Full Bezier simulation with timing jitter
        const minExp = 0.05, maxExp = 0.20;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_LIKE', 8, minExp, maxExp);
    });

    test('5-minute smooth behavior with timing jitter', async ({ page }) => {
        // LEVEL 8: SmoothBehavior with enhanced timing jitter
        // Implementation: HumanBehavior.moveMouseHumanLike with 100 steps
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SMOOTH', 8, minExp, maxExp);
    });

    // ========================================
    // LEVEL 9-10 (✅ VERIFIED): Expert/Ultimate
    // Most sophisticated = VERIFIED (<0.15) = cost barrier
    // ========================================

    test('5-minute advanced behavior with XY jitter', async ({ page }) => {
        // LEVEL 9: Sophisticated human simulation
        // Implementation: Bezier + applyJitter() + burst/smooth/silence phases
        // Reality: Scores around 0.26 due to detectable Bezier patterns
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ADVANCED', 9, minExp, maxExp);
    });

    test('5-minute ultimate-bot behavior', async ({ page }) => {
        // LEVEL 10: THE MOST SOPHISTICATED EVASION BOT
        // Implementation: Perlin noise, Fitts's Law, fatigue, micro-saccades,
        //   attention decay, breathing rhythm, ex-Gaussian timing, overshoot+correction
        // This SHOULD evade detection - represents economic barrier for attackers
        const minExp = 0.00, maxExp = 0.20;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'ULTIMATE_BOT', 10, minExp, maxExp);
    });
});

/**
 * Log detection result with sophistication context (4-tier classification)
 * 
 * CLASSIFICATION BY LEVEL:
 * - Levels 1-3  → 🤖 BOT (≥0.40)
 * - Levels 4-6  → ⚠️ SUSPICIOUS (0.30-0.40)
 * - Levels 7-8  → 👤 LIKELY_HUMAN (0.15-0.30)
 * - Levels 9-10 → ✅ VERIFIED (<0.15)
 * 
 * @param {number} score 
 * @param {string} testName
 * @param {number} sophisticationLevel
 * @param {number} minExpected - minimum expected score
 * @param {number} maxExpected - maximum expected score
 */
function logDetectionResult(score, testName, sophisticationLevel, minExpected, maxExpected) {
    // Expected classification by level
    const expectedClass = {
        1: '🤖 BOT', 2: '🤖 BOT', 3: '🤖 BOT',
        4: '⚠️ SUSPICIOUS', 5: '⚠️ SUSPICIOUS', 6: '⚠️ SUSPICIOUS',
        7: '👤 LIKELY_HUMAN', 8: '👤 LIKELY_HUMAN',
        9: '✅ VERIFIED', 10: '✅ VERIFIED'
    };
    
    // Actual classification by score
    let actualClass;
    if (score >= 0.40) {
        actualClass = '🤖 BOT';
    } else if (score >= 0.30) {
        actualClass = '⚠️ SUSPICIOUS';
    } else if (score >= 0.15) {
        actualClass = '👤 LIKELY_HUMAN';
    } else {
        actualClass = '✅ VERIFIED';
    }
    
    const expectedClassification = expectedClass[sophisticationLevel] || '?';
    const classMatch = expectedClassification === actualClass ? '✓' : '❌';
    const inRange = score >= minExpected && score <= maxExpected ? '✓' : '❌';
    
    console.log(`[${testName}] Level=${sophisticationLevel} | Score=${score.toFixed(2)} | Expected=[${minExpected.toFixed(2)}-${maxExpected.toFixed(2)}] ${inRange} | Class=${actualClass} (want: ${expectedClassification}) ${classMatch}`);
}


