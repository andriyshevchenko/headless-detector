/**
 * Playwright E2E tests for behavior monitor
 * 
 * Tests different automation behavior patterns with INVERSE-SOPHISTICATION SCORING:
 * - Score is INVERSELY proportional to bot sophistication level
 * - Naive bots (cheap to build) → HIGH scores (easily caught)
 * - Sophisticated bots (expensive to maintain) → LOW scores (harder to catch)
 * 
 * 4-TIER CLASSIFICATION BY SOPHISTICATION LEVEL:
 * - Levels 1-3  → 🤖 Bot (≥0.40) - Naive implementations, MUST be caught
 * - Levels 4-6  → ⚠️ Suspicious (0.30-0.40) - Intermediate evasion attempts
 * - Levels 7-8  → 👤 Likely Human (0.15-0.30) - Advanced human simulations
 * - Levels 9-10 → ✅ Verified (<0.15) - Expert simulations, represent cost barrier
 * 
 * SOPHISTICATION LEVELS (from source code analysis):
 * 
 * LEVEL 1 (🤖 BOT): Most naive - fixed timing, straight lines
 *   - robot: 100ms fixed interval, page.mouse.move() straight lines
 *   - robot-slow: 500ms fixed interval, page.mouse.move() straight lines
 * 
 * LEVEL 2 (🤖 BOT): Naive with variance - straight lines + variable timing
 *   - robot-impulsive: straight lines, random fast timing
 *   - burst-only: straight page.mouse.move() in bursts
 * 
 * LEVEL 3 (🤖 BOT): Basic automation patterns
 *   - scroll-heavy: limited mouse, scroll-based automation
 *   - keyboard-heavy: limited mouse, keyboard-based automation
 *   - replay-bot: pre-recorded movement patterns
 * 
 * LEVEL 4 (⚠️ SUSPICIOUS): Basic noise injection
 *   - timing-bot: Gaussian timing but straight-line movements
 *   - mixed-random: Randomly rotates through behaviors including robot
 * 
 * LEVEL 5 (⚠️ SUSPICIOUS): Intermediate stealth
 *   - stealth-bot: Bezier + Math.sin() noise (detectable periodicity)
 *   - mouse-heavy: Mix of Bezier + straight line jitter
 * 
 * LEVEL 6 (⚠️ SUSPICIOUS): Basic human simulation
 *   - human-fast: Fast Bezier movements (10-20 steps)
 *   - human-impulsive: Bezier + impulsive bursts
 * 
 * LEVEL 7 (👤 LIKELY HUMAN): Full human simulation
 *   - human-slow: Slow Bezier (80-120 steps) with pauses
 *   - alternating: Burst/smooth phases with Bezier
 * 
 * LEVEL 8 (👤 LIKELY HUMAN): Advanced human simulation
 *   - human-like: Core HumanBehavior class, full Bezier
 *   - human-smooth: SmoothBehavior, 100-step Bezier
 * 
 * LEVEL 9 (✅ VERIFIED): Expert human simulation
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
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT', 1);
    });

    test('5-minute robot-slow behavior', async ({ page }) => {
        // LEVEL 1: NAIVE - just slower
        // Implementation: 500ms fixed interval, page.mouse.move() straight lines
        // Detectors: constantTiming (CV < 0.15) + straightLineRatio + naiveMultiplier
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT_SLOW', 1);
    });

    test('5-minute robot + impulsive fast movements', async ({ page }) => {
        // LEVEL 2: Straight lines + random timing
        // Implementation: page.mouse.move() straight lines, randomBetween() timing
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT_IMPULSIVE', 2);
    });

    test('5-minute burst-only behavior', async ({ page }) => {
        // LEVEL 2: Rapid bursts with straight lines
        // Implementation: randomInt timing, page.mouse.move() in bursts
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'BURST_ONLY', 2);
    });

    // ========================================
    // LEVEL 3 (🤖 BOT): Basic automation patterns
    // Limited signals or replay = BOT (≥0.40)
    // ========================================

    test('5-minute scroll-heavy behavior', async ({ page }) => {
        // LEVEL 3: Limited mouse signals - scroll automation
        // Implementation: window.scrollBy only, minimal mouse
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'SCROLL_HEAVY', 3);
    });

    test('5-minute keyboard-heavy behavior', async ({ page }) => {
        // LEVEL 3: Limited mouse signals - keyboard automation
        // Implementation: keyboard.press only, no mouse movements
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'KEYBOARD_HEAVY', 3);
    });

    test('5-minute replay-bot behavior', async ({ page }) => {
        // LEVEL 3: Pre-recorded patterns
        // Implementation: Fixed dx/dy patterns, modulo-based timing
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        logDetectionResult(results.overallScore, 'REPLAY_BOT', 3);
    });

    // ========================================
    // LEVEL 4-6 (⚠️ SUSPICIOUS): Intermediate evasion
    // Noise injection or partial human sim = SUSPICIOUS (0.30-0.40)
    // ========================================

    test('5-minute timing-bot behavior', async ({ page }) => {
        // LEVEL 4: Gaussian timing but straight movements
        // Implementation: Box-Muller for timing, linear interpolation for movement
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'TIMING_BOT', 4);
    });

    test('5-minute mixed-random behavior', async ({ page }) => {
        // LEVEL 4: INCLUDES RobotBehavior in the rotation!
        // Implementation: Randomly switches between ALL behaviors including Robot
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'MIXED_RANDOM', 4);
    });

    test('5-minute stealth-bot behavior', async ({ page }) => {
        // LEVEL 5: Bezier + Math.sin() noise
        // Implementation: Bezier path + Math.sin(noisePhase) * 2 for jitter
        // Detectors: periodicNoise catches sinusoidal patterns
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'STEALTH_BOT', 5);
    });

    test('5-minute mouse-heavy behavior', async ({ page }) => {
        // LEVEL 5: MIXED - uses BOTH Bezier AND straight page.mouse.move()
        // Implementation: HumanBehavior.humanLikeMouseMove + page.mouse.move jitter
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'MOUSE_HEAVY', 5);
    });

    test('5-minute human-fast behavior', async ({ page }) => {
        // LEVEL 6: Fast Bezier movements
        // Implementation: HumanBehavior.humanLikeMouseMove with 10-20 steps
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_FAST', 6);
    });

    test('5-minute human-like + impulsive fast movements', async ({ page }) => {
        // LEVEL 6: Mix of HumanBehavior with impulsive bursts
        // Implementation: HumanBehavior for mouse, impulsive for scroll/keys
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: 0.30, maxExpectedScore: 0.40 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_IMPULSIVE', 6);
    });

    // ========================================
    // LEVEL 7-8 (👤 LIKELY HUMAN): Advanced human simulation
    // Full Bezier with timing variance = LIKELY HUMAN (0.15-0.30)
    // ========================================

    test('5-minute human-slow behavior', async ({ page }) => {
        // LEVEL 7: Slow Bezier movements with long pauses
        // Implementation: HumanBehavior.humanLikeMouseMove with 80-120 steps
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: 0.15, maxExpectedScore: 0.30 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SLOW', 7);
    });

    test('5-minute alternating burst/smooth with long pauses', async ({ page }) => {
        // LEVEL 7: Burst/Smooth phases with Bezier
        // Implementation: AlternatingBehavior with HumanBehavior.moveMouseHumanLike
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: 0.15, maxExpectedScore: 0.30 }
        );
        
        logDetectionResult(results.overallScore, 'ALTERNATING', 7);
    });

    test('5-minute human-like behavior session', async ({ page }) => {
        // LEVEL 8: Core HumanBehavior class
        // Implementation: Full Bezier simulation with timing jitter
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.15, maxExpectedScore: 0.30 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_LIKE', 8);
    });

    test('5-minute smooth behavior with timing jitter', async ({ page }) => {
        // LEVEL 8: SmoothBehavior with enhanced timing jitter
        // Implementation: HumanBehavior.moveMouseHumanLike with 100 steps
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: 0.15, maxExpectedScore: 0.30 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SMOOTH', 8);
    });

    // ========================================
    // LEVEL 9-10 (✅ VERIFIED): Expert/Ultimate
    // Most sophisticated = VERIFIED (<0.15) = cost barrier
    // ========================================

    test('5-minute advanced behavior with XY jitter', async ({ page }) => {
        // LEVEL 9: Most sophisticated human simulation
        // Implementation: Bezier + applyJitter() + burst/smooth/silence phases
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: 0.00, maxExpectedScore: 0.15 }
        );
        
        logDetectionResult(results.overallScore, 'ADVANCED', 9);
    });

    test('5-minute ultimate-bot behavior', async ({ page }) => {
        // LEVEL 10: THE MOST SOPHISTICATED EVASION BOT
        // Implementation: Perlin noise, Fitts's Law, fatigue, micro-saccades,
        //   attention decay, breathing rhythm, ex-Gaussian timing, overshoot+correction
        // This SHOULD evade detection - represents economic barrier for attackers
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: 0.00, maxExpectedScore: 0.15 }
        );
        
        logDetectionResult(results.overallScore, 'ULTIMATE_BOT', 10);
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
 */
function logDetectionResult(score, testName, sophisticationLevel) {
    const levelDesc = {
        1: '🤖 L1 (Naive: fixed timing, straight lines)',
        2: '🤖 L2 (Naive: straight lines, variable timing)',
        3: '🤖 L3 (Basic: limited signals, replay patterns)',
        4: '⚠️ L4 (Intermediate: Gaussian timing, mixed behaviors)',
        5: '⚠️ L5 (Stealth: Bezier+noise, partial human sim)',
        6: '⚠️ L6 (Basic Human: fast Bezier)',
        7: '👤 L7 (Full Human: slow Bezier with pauses)',
        8: '👤 L8 (Advanced Human: full Bezier+jitter)',
        9: '✅ L9 (Expert Human: Bezier+XY jitter+phases)',
        10: '✅ L10 (Ultimate: Perlin, Fitts, fatigue)'
    };
    
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
    
    const expected = expectedClass[sophisticationLevel] || '?';
    const match = expected === actualClass ? '✓' : '❌';
    
    console.log(`${testName} [${levelDesc[sophisticationLevel] || `Level ${sophisticationLevel}`}]: score=${score.toFixed(2)} → ${actualClass} (expected: ${expected}) ${match}`);
}


