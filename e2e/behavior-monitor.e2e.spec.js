/**
 * Playwright E2E tests for behavior monitor
 * 
 * Tests different automation behavior patterns with INVERSE-SOPHISTICATION SCORING:
 * - Score is INVERSELY proportional to bot sophistication level
 * - Naive bots (cheap to build) → HIGH scores (easily caught)
 * - Sophisticated bots (expensive to maintain) → LOW scores (harder to catch)
 * 
 * 4-TIER CLASSIFICATION BY LEVEL:
 * - Level 1-3  → 🤖 BOT (≥0.40) - Naive: fixed timing, straight lines
 * - Level 4-6  → ⚠️ SUSPICIOUS (0.30-0.40) - Some evasion: variable timing
 * - Level 7-8  → 👤 LIKELY_HUMAN (0.15-0.30) - Full Bezier curves
 * - Level 9-10 → ✅ VERIFIED (<0.15) - Expert evasion, cost barrier
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

    test('5-minute L1-naive-robot behavior', async ({ page }) => {
        // LEVEL 1: MOST NAIVE → 🤖 BOT (≥0.40)
        // Implementation: 100ms fixed interval, page.mouse.move() straight lines
        // Detectors: constantTiming + straightLineRatio + lowTimingVariance + naiveMultiplier
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT', 1, minExp, maxExp);
    });

    test('5-minute L5-interleaved-actions behavior', async ({ page }) => {
        // LEVEL 5: Interleaved actions defeat mouse-based timing detection → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: Random interleave of mouse/keyboard/scroll at 500ms each
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_INTERLEAVED_ACTIONS', 5, minExp, maxExp);
    });

    test('5-minute L3-impulsive-robot behavior', async ({ page }) => {
        // LEVEL 3: Straight lines but random timing → 🤖 BOT (≥0.40)
        // Implementation: page.mouse.move() straight lines, randomBetween() timing
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT', 3, minExp, maxExp);
    });

    test('5-minute L4-burst-pattern behavior', async ({ page }) => {
        // LEVEL 4: Burst pattern with random gaps → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: randomInt timing, page.mouse.move() in bursts
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L4_BURST_PATTERN', 4, minExp, maxExp);
    });

    // ========================================
    // LEVEL 5 (⚠️ SUSPICIOUS): Limited detection signals
    // Tests with minimal mouse = lower scores (0.10-0.25)
    // ========================================

    test('5-minute L5-scroll-focused behavior', async ({ page }) => {
        // LEVEL 5: Minimal mouse signals - scroll-based automation → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: window.scrollBy, limited mouse events
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_SCROLL_FOCUSED', 5, minExp, maxExp);
    });

    test('5-minute L5-keyboard-focused behavior', async ({ page }) => {
        // LEVEL 5: Minimal mouse signals - keyboard automation → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: keyboard.press only, limited mouse movements
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_KEYBOARD_FOCUSED', 5, minExp, maxExp);
    });

    test('5-minute L4-replay-pattern behavior', async ({ page }) => {
        // LEVEL 4: Pre-recorded movement patterns → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: Fixed dx/dy patterns, modulo-based timing
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L4_REPLAY_PATTERN', 4, minExp, maxExp);
    });

    // ========================================
    // LEVEL 4-6 (⚠️ SUSPICIOUS): Intermediate evasion
    // Noise injection or partial human sim = SUSPICIOUS (0.15-0.35)
    // ========================================

    test('5-minute L5-gaussian-timing behavior', async ({ page }) => {
        // LEVEL 5: Gaussian timing but straight movements → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: Box-Muller for timing, linear interpolation
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_GAUSSIAN_TIMING', 5, minExp, maxExp);
    });

    test('5-minute L5-mixed-behaviors', async ({ page }) => {
        // LEVEL 5: Cycles through ALL behaviors including Robot → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: Randomly switches between behaviors
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_MIXED_BEHAVIORS', 5, minExp, maxExp);
    });

    test('5-minute L6-bezier-with-noise behavior', async ({ page }) => {
        // LEVEL 6: Bezier + Math.sin() noise → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: Bezier path + sinusoidal jitter
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L6_BEZIER_WITH_NOISE', 6, minExp, maxExp);
    });

    test('5-minute L6-mouse-focused behavior', async ({ page }) => {
        // LEVEL 6: MIXED - uses BOTH Bezier AND straight page.mouse.move() → ⚠️ SUSPICIOUS (0.30-0.40)
        // Implementation: HumanBehavior.humanLikeMouseMove + page.mouse.move jitter
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L6_MOUSE_FOCUSED', 6, minExp, maxExp);
    });

    test('5-minute L7-fast-bezier behavior', async ({ page }) => {
        // LEVEL 7: Fast Bezier movements → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: HumanBehavior.humanLikeMouseMove with 10-20 steps
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_FAST_BEZIER', 7, minExp, maxExp);
    });

    test('5-minute L7-impulsive-bezier behavior', async ({ page }) => {
        // LEVEL 7: Mix of HumanBehavior with impulsive bursts → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: HumanBehavior for mouse, impulsive for scroll/keys
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_IMPULSIVE_BEZIER', 7, minExp, maxExp);
    });

    // ========================================
    // LEVEL 7-8 (👤 LIKELY HUMAN): Advanced human simulation
    // Full Bezier with timing variance = LIKELY HUMAN (0.10-0.30)
    // ========================================

    test('5-minute L7-slow-bezier behavior', async ({ page }) => {
        // LEVEL 7: Slow Bezier movements with long pauses → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: HumanBehavior.humanLikeMouseMove with 80-120 steps
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_SLOW_BEZIER', 7, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating behavior', async ({ page }) => {
        // LEVEL 7: Burst/Smooth phases with Bezier → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: AlternatingBehavior with HumanBehavior.moveMouseHumanLike
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_PHASE_ALTERNATING', 7, minExp, maxExp);
    });

    test('5-minute L8-full-human-sim behavior', async ({ page }) => {
        // LEVEL 8: Core HumanBehavior class → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: Full Bezier simulation with timing jitter
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L8_FULL_HUMAN_SIM', 8, minExp, maxExp);
    });

    test('5-minute L8-smooth-bezier behavior', async ({ page }) => {
        // LEVEL 8: SmoothBehavior with enhanced timing jitter → 👤 LIKELY_HUMAN (0.15-0.30)
        // Implementation: HumanBehavior.moveMouseHumanLike with 100 steps
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L8_SMOOTH_BEZIER', 8, minExp, maxExp);
    });

    // ========================================
    // LEVEL 9-10 (✅ VERIFIED): Expert/Ultimate
    // Most sophisticated = VERIFIED (<0.15) = cost barrier
    // ========================================

    test('5-minute L9-advanced-human behavior', async ({ page }) => {
        // LEVEL 9: Sophisticated human simulation → ✅ VERIFIED (<0.15)
        // Implementation: Bezier + applyJitter() + burst/smooth/silence phases
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L9_ADVANCED_HUMAN', 9, minExp, maxExp);
    });

    test('5-minute L10-ultimate-evasion behavior', async ({ page }) => {
        // LEVEL 10: THE MOST SOPHISTICATED EVASION BOT → ✅ VERIFIED (<0.15)
        // Implementation: Perlin noise, Fitts's Law, fatigue, micro-saccades,
        //   attention decay, breathing rhythm, ex-Gaussian timing, overshoot+correction
        // This SHOULD evade detection - represents economic barrier for attackers
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L10_ULTIMATE_EVASION', 10, minExp, maxExp);
    });

    // ========================================
    // RANDOMIZED VARIANTS - 31 additional tests for 50 total
    // Each variant uses different random seeds for statistical validation
    // ========================================

    // --- LEVEL 1-2: Additional BOT variants (3 more) ---
    
    test('5-minute L1-naive-robot-v2 behavior', async ({ page }) => {
        // LEVEL 1 variant with different random seed → 🤖 BOT (≥0.40)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT_V2', 1, minExp, maxExp);
    });

    test('5-minute L2-fast-robot behavior', async ({ page }) => {
        // LEVEL 2: Impulsive without Bezier → 🤖 BOT (≥0.40)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_FAST_ROBOT', 2, minExp, maxExp);
    });

    test('5-minute L2-fast-robot-v2 behavior', async ({ page }) => {
        // LEVEL 2 variant → 🤖 BOT (≥0.40)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_FAST_ROBOT_V2', 2, minExp, maxExp);
    });

    // --- LEVEL 3: Additional BOT variants (2 more) ---
    
    test('5-minute L3-impulsive-robot-v2 behavior', async ({ page }) => {
        // LEVEL 3 variant → 🤖 BOT (≥0.40)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT_V2', 3, minExp, maxExp);
    });

    test('5-minute L3-impulsive-robot-v3 behavior', async ({ page }) => {
        // LEVEL 3 variant → 🤖 BOT (≥0.40)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT_V3', 3, minExp, maxExp);
    });

    // --- LEVEL 4: Additional SUSPICIOUS variants (4 more) ---
    
    test('5-minute L4-burst-pattern-v2 behavior', async ({ page }) => {
        // LEVEL 4 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_BURST_PATTERN_V2', 4, minExp, maxExp);
    });

    test('5-minute L4-burst-pattern-v3 behavior', async ({ page }) => {
        // LEVEL 4 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_BURST_PATTERN_V3', 4, minExp, maxExp);
    });

    test('5-minute L4-replay-pattern-v2 behavior', async ({ page }) => {
        // LEVEL 4 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_REPLAY_PATTERN_V2', 4, minExp, maxExp);
    });

    test('5-minute L4-replay-pattern-v3 behavior', async ({ page }) => {
        // LEVEL 4 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_REPLAY_PATTERN_V3', 4, minExp, maxExp);
    });

    // --- LEVEL 5: Additional SUSPICIOUS variants (6 more) ---
    
    test('5-minute L5-interleaved-actions-v2 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_INTERLEAVED_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-interleaved-actions-v3 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_INTERLEAVED_V3', 5, minExp, maxExp);
    });

    test('5-minute L5-gaussian-timing-v2 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_GAUSSIAN_TIMING_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-mixed-behaviors-v2 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_MIXED_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-keyboard-focused-v2 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_KEYBOARD_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-scroll-focused-v2 behavior', async ({ page }) => {
        // LEVEL 5 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_SCROLL_V2', 5, minExp, maxExp);
    });

    // --- LEVEL 6: Additional SUSPICIOUS variants (4 more) ---
    
    test('5-minute L6-bezier-with-noise-v2 behavior', async ({ page }) => {
        // LEVEL 6 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_BEZIER_NOISE_V2', 6, minExp, maxExp);
    });

    test('5-minute L6-bezier-with-noise-v3 behavior', async ({ page }) => {
        // LEVEL 6 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_BEZIER_NOISE_V3', 6, minExp, maxExp);
    });

    test('5-minute L6-mouse-focused-v2 behavior', async ({ page }) => {
        // LEVEL 6 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_MOUSE_V2', 6, minExp, maxExp);
    });

    test('5-minute L6-mouse-focused-v3 behavior', async ({ page }) => {
        // LEVEL 6 variant → ⚠️ SUSPICIOUS (0.30-0.40)
        const minExp = 0.30, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_MOUSE_V3', 6, minExp, maxExp);
    });

    // --- LEVEL 7: Additional LIKELY_HUMAN variants (6 more) ---
    
    test('5-minute L7-fast-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_FAST_BEZIER_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-fast-bezier-v3 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_FAST_BEZIER_V3', 7, minExp, maxExp);
    });

    test('5-minute L7-slow-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_SLOW_BEZIER_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-impulsive-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_IMPULSIVE_BEZIER_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating-v2 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_ALTERNATING_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating-v3 behavior', async ({ page }) => {
        // LEVEL 7 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_ALTERNATING_V3', 7, minExp, maxExp);
    });

    // --- LEVEL 8: Additional LIKELY_HUMAN variants (4 more) ---
    
    test('5-minute L8-full-human-sim-v2 behavior', async ({ page }) => {
        // LEVEL 8 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L8_HUMAN_SIM_V2', 8, minExp, maxExp);
    });

    test('5-minute L8-full-human-sim-v3 behavior', async ({ page }) => {
        // LEVEL 8 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L8_HUMAN_SIM_V3', 8, minExp, maxExp);
    });

    test('5-minute L8-smooth-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 8 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L8_SMOOTH_V2', 8, minExp, maxExp);
    });

    test('5-minute L8-smooth-bezier-v3 behavior', async ({ page }) => {
        // LEVEL 8 variant → 👤 LIKELY_HUMAN (0.15-0.30)
        const minExp = 0.15, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L8_SMOOTH_V3', 8, minExp, maxExp);
    });

    // --- LEVEL 9-10: Additional VERIFIED variants (2 more) ---
    
    test('5-minute L9-advanced-human-v2 behavior', async ({ page }) => {
        // LEVEL 9 variant → ✅ VERIFIED (<0.15)
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ADVANCED,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L9_ADVANCED_V2', 9, minExp, maxExp);
    });

    test('5-minute L10-ultimate-evasion-v2 behavior', async ({ page }) => {
        // LEVEL 10 variant → ✅ VERIFIED (<0.15)
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L10_ULTIMATE_V2', 10, minExp, maxExp);
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


