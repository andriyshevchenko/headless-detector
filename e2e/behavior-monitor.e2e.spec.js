/**
 * Playwright E2E tests for behavior monitor
 * 
 * Tests different automation behavior patterns with INVERSE-SOPHISTICATION SCORING:
 * - Score is INVERSELY proportional to bot sophistication
 * - Naive bots (cheap to build) → HIGH scores (easily caught)
 * - Sophisticated bots (expensive to maintain) → LOW scores (harder to catch)
 * 
 * Classification Thresholds:
 * - 0.00-0.25: ✅ Human-like (should PASS for humans, FAIL for bots)
 * - 0.25-0.40: ⚠️ Suspicious
 * - 0.40-1.00: 🤖 Bot (should PASS for naive bots)
 * 
 * SOPHISTICATION LEVELS (from source code analysis):
 * Level 1: Naive bot - fixed timing, straight page.mouse.move()
 *   - robot: 100ms fixed, straight lines, uniform rotation
 *   - robot-slow: 500ms fixed, straight lines
 * Level 2: Naive with variance - straight lines + variable timing
 *   - robot-impulsive: straight lines, fast random timing
 *   - burst-only: straight page.mouse.move(), bursts
 *   - scroll-heavy: limited mouse signals
 *   - keyboard-heavy: limited mouse signals
 * Level 3: Basic stealth - pattern repetition
 *   - replay-bot: pre-recorded sequences
 * Level 4: Intermediate stealth - noise injection
 *   - stealth-bot: Math.sin() noise (detectable periodicity)
 *   - timing-bot: Gaussian timing but straight movements
 *   - mouse-heavy: MIX of Bezier + straight lines
 *   - mixed-random: INCLUDES RobotBehavior in rotation!
 * Level 5-7: Human simulations - HumanBehavior.humanLikeMouseMove (Bezier)
 *   - human-fast, human-impulsive: Bezier, fast
 *   - human-slow, alternating: Bezier, slow
 *   - human-like, human-smooth: Full Bezier simulation
 * Level 8: Expert human - Bezier + XY jitter + phases
 *   - advanced: Most sophisticated human simulation
 * Level 10: Ultimate bot - Perlin noise, Fitts's Law, fatigue, micro-saccades
 *   - ultimate-bot: Evades detection by design
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
    // NAIVE BOTS (Level 1)
    // Fixed timing + straight lines = MUST be caught (>= 0.40)
    // ========================================

    test('5-minute robot behavior - regular Playwright API', async ({ page }) => {
        // Level 1: MOST NAIVE
        // Implementation: 100ms fixed interval, page.mouse.move() straight lines, uniform action rotation
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
        // Level 1: NAIVE - just slower
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

    // ========================================
    // NAIVE WITH VARIANCE (Level 2)
    // Straight lines + variable timing = suspicious to bot (>= 0.30)
    // ========================================

    test('5-minute robot + impulsive fast movements', async ({ page }) => {
        // Level 2: Straight lines from ImpulsiveBehavior + random timing
        // Implementation: page.mouse.move() straight lines, randomBetween() timing
        // Detectors: straightLineRatio triggered, timing variance may reduce score
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: 0.30, maxExpectedScore: 0.75 }
        );
        
        logDetectionResult(results.overallScore, 'ROBOT_IMPULSIVE', 2);
    });

    test('5-minute burst-only behavior', async ({ page }) => {
        // Level 2: Rapid bursts with page.mouse.move() straight lines
        // Implementation: randomInt timing, page.mouse.move() in bursts
        // Detectors: straightLineRatio, may have timing variance
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: 0.30, maxExpectedScore: 0.70 }
        );
        
        logDetectionResult(results.overallScore, 'BURST_ONLY', 2);
    });

    test('5-minute scroll-heavy behavior', async ({ page }) => {
        // Level 2: Limited mouse signals - primarily scroll-based
        // Implementation: window.scrollBy only, minimal mouse
        // Detectors: Limited mouse signals = lower detection capability
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: 0.10, maxExpectedScore: 0.50 }
        );
        
        logDetectionResult(results.overallScore, 'SCROLL_HEAVY', 2);
    });

    test('5-minute keyboard-heavy behavior', async ({ page }) => {
        // Level 2: Limited mouse signals - primarily keyboard-based
        // Implementation: keyboard.press only, no mouse movements
        // Detectors: Limited mouse signals = lower detection capability
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: 0.10, maxExpectedScore: 0.50 }
        );
        
        logDetectionResult(results.overallScore, 'KEYBOARD_HEAVY', 2);
    });

    // ========================================
    // STEALTH BOTS (Level 3-4)
    // Noise injection or patterns = suspicious (0.25-0.55)
    // ========================================

    test('5-minute replay-bot behavior', async ({ page }) => {
        // Level 3: Pre-recorded patterns - too consistent across runs
        // Implementation: Fixed dx/dy patterns, modulo-based timing
        // Detectors: constantTiming, pattern repetition
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.65 }
        );
        
        logDetectionResult(results.overallScore, 'REPLAY_BOT', 3);
    });

    test('5-minute stealth-bot behavior', async ({ page }) => {
        // Level 4: Bezier curves + Math.sin() noise
        // Implementation: Bezier path + Math.sin(noisePhase) * 2 for jitter
        // Detectors: periodicNoise (autocorrelation catches sinusoidal patterns)
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.55 }
        );
        
        logDetectionResult(results.overallScore, 'STEALTH_BOT', 4);
    });

    test('5-minute timing-bot behavior', async ({ page }) => {
        // Level 4: Gaussian timing but straight-line movements
        // Implementation: Box-Muller for timing, linear interpolation for movement
        // Detectors: straightLineRatio catches linear movements
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.55 }
        );
        
        logDetectionResult(results.overallScore, 'TIMING_BOT', 4);
    });

    test('5-minute mouse-heavy behavior', async ({ page }) => {
        // Level 4: MIXED - uses BOTH Bezier AND straight page.mouse.move()
        // Implementation: HumanBehavior.humanLikeMouseMove + page.mouse.move jitter
        // The straight-line jitter moves may trigger detection
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: 0.15, maxExpectedScore: 0.45 }
        );
        
        logDetectionResult(results.overallScore, 'MOUSE_HEAVY', 4);
    });

    test('5-minute mixed-random behavior', async ({ page }) => {
        // Level 4: INCLUDES RobotBehavior in the rotation!
        // Implementation: Randomly switches between ALL behaviors including Robot
        // The robot segments will trigger detection
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: 0.20, maxExpectedScore: 0.50 }
        );
        
        logDetectionResult(results.overallScore, 'MIXED_RANDOM', 4);
    });

    // ========================================
    // HUMAN SIMULATIONS (Level 5-7)
    // Uses HumanBehavior.humanLikeMouseMove (Bezier curves)
    // Should score < 0.25 to avoid false positives
    // ========================================

    test('5-minute human-fast behavior', async ({ page }) => {
        // Level 5: Fast but uses HumanBehavior.humanLikeMouseMove (Bezier)
        // Implementation: Bezier curves with 10-20 steps, randomBetween timing
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_FAST', 5);
    });

    test('5-minute human-like + impulsive fast movements', async ({ page }) => {
        // Level 5: Mix of HumanBehavior with impulsive bursts
        // Implementation: HumanBehavior for mouse, impulsive for scroll/keys
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_IMPULSIVE', 5);
    });

    test('5-minute human-slow behavior', async ({ page }) => {
        // Level 6: Slow Bezier movements with long pauses
        // Implementation: HumanBehavior.humanLikeMouseMove with 80-120 steps
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SLOW', 6);
    });

    test('5-minute alternating burst/smooth with long pauses', async ({ page }) => {
        // Level 6: Burst/Smooth phases with Bezier
        // Implementation: AlternatingBehavior with HumanBehavior.moveMouseHumanLike
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'ALTERNATING', 6);
    });

    test('5-minute human-like behavior session', async ({ page }) => {
        // Level 7: Core HumanBehavior class
        // Implementation: Full Bezier simulation with timing jitter
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_LIKE', 7);
    });

    test('5-minute smooth behavior with timing jitter', async ({ page }) => {
        // Level 7: SmoothBehavior with enhanced timing jitter
        // Implementation: HumanBehavior.moveMouseHumanLike with 100 steps
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_SMOOTH', 7);
    });

    // ========================================
    // EXPERT HUMAN (Level 8)
    // Bezier + XY jitter + phases
    // ========================================

    test('5-minute advanced behavior with XY jitter', async ({ page }) => {
        // Level 8: Most sophisticated human simulation
        // Implementation: Bezier + applyJitter() + burst/smooth/silence phases
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'ADVANCED', 8);
    });

    // ========================================
    // ULTIMATE BOT (Level 10)
    // Perlin noise, Fitts's Law, fatigue, micro-saccades
    // Should EVADE detection (< 0.25) by design = cost barrier
    // ========================================

    test('5-minute ultimate-bot behavior', async ({ page }) => {
        // Level 10: THE MOST SOPHISTICATED EVASION BOT
        // Implementation: Perlin noise, Fitts's Law, fatigue, micro-saccades,
        //   attention decay, breathing rhythm, ex-Gaussian timing, overshoot+correction
        // This SHOULD evade detection - represents economic barrier for attackers
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'ULTIMATE_BOT', 10);
    });
});

/**
 * Log detection result with sophistication context
 * @param {number} score 
 * @param {string} testName
 * @param {number} sophisticationLevel
 */
function logDetectionResult(score, testName, sophisticationLevel) {
    const levelDesc = {
        1: '🤖 Level 1 (Naive - fixed timing, straight lines)',
        2: '🤖 Level 2 (Naive+Variance - straight lines, variable timing)',
        3: '🥷 Level 3 (Basic Stealth - pattern replay)',
        4: '🥷 Level 4 (Intermediate - noise/mixed)',
        5: '👤 Level 5 (Human Sim - fast Bezier)',
        6: '👤 Level 6 (Human Sim - slow Bezier)',
        7: '👤 Level 7 (Human Sim - full Bezier)',
        8: '👤 Level 8 (Expert Human - Bezier+jitter)',
        10: '🔥 Level 10 (Ultimate - Perlin, Fitts, fatigue)'
    };
    
    let verdict;
    if (score >= 0.40) {
        verdict = '🤖 BOT DETECTED';
    } else if (score >= 0.25) {
        verdict = '⚠️ SUSPICIOUS';
    } else {
        verdict = '✅ HUMAN-LIKE';
    }
    
    console.log(`${testName} [${levelDesc[sophisticationLevel] || `Level ${sophisticationLevel}`}]: score=${score.toFixed(2)} → ${verdict}`);
}


