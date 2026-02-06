/**
 * Playwright E2E tests for behavior monitor
 * 
 * LEVELS = CODE MAINTENANCE COST (not detection scores!)
 * The rationale: a hacker who wants to stay unseen must invest significant
 * time in bot implementation and maintenance. Levels reflect this cost.
 * 
 * 5-TIER CLASSIFICATION BY CODE MAINTENANCE COST:
 * - Level 1    → 💰 TRIVIAL (<10 min) - Copy-paste from Stack Overflow
 * - Level 2    → 💰 CHEAP (<30 min) - Simple loops, no math
 * - Level 3    → 💵 BUDGET (30min-1hr) - Basic randomization or pattern recording
 * - Level 4    → 💵 BUDGET (1-2hr) - Statistical distributions, linear interpolation
 * - Level 5    → 💵💵 MODERATE (2-4hr) - Bezier curves, composed behaviors
 * - Level 6    → 💵💵 MODERATE (4-8hr) - Noise injection, multi-behavior orchestration
 * - Level 7-8  → 💵💵💵 EXPENSIVE (days) - Full human simulation, phase management
 * - Level 9-10 → 💵💵💵💵 EXPERT (weeks+) - Research-level: Perlin, Fitts's Law, fatigue
 * 
 * NOTE: Low-cost bots may still evade detection! When a cheap bot (L2)
 * scores low, that reveals a detection gap—not bot sophistication.
 * Score expectations reflect what the algorithm ACTUALLY produces.
 * 
 * LEVELS BY CODE MAINTENANCE DIFFICULTY (from source code analysis):
 * 
 * LEVEL 1 (💰 TRIVIAL): Fixed timing, straight lines, 26 lines
 *   - robot: 100ms fixed interval, page.mouse.move() straight lines
 * 
 * LEVEL 2 (💰 CHEAP): Simple loops, no Bezier, no advanced math, <37 lines
 *   - impulsive: Burst patterns with rapid execution
 *   - robot-slow: Fixed 500ms, straight lines, interleaved channels
 *   - burst-only: Burst pattern, straight lines, 10-50ms inner timing
 *   - scroll-heavy: Mostly window.scrollBy() calls
 *   - keyboard-heavy: keyboard.press() only
 * 
 * LEVEL 3 (💵 BUDGET): Basic randomization or recorded patterns
 *   - robot-impulsive: Random timing + straight lines
 *   - replay-bot: Pre-recorded movement patterns, modulo cycling
 * 
 * LEVEL 4 (💵 BUDGET): Statistical distributions, linear interpolation
 *   - timing-bot: Box-Muller Gaussian timing, 5-step linear paths
 * 
 * LEVEL 5 (💵💵 MODERATE): Bezier curves, composed behaviors
 *   - human-fast: Fast Bezier (10-20 steps)
 *   - human-slow: Slow Bezier (80-120 steps)
 *   - mouse-heavy: Mix of Bezier + straight line jitter
 *   - human-impulsive: Bezier mouse + impulsive bursts composition
 * 
 * LEVEL 6 (💵💵 MODERATE): Noise injection or multi-behavior orchestration
 *   - stealth-bot: Bezier + Math.sin() noise
 *   - mixed-random: Cycles through 9 sub-behaviors randomly
 * 
 * LEVEL 7 (💵💵💵 EXPENSIVE): Full human simulation, phase management
 *   - alternating: Burst/smooth phases with Bezier, distraction pauses
 *   - human-like: Core HumanBehavior class, full Bezier simulation
 *   - human-smooth: SmoothBehavior, 100-step Bezier + multi-tier pauses
 * 
 * LEVEL 9 (💵💵💵💵 EXPERT): Multi-phase, XY jitter, silence evasion
 *   - advanced: Bezier + applyJitter() + burst/smooth/silence phases
 * 
 * LEVEL 10 (💵💵💵💵 EXPERT): Research-level behavioral science
 *   - ultimate-bot: Perlin noise, Fitts's Law, fatigue, micro-saccades,
 *     breathing rhythm, ex-Gaussian timing, attention decay
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
    // LEVEL 1-2 (💰 TRIVIAL/CHEAP): Simple bots
    // No Bezier, no advanced math, <37 lines of code
    // ========================================

    test('5-minute L1-naive-robot behavior', async ({ page }) => {
        // LEVEL 1 (💰 TRIVIAL): 26 lines, fixed 100ms, straight lines
        // Code: page.mouse.move() in loop with sleep(100)
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT', 1, minExp, maxExp);
    });

    test('5-minute L2-interleaved-actions behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP): 26 lines, fixed 500ms, straight lines, interleaved channels
        // Code: switch(randomInt(0,2)) → mouse.move/scrollBy/keyboard.press + sleep(500)
        // NOTE: Evades timing detection despite trivial code — detection gap
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_ACTIONS', 2, minExp, maxExp);
    });

    test('5-minute L3-impulsive-robot behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET): Random timing + straight lines
        // Code: page.mouse.move() straight lines, randomBetween() timing
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT', 3, minExp, maxExp);
    });

    test('5-minute L2-burst-pattern behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP): 30 lines, burst pattern, straight lines, no math
        // Code: nested loops with randomInt timing, page.mouse.move() in bursts
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_BURST_PATTERN', 2, minExp, maxExp);
    });

    // ========================================
    // LEVEL 2-4 (💰💵 CHEAP/BUDGET): Channel-focused or basic evasion
    // No Bezier, simple loops
    // ========================================

    test('5-minute L2-scroll-focused behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP): 34 lines, mostly window.scrollBy(), no Bezier
        // Code: 4 scroll types in switch, randomBetween() timing
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_SCROLL_FOCUSED', 2, minExp, maxExp);
    });

    test('5-minute L2-keyboard-focused behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP): 37 lines, keyboard.press() only, no Bezier
        // Code: 4 key press types in switch, randomBetween() timing
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_KEYBOARD_FOCUSED', 2, minExp, maxExp);
    });

    test('5-minute L3-replay-pattern behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET): 84 lines, pre-recorded patterns, no math
        // Code: Fixed dx/dy arrays, modulo-based cycling, pattern replay
        // NOTE: Evades detection despite simple recording — detection gap
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L3_REPLAY_PATTERN', 3, minExp, maxExp);
    });

    // ========================================
    // LEVEL 4-6 (💵💵 BUDGET/MODERATE): Statistical evasion or Bezier
    // Requires math knowledge or curve generation
    // ========================================

    test('5-minute L4-gaussian-timing behavior', async ({ page }) => {
        // LEVEL 4 (💵 BUDGET): Box-Muller Gaussian timing, 5-step linear paths
        // Code: Math.sqrt(-2*Math.log(u))*Math.cos(2*PI*v), linear interpolation
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L4_GAUSSIAN_TIMING', 4, minExp, maxExp);
    });

    test('5-minute L6-mixed-behaviors', async ({ page }) => {
        // LEVEL 6 (💵💵 MODERATE): Orchestrates 9 sub-behaviors randomly
        // Code: behaviors[randomInt(0,8)].performRandomActions() in 5-20s segments
        // NOTE: Cheap code but requires ALL sub-behaviors — moderate total investment
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L6_MIXED_BEHAVIORS', 6, minExp, maxExp);
    });

    test('5-minute L6-bezier-with-noise behavior', async ({ page }) => {
        // LEVEL 6 (💵💵 MODERATE): Bezier + Math.sin() deterministic noise
        // Code: Cubic Bezier with sin/cos noise on each step, weighted action selection
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L6_BEZIER_WITH_NOISE', 6, minExp, maxExp);
    });

    test('5-minute L5-mouse-focused behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE): Mix of Bezier (20-100 steps) + straight jitter
        // Code: HumanBehavior.humanLikeMouseMove + page.mouse.move jitter
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_MOUSE_FOCUSED', 5, minExp, maxExp);
    });

    test('5-minute L5-fast-bezier behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE): Fast Bezier movements (10-20 steps)
        // Code: HumanBehavior.humanLikeMouseMove with low step count
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_FAST_BEZIER', 5, minExp, maxExp);
    });

    test('5-minute L5-impulsive-bezier behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE): Bezier mouse + impulsive keyboard/scroll
        // Code: performMixedActions(HumanBehavior, ImpulsiveBehavior) in 5s segments
        const minExp = 0.10, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_IMPULSIVE_BEZIER', 5, minExp, maxExp);
    });

    // ========================================
    // LEVEL 5-7 (💵💵💵 MODERATE/EXPENSIVE): Full Bezier simulation
    // Requires understanding of curves, timing jitter, phase management
    // ========================================

    test('5-minute L5-slow-bezier behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE): Slow Bezier (80-120 steps) + reading pauses
        // Code: HumanBehavior.humanLikeMouseMove with high step count
        const minExp = 0.25, maxExp = 0.45;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_SLOW_BEZIER', 5, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE): Burst/Smooth phase transitions with Bezier
        // Code: AlternatingBehavior with phase management, distraction pauses
        const minExp = 0.15, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_PHASE_ALTERNATING', 7, minExp, maxExp);
    });

    test('5-minute L7-full-human-sim behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE): Core HumanBehavior class
        // Code: Full Bezier simulation with weighted actions, timing jitter
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_FULL_HUMAN_SIM', 7, minExp, maxExp);
    });

    test('5-minute L7-smooth-bezier behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE): SmoothBehavior, 100-step Bezier
        // Code: HumanBehavior.moveMouseHumanLike + multi-tier pause logic
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L7_SMOOTH_BEZIER', 7, minExp, maxExp);
    });

    // ========================================
    // LEVEL 9-10 (💵💵💵💵 EXPERT): Research-level evasion
    // Requires behavioral science expertise = weeks+ of work
    // ========================================

    test('5-minute L9-advanced-human behavior', async ({ page }) => {
        // LEVEL 9 (💵💵💵💵 EXPERT): 3-phase orchestration, XY jitter, silence evasion
        // Code: Bezier + applyJitter() + burst/smooth/silence phase management
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
        // LEVEL 10 (💵💵💵💵 EXPERT): Research-level behavioral science
        // Code: Perlin noise, Fitts's Law, fatigue, micro-saccades,
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

    // --- LEVEL 1-2: Additional variants (3 more) ---
    
    test('5-minute L1-naive-robot-v2 behavior', async ({ page }) => {
        // LEVEL 1 (💰 TRIVIAL) variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT_V2', 1, minExp, maxExp);
    });

    test('5-minute L2-fast-robot behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP): Burst patterns with rapid execution
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_FAST_ROBOT', 2, minExp, maxExp);
    });

    test('5-minute L2-fast-robot-v2 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_FAST_ROBOT_V2', 2, minExp, maxExp);
    });

    // --- LEVEL 3: Additional BUDGET variants - ROBOT_IMPULSIVE (2 more) ---
    
    test('5-minute L3-impulsive-robot-v2 behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT_V2', 3, minExp, maxExp);
    });

    test('5-minute L3-impulsive-robot-v3 behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_IMPULSIVE_ROBOT_V3', 3, minExp, maxExp);
    });

    // --- LEVEL 2: Additional CHEAP variants (2 more BURST_ONLY) ---
    
    test('5-minute L2-burst-pattern-v2 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_BURST_PATTERN_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-burst-pattern-v3 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_BURST_PATTERN_V3', 2, minExp, maxExp);
    });

    test('5-minute L3-replay-pattern-v2 behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_REPLAY_PATTERN_V2', 3, minExp, maxExp);
    });

    test('5-minute L3-replay-pattern-v3 behavior', async ({ page }) => {
        // LEVEL 3 (💵 BUDGET) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_REPLAY_PATTERN_V3', 3, minExp, maxExp);
    });

    // --- LEVEL 2-6: Additional variants (6 more) ---
    
    test('5-minute L2-interleaved-actions-v2 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-interleaved-actions-v3 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_V3', 2, minExp, maxExp);
    });

    test('5-minute L4-gaussian-timing-v2 behavior', async ({ page }) => {
        // LEVEL 4 (💵 BUDGET) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_GAUSSIAN_TIMING_V2', 4, minExp, maxExp);
    });

    test('5-minute L6-mixed-behaviors-v2 behavior', async ({ page }) => {
        // LEVEL 6 (💵💵 MODERATE) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_MIXED_V2', 6, minExp, maxExp);
    });

    test('5-minute L2-keyboard-focused-v2 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_KEYBOARD_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-scroll-focused-v2 behavior', async ({ page }) => {
        // LEVEL 2 (💰 CHEAP) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_SCROLL_V2', 2, minExp, maxExp);
    });

    // --- LEVEL 6: Additional STEALTH variants (4 more) ---
    
    test('5-minute L6-bezier-with-noise-v2 behavior', async ({ page }) => {
        // LEVEL 6 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_BEZIER_NOISE_V2', 6, minExp, maxExp);
    });

    test('5-minute L6-bezier-with-noise-v3 behavior', async ({ page }) => {
        // LEVEL 6 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_BEZIER_NOISE_V3', 6, minExp, maxExp);
    });

    test('5-minute L5-mouse-focused-v2 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_MOUSE_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-mouse-focused-v3 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_MOUSE_V3', 5, minExp, maxExp);
    });

    // --- LEVEL 5-7: Additional variants (6 more) ---
    
    test('5-minute L5-fast-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_FAST_BEZIER_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-fast-bezier-v3 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_FAST_BEZIER_V3', 5, minExp, maxExp);
    });

    test('5-minute L5-slow-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.25, maxExp = 0.45;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_SLOW_BEZIER_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-impulsive-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 5 (💵💵 MODERATE) variant
        const minExp = 0.10, maxExp = 0.30;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_IMPULSIVE_BEZIER_V2', 5, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating-v2 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_ALTERNATING_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-phase-alternating-v3 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_ALTERNATING_V3', 7, minExp, maxExp);
    });

    // --- LEVEL 7: Additional EXPENSIVE variants (4 more) ---
    
    test('5-minute L7-full-human-sim-v2 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_HUMAN_SIM_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-full-human-sim-v3 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_HUMAN_SIM_V3', 7, minExp, maxExp);
    });

    test('5-minute L7-smooth-bezier-v2 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_SMOOTH_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-smooth-bezier-v3 behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE) variant
        const minExp = 0.15, maxExp = 0.35;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_SMOOTH_V3', 7, minExp, maxExp);
    });

    // --- LEVEL 9-10: Additional EXPERT variants (2 more) ---
    
    test('5-minute L9-advanced-human-v2 behavior', async ({ page }) => {
        // LEVEL 9 (💵💵💵💵 EXPERT) variant
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ADVANCED,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L9_ADVANCED_V2', 9, minExp, maxExp);
    });

    test('5-minute L10-ultimate-evasion-v2 behavior', async ({ page }) => {
        // LEVEL 10 (💵💵💵💵 EXPERT) variant
        const minExp = 0.00, maxExp = 0.15;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L10_ULTIMATE_V2', 10, minExp, maxExp);
    });
});

/**
 * Log detection result with code maintenance cost context
 * 
 * CLASSIFICATION BY CODE MAINTENANCE COST:
 * - Level 1    → 💰 TRIVIAL (<10 min)
 * - Level 2    → 💰 CHEAP (<30 min)
 * - Level 3-4  → 💵 BUDGET (30min-2hr)
 * - Level 5-6  → 💵💵 MODERATE (2-8hr)
 * - Level 7-8  → 💵💵💵 EXPENSIVE (days)
 * - Level 9-10 → 💵💵💵💵 EXPERT (weeks+)
 * 
 * @param {number} score 
 * @param {string} testName
 * @param {number} sophisticationLevel - code maintenance difficulty (1=trivial, 10=expert)
 * @param {number} minExpected - minimum expected score
 * @param {number} maxExpected - maximum expected score
 */
function logDetectionResult(score, testName, sophisticationLevel, minExpected, maxExpected) {
    // Cost tier by level (based on code maintenance difficulty)
    const costTier = {
        1: '💰 TRIVIAL', 2: '💰 CHEAP',
        3: '💵 BUDGET', 4: '💵 BUDGET',
        5: '💵💵 MODERATE', 6: '💵💵 MODERATE',
        7: '💵💵💵 EXPENSIVE', 8: '💵💵💵 EXPENSIVE',
        9: '💵💵💵💵 EXPERT', 10: '💵💵💵💵 EXPERT'
    };
    
    // Detection classification by score
    let detectionClass;
    if (score >= 0.40) {
        detectionClass = '🤖 BOT';
    } else if (score >= 0.25) {
        detectionClass = '⚠️ SUSPICIOUS';
    } else if (score >= 0.10) {
        detectionClass = '👤 LIKELY_HUMAN';
    } else {
        detectionClass = '✅ VERIFIED';
    }
    
    const tier = costTier[sophisticationLevel] || '?';
    const inRange = score >= minExpected && score <= maxExpected;
    const inRangeSymbol = inRange ? '✓' : '❌';
    
    // Flag detection gaps: cheap code (L1-3) with low scores
    const isDetectionGap = sophisticationLevel <= 3 && score < 0.40;
    const gapFlag = isDetectionGap ? ' ⚠️ DETECTION_GAP' : '';
    
    console.log(`[${testName}] Level=${sophisticationLevel} (${tier}) | Score=${score.toFixed(2)} | Expected=[${minExpected.toFixed(2)}-${maxExpected.toFixed(2)}] ${inRangeSymbol} | Detection=${detectionClass}${gapFlag}`);
    
    // ASSERT: Fail the test if score is outside expected range
    if (!inRange) {
        throw new Error(
            `SCORE OUT OF RANGE: ${testName} scored ${score.toFixed(2)} but expected ${minExpected.toFixed(2)}-${maxExpected.toFixed(2)} for Level ${sophisticationLevel} (${tier})`
        );
    }
}


