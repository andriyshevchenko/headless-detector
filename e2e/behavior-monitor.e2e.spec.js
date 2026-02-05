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
 * Sophistication Levels:
 * - Level 1: Naive bot (robot, robot-slow) - fixed timing, straight lines
 * - Level 2: Naive with variance (robot-impulsive, burst-only)
 * - Level 3: Basic stealth (replay-bot) - pre-recorded patterns
 * - Level 4: Intermediate stealth (stealth-bot, timing-bot) - sinusoidal noise, Gaussian timing
 * - Level 5-7: Human simulations (human-*) - Bezier curves, timing jitter
 * - Level 8: Expert human (advanced) - XY jitter, phases
 * - Level 10: Ultimate bot - Perlin noise, Fitts's Law, fatigue, micro-saccades
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
    // HUMAN SIMULATIONS (Level 5-8)
    // Should score LOW (< 0.25) - must NOT be flagged as bots
    // ========================================

    test('5-minute human-like behavior session', async ({ page }) => {
        // Level 7: Advanced human simulation with Bezier curves
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        logDetectionResult(results.overallScore, 'HUMAN_LIKE', 7);
    });

    test('5-minute smooth behavior with timing jitter', async ({ page }) => {
        // Level 7: Smooth, slow movements with enhanced timing jitter
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Smooth behavior with timing jitter test');
        logDetectionResult(results.overallScore, 'HUMAN_SMOOTH', 7);
    });

    test('5-minute alternating burst/smooth with long pauses', async ({ page }) => {
        // Level 6: Alternating between fast/jerky and smooth/slow with pauses
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Alternating burst/smooth behavior with long pauses');
        logDetectionResult(results.overallScore, 'ALTERNATING', 6);
    });

    test('5-minute advanced behavior with XY jitter', async ({ page }) => {
        // Level 8: Most sophisticated human simulation with XY jitter
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Advanced behavior with XY jitter on Bezier movements');
        logDetectionResult(results.overallScore, 'ADVANCED', 8);
    });

    test('5-minute human-fast behavior', async ({ page }) => {
        // Level 5: Human-like but with faster, more energetic movements
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Human-fast behavior test');
        logDetectionResult(results.overallScore, 'HUMAN_FAST', 5);
    });

    test('5-minute human-slow behavior', async ({ page }) => {
        // Level 6: Human-like but with slower, careful movements
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Human-slow behavior test');
        logDetectionResult(results.overallScore, 'HUMAN_SLOW', 6);
    });

    test('5-minute human-like + impulsive fast movements', async ({ page }) => {
        // Level 5: Mix of human-like behavior with rapid impulsive bursts
        // Must score < 0.25 to avoid false positive
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Human + impulsive behavior test');
        logDetectionResult(results.overallScore, 'HUMAN_IMPULSIVE', 5);
    });

    // ========================================
    // NAIVE BOTS (Level 1-2)
    // Should score HIGH (>= 0.40) - must be flagged as bots
    // ========================================

    test('5-minute robot behavior - regular Playwright API', async ({ page }) => {
        // Level 1: MOST NAIVE - fixed 100ms timing, straight lines
        // Must score >= 0.40 to be caught as bot
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        console.log('✓ Robot behavior test - using regular Playwright API');
        logDetectionResult(results.overallScore, 'ROBOT', 1);
    });

    test('5-minute robot-slow behavior', async ({ page }) => {
        // Level 1: Naive - fixed 500ms timing, straight lines
        // constantTiming detection should catch this
        // Must score >= 0.40 to be caught as bot
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: 0.40, maxExpectedScore: 1.0 }
        );
        
        console.log('✓ Robot-slow behavior test');
        logDetectionResult(results.overallScore, 'ROBOT_SLOW', 1);
    });

    test('5-minute robot + impulsive fast movements', async ({ page }) => {
        // Level 2: Naive with variance - straight lines but variable timing
        // Should score >= 0.35 (suspicion or bot range)
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: 0.35, maxExpectedScore: 0.80 }
        );
        
        console.log('✓ Robot + impulsive behavior test');
        logDetectionResult(results.overallScore, 'ROBOT_IMPULSIVE', 2);
    });

    test('5-minute burst-only behavior', async ({ page }) => {
        // Level 2: Mixed naive - rapid bursts with straight lines
        // Should score >= 0.30 (suspicious or higher)
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: 0.30, maxExpectedScore: 0.70 }
        );
        
        console.log('✓ Burst-only behavior test');
        logDetectionResult(results.overallScore, 'BURST_ONLY', 2);
    });

    // ========================================
    // MIXED/LIMITED SIGNAL BEHAVIORS
    // Variable expected scores based on available signals
    // ========================================

    test('5-minute scroll-heavy behavior', async ({ page }) => {
        // Limited mouse signals - scroll variance matters
        // Lower expectations due to limited detection signals
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: 0.10, maxExpectedScore: 0.45 }
        );
        
        console.log('✓ Scroll-heavy behavior test');
        logDetectionResult(results.overallScore, 'SCROLL_HEAVY', 2);
    });

    test('5-minute mouse-heavy behavior', async ({ page }) => {
        // Uses HumanBehavior.humanLikeMouseMove - Bezier curves
        // Should score like human simulation
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Mouse-heavy behavior test');
        logDetectionResult(results.overallScore, 'MOUSE_HEAVY', 5);
    });

    test('5-minute keyboard-heavy behavior', async ({ page }) => {
        // Limited mouse signals - keyboard variance matters
        // Lower expectations due to limited detection signals
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: 0.15, maxExpectedScore: 0.50 }
        );
        
        console.log('✓ Keyboard-heavy behavior test');
        logDetectionResult(results.overallScore, 'KEYBOARD_HEAVY', 2);
    });

    test('5-minute mixed-random behavior', async ({ page }) => {
        // Randomly switches between all modes including human behaviors
        // Expect moderate scores due to mix
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: 0.00, maxExpectedScore: 0.35 }
        );
        
        console.log('✓ Mixed-random behavior test');
        logDetectionResult(results.overallScore, 'MIXED_RANDOM', 6);
    });

    // ========================================
    // STEALTH BOTS (Level 3-4)
    // Should score MODERATE (0.25-0.55) - suspicious range
    // ========================================

    test('5-minute stealth-bot behavior', async ({ page }) => {
        // Level 4: Bezier curves + Math.sin() noise (detectable periodicity)
        // periodicNoise detection should catch sinusoidal patterns
        // Should score >= 0.25 (suspicious) but < 0.55
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.55 }
        );
        
        console.log('✓ Stealth-bot behavior test');
        logDetectionResult(results.overallScore, 'STEALTH_BOT', 4);
    });

    test('5-minute replay-bot behavior', async ({ page }) => {
        // Level 3: Pre-recorded patterns - too consistent across runs
        // constantTiming detection should catch predictable patterns
        // Should score >= 0.30 (suspicious) but < 0.65
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: 0.30, maxExpectedScore: 0.65 }
        );
        
        console.log('✓ Replay-bot behavior test');
        logDetectionResult(results.overallScore, 'REPLAY_BOT', 3);
    });

    test('5-minute timing-bot behavior', async ({ page }) => {
        // Level 4: Gaussian timing but straight-line movements
        // highStraightLineRatio detection should catch mechanical movement
        // Should score >= 0.25 (suspicious) but < 0.55
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.55 }
        );
        
        console.log('✓ Timing-bot behavior test');
        logDetectionResult(results.overallScore, 'TIMING_BOT', 4);
    });

    // ========================================
    // ULTIMATE BOT (Level 10)
    // Should score LOW (< 0.25) - evades detection
    // This is BY DESIGN - it represents the cost barrier for attackers
    // ========================================

    test('5-minute ultimate-bot behavior', async ({ page }) => {
        // Level 10: THE MOST SOPHISTICATED EVASION BOT
        // Perlin noise (not sinusoidal), Fitts's Law, fatigue, micro-saccades,
        // attention decay, breathing rhythm, ex-Gaussian timing, overshoot+correction
        // 
        // This SHOULD evade detection - it represents the economic barrier:
        // Only attackers willing to invest in this level of sophistication can evade.
        // If this scores >= 0.25, the detection is catching even the best bots!
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: 0.00, maxExpectedScore: 0.25 }
        );
        
        console.log('✓ Ultimate-bot behavior test (most advanced evasion)');
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
        1: '🤖 Level 1 (Naive)',
        2: '🤖 Level 2 (Naive+Variance)',
        3: '🥷 Level 3 (Basic Stealth)',
        4: '🥷 Level 4 (Intermediate Stealth)',
        5: '👤 Level 5 (Human Sim)',
        6: '👤 Level 6 (Quality Human)',
        7: '👤 Level 7 (Advanced Human)',
        8: '👤 Level 8 (Expert Human)',
        10: '🔥 Level 10 (Ultimate)'
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

