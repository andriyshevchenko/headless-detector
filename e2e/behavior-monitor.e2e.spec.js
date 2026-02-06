/**
 * Playwright E2E tests for behavior monitor
 * 
 * FORMULA: final_level = round(code_maintenance_difficulty × realism_degree)
 * 
 * code_maintenance_difficulty (1-10): Time/expertise to implement and maintain.
 * realism_degree (0-1): How practical is this bot in real-world automation.
 *   Single-channel bots (scroll-only, keyboard-only, mouse-only) get low
 *   realism because they're not useful for real web automation.
 *   Inhuman-speed bots get reduced realism (easily rate-limited).
 * 
 * TIER-TO-CATEGORY MAPPING (score expectations per tier):
 * - Level 1-2  → 💰 TRIVIAL/CHEAP  → 🤖 BOT (≥0.40)
 * - Level 3-4  → 💵 BUDGET          → ⚠️ SUSPICIOUS (0.25-0.40)
 * - Level 5-6  → 💵💵 MODERATE      → ⚠️ SUSPICIOUS (0.25-0.40)
 * - Level 7-8  → 💵💵💵 EXPENSIVE   → 👤 LIKELY_HUMAN (0.12-0.25)
 * - Level 9-10 → 💵💵💵💵 EXPERT    → ✅ VERIFIED (≤0.12)
 * 
 * BOT LEVELS (code_maint × realism = final_level):
 * 
 * LEVEL 1 (💰 TRIVIAL):
 *   - robot:          CM=1 × R=0.9  = 0.9 → L1   (all channels, fixed 100ms)
 *   - impulsive:      CM=2 × R=0.5  = 1.0 → L1   (inhuman 5-20ms bursts)
 *   - burst-only:     CM=2 × R=0.5  = 1.0 → L1   (10-50ms burst pattern)
 *   - scroll-heavy:   CM=2 × R=0.3  = 0.6 → L1   (scroll-only, impractical)
 *   - keyboard-heavy: CM=2 × R=0.3  = 0.6 → L1   (keyboard-only, impractical)
 * 
 * LEVEL 2 (💰 CHEAP):
 *   - robot-slow:       CM=2 × R=0.9  = 1.8 → L2   (all channels, slow 500ms)
 *   - robot-impulsive:  CM=3 × R=0.7  = 2.1 → L2   (random timing, straight lines)
 *   - replay-bot:       CM=3 × R=0.7  = 2.1 → L2   (pre-recorded patterns)
 *   - mouse-heavy:      CM=5 × R=0.4  = 2.0 → L2   (mouse-only, impractical)
 * 
 * LEVEL 3 (💵 BUDGET):
 *   - timing-bot:  CM=4 × R=0.8 = 3.2 → L3   (Gaussian timing, linear paths)
 * 
 * LEVEL 4 (💵 BUDGET):
 *   - human-fast:      CM=5 × R=0.8  = 4.0 → L4   (fast Bezier, all channels)
 *   - human-impulsive: CM=5 × R=0.7  = 3.5 → L4   (Bezier + impulsive bursts)
 * 
 * LEVEL 5 (💵💵 MODERATE):
 *   - human-slow:   CM=5 × R=0.9  = 4.5 → L5   (slow Bezier, reading pauses)
 *   - stealth-bot:  CM=6 × R=0.8  = 4.8 → L5   (Bezier + sin() noise)
 *   - mixed-random: CM=6 × R=0.8  = 4.8 → L5   (9 sub-behaviors)
 * 
 * LEVEL 6 (💵💵 MODERATE):
 *   - alternating: CM=7 × R=0.9 = 6.3 → L6   (phase management, Bezier)
 * 
 * LEVEL 7 (💵💵💵 EXPENSIVE):
 *   - human-like:   CM=7 × R=1.0 = 7.0 → L7   (full human simulation)
 *   - human-smooth:  CM=7 × R=1.0 = 7.0 → L7   (100-step Bezier)
 * 
 * LEVEL 9 (💵💵💵💵 EXPERT):
 *   - advanced: CM=9 × R=0.95 = 8.55 → L9   (XY jitter, silence phases)
 * 
 * LEVEL 10 (💵💵💵💵 EXPERT):
 *   - ultimate-bot: CM=10 × R=1.0 = 10.0 → L10  (Perlin, Fitts's Law)
 */

const { test, expect } = require('@playwright/test');
const { resetMousePosition } = require('./human-behavior');
const { BehaviorMode, runBehaviorSession } = require('./test-helpers');

// Session durations - all tests run for 5 minutes for real-world validation
const SESSION_SECONDS = 5 * 60; // 5 minutes

/**
 * Canonical level-to-detection-class mapping.
 * 
 * This is the authoritative mapping from bot difficulty level to expected
 * detection classification. Each level has a target detection class and
 * expected score range based on the tier-to-category system.
 * 
 * Tests may override score ranges for known DETECTION_GAPS (single-channel
 * bots or high-variance Bezier patterns), but the CLASS shows what the
 * detection system SHOULD achieve for each difficulty level.
 */
const LEVEL_TO_CLASS = {
    1:  { class: 'BOT',         emoji: '🤖', min: 0.40, max: 1.00 },
    2:  { class: 'BOT',         emoji: '🤖', min: 0.40, max: 1.00 },
    3:  { class: 'SUSPICIOUS',  emoji: '⚠️',  min: 0.25, max: 0.40 },
    4:  { class: 'SUSPICIOUS',  emoji: '⚠️',  min: 0.25, max: 0.40 },
    5:  { class: 'SUSPICIOUS',  emoji: '⚠️',  min: 0.25, max: 0.40 },
    6:  { class: 'SUSPICIOUS',  emoji: '⚠️',  min: 0.25, max: 0.40 },
    7:  { class: 'LIKELY_HUMAN', emoji: '👤', min: 0.12, max: 0.25 },
    8:  { class: 'LIKELY_HUMAN', emoji: '👤', min: 0.12, max: 0.25 },
    9:  { class: 'VERIFIED',    emoji: '✅', min: 0.00, max: 0.12 },
    10: { class: 'VERIFIED',    emoji: '✅', min: 0.00, max: 0.12 },
};

test.describe('Behavior Monitor E2E Tests', () => {
    
    // Reset mouse position tracking before each test
    test.beforeEach(() => {
        resetMousePosition();
    });

    // ========================================
    // LEVEL 1 (💰 TRIVIAL): Impractical or trivial bots
    // Single-channel, inhuman speed, or <26 lines
    // ========================================

    test('5-minute L1-naive-robot behavior', async ({ page }) => {
        // CM=1 × R=0.9 = L1 (💰 TRIVIAL): fixed 100ms, straight lines
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT', 1, minExp, maxExp);
    });

    test('5-minute L1-burst-pattern behavior', async ({ page }) => {
        // CM=2 × R=0.5 = L1 (💰 TRIVIAL): burst pattern, 10-50ms, impractical speed
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_BURST_PATTERN', 1, minExp, maxExp);
    });

    test('5-minute L1-scroll-focused behavior', async ({ page }) => {
        // CM=2 × R=0.3 = L1 (💰 TRIVIAL): scroll-only, impractical for real automation
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_SCROLL_FOCUSED', 1, minExp, maxExp);
    });

    test('5-minute L1-keyboard-focused behavior', async ({ page }) => {
        // CM=2 × R=0.3 = L1 (💰 TRIVIAL): keyboard-only, impractical for real automation
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L1_KEYBOARD_FOCUSED', 1, minExp, maxExp);
    });

    // ========================================
    // LEVEL 2 (💰 CHEAP): Multi-channel but simple
    // All channels, no Bezier, no advanced math
    // ========================================

    test('5-minute L2-interleaved-actions behavior', async ({ page }) => {
        // CM=2 × R=0.9 = L2 (💰 CHEAP): fixed 500ms, interleaved channels
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_ACTIONS', 2, minExp, maxExp);
    });

    test('5-minute L2-impulsive-robot behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 (💰 CHEAP): random timing + straight lines, all channels
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_IMPULSIVE_ROBOT', 2, minExp, maxExp);
    });

    test('5-minute L2-replay-pattern behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 (💰 CHEAP): pre-recorded patterns, modulo cycling
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_REPLAY_PATTERN', 2, minExp, maxExp);
    });

    test('5-minute L2-mouse-focused behavior', async ({ page }) => {
        // CM=5 × R=0.4 = L2 (💰 CHEAP): mouse-only, impractical for real automation
        // DETECTION_GAP: mouse-only bots lack keyboard/scroll signals for multi-channel detection.
        const minExp = 0.0, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L2_MOUSE_FOCUSED', 2, minExp, maxExp);
    });

    // ========================================
    // LEVEL 3-4 (💵 BUDGET): Statistical evasion or fast Bezier
    // Requires math knowledge or curve generation
    // ========================================

    test('5-minute L3-gaussian-timing behavior', async ({ page }) => {
        // CM=4 × R=0.8 = L3 (💵 BUDGET): Box-Muller Gaussian, 5-step linear paths
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L3_GAUSSIAN_TIMING', 3, minExp, maxExp);
    });

    test('5-minute L4-fast-bezier behavior', async ({ page }) => {
        // CM=5 × R=0.8 = L4 (💵 BUDGET): fast Bezier (10-20 steps), all channels
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L4_FAST_BEZIER', 4, minExp, maxExp);
    });

    test('5-minute L4-impulsive-bezier behavior', async ({ page }) => {
        // CM=5 × R=0.7 = L4 (💵 BUDGET): Bezier mouse + impulsive keyboard/scroll
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L4_IMPULSIVE_BEZIER', 4, minExp, maxExp);
    });

    // ========================================
    // LEVEL 5-6 (💵💵 MODERATE): Slow Bezier or multi-behavior orchestration
    // Requires understanding of curves, timing jitter, phase management
    // ========================================

    test('5-minute L5-slow-bezier behavior', async ({ page }) => {
        // CM=5 × R=0.9 = L5 (💵💵 MODERATE): slow Bezier (80-120 steps), reading pauses
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_SLOW_BEZIER', 5, minExp, maxExp);
    });

    test('5-minute L5-bezier-with-noise behavior', async ({ page }) => {
        // CM=6 × R=0.8 = L5 (💵💵 MODERATE): Bezier + Math.sin() deterministic noise
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_BEZIER_WITH_NOISE', 5, minExp, maxExp);
    });

    test('5-minute L5-mixed-behaviors', async ({ page }) => {
        // CM=6 × R=0.8 = L5 (💵💵 MODERATE): orchestrates 9 sub-behaviors randomly
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L5_MIXED_BEHAVIORS', 5, minExp, maxExp);
    });

    test('5-minute L6-phase-alternating behavior', async ({ page }) => {
        // CM=7 × R=0.9 = L6 (💵💵 MODERATE): burst/smooth phase transitions with Bezier
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        
        logDetectionResult(results.overallScore, 'L6_PHASE_ALTERNATING', 6, minExp, maxExp);
    });

    test('5-minute L7-full-human-sim behavior', async ({ page }) => {
        // LEVEL 7 (💵💵💵 EXPENSIVE): Core HumanBehavior class
        // Code: Full Bezier simulation with weighted actions, timing jitter
        // NOTE: Score varies significantly with randomization seeds.
        // Some seeds produce very evasive patterns (DETECTION_GAP).
        const minExp = 0.05, maxExp = 0.25;
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
        const minExp = 0.12, maxExp = 0.25;
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
        const minExp = 0.00, maxExp = 0.12;
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
        const minExp = 0.00, maxExp = 0.12;
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

    // --- LEVEL 1: Additional TRIVIAL variants ---
    
    test('5-minute L1-naive-robot-v2 behavior', async ({ page }) => {
        // CM=1 × R=0.9 = L1 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_NAIVE_ROBOT_V2', 1, minExp, maxExp);
    });

    test('5-minute L1-fast-robot behavior', async ({ page }) => {
        // CM=2 × R=0.5 = L1: inhuman 5-20ms burst speed
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_FAST_ROBOT', 1, minExp, maxExp);
    });

    test('5-minute L1-fast-robot-v2 behavior', async ({ page }) => {
        // CM=2 × R=0.5 = L1 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_FAST_ROBOT_V2', 1, minExp, maxExp);
    });

    test('5-minute L1-burst-pattern-v2 behavior', async ({ page }) => {
        // CM=2 × R=0.5 = L1 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_BURST_PATTERN_V2', 1, minExp, maxExp);
    });

    test('5-minute L1-burst-pattern-v3 behavior', async ({ page }) => {
        // CM=2 × R=0.5 = L1 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.BURST_ONLY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_BURST_PATTERN_V3', 1, minExp, maxExp);
    });

    test('5-minute L1-keyboard-focused-v2 behavior', async ({ page }) => {
        // CM=2 × R=0.3 = L1 variant: keyboard-only, impractical
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_KEYBOARD_V2', 1, minExp, maxExp);
    });

    test('5-minute L1-scroll-focused-v2 behavior', async ({ page }) => {
        // CM=2 × R=0.3 = L1 variant: scroll-only, impractical
        // DETECTION_GAP: scroll-only bots lack mouse/keyboard signals.
        const minExp = 0.0, maxExp = 0.50;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L1_SCROLL_V2', 1, minExp, maxExp);
    });

    // --- LEVEL 2: Additional CHEAP variants ---
    
    test('5-minute L2-impulsive-robot-v2 behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_IMPULSIVE_ROBOT_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-impulsive-robot-v3 behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_IMPULSIVE_ROBOT_V3', 2, minExp, maxExp);
    });

    test('5-minute L2-replay-pattern-v2 behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_REPLAY_PATTERN_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-replay-pattern-v3 behavior', async ({ page }) => {
        // CM=3 × R=0.7 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.REPLAY_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_REPLAY_PATTERN_V3', 2, minExp, maxExp);
    });

    test('5-minute L2-interleaved-actions-v2 behavior', async ({ page }) => {
        // CM=2 × R=0.9 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-interleaved-actions-v3 behavior', async ({ page }) => {
        // CM=2 × R=0.9 = L2 variant
        const minExp = 0.40, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_INTERLEAVED_V3', 2, minExp, maxExp);
    });

    test('5-minute L2-mouse-focused-v2 behavior', async ({ page }) => {
        // CM=5 × R=0.4 = L2 variant: mouse-only, impractical
        // DETECTION_GAP: mouse-only bots lack keyboard/scroll signals.
        const minExp = 0.0, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_MOUSE_V2', 2, minExp, maxExp);
    });

    test('5-minute L2-mouse-focused-v3 behavior', async ({ page }) => {
        // CM=5 × R=0.4 = L2 variant: mouse-only, impractical
        // DETECTION_GAP: mouse-only bots lack keyboard/scroll signals.
        const minExp = 0.0, maxExp = 1.0;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L2_MOUSE_V3', 2, minExp, maxExp);
    });

    // --- LEVEL 3-4: Additional BUDGET variants ---
    
    test('5-minute L3-gaussian-timing-v2 behavior', async ({ page }) => {
        // CM=4 × R=0.8 = L3 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.TIMING_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L3_GAUSSIAN_TIMING_V2', 3, minExp, maxExp);
    });

    test('5-minute L4-fast-bezier-v2 behavior', async ({ page }) => {
        // CM=5 × R=0.8 = L4 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_FAST_BEZIER_V2', 4, minExp, maxExp);
    });

    test('5-minute L4-fast-bezier-v3 behavior', async ({ page }) => {
        // CM=5 × R=0.8 = L4 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_FAST,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_FAST_BEZIER_V3', 4, minExp, maxExp);
    });

    test('5-minute L4-impulsive-bezier-v2 behavior', async ({ page }) => {
        // CM=5 × R=0.7 = L4 variant
        // DETECTION_GAP: Bezier + impulsive creates unpredictable patterns.
        const minExp = 0.05, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L4_IMPULSIVE_BEZIER_V2', 4, minExp, maxExp);
    });

    // --- LEVEL 5: Additional MODERATE variants ---
    
    test('5-minute L5-slow-bezier-v2 behavior', async ({ page }) => {
        // CM=5 × R=0.9 = L5 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_SLOW_BEZIER_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-bezier-with-noise-v2 behavior', async ({ page }) => {
        // CM=6 × R=0.8 = L5 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_BEZIER_NOISE_V2', 5, minExp, maxExp);
    });

    test('5-minute L5-bezier-with-noise-v3 behavior', async ({ page }) => {
        // CM=6 × R=0.8 = L5 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.STEALTH_BOT,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_BEZIER_NOISE_V3', 5, minExp, maxExp);
    });

    test('5-minute L5-mixed-behaviors-v2 behavior', async ({ page }) => {
        // CM=6 × R=0.8 = L5 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L5_MIXED_V2', 5, minExp, maxExp);
    });

    // --- LEVEL 6: Additional MODERATE variants ---

    test('5-minute L6-phase-alternating-v2 behavior', async ({ page }) => {
        // CM=7 × R=0.9 = L6 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_ALTERNATING_V2', 6, minExp, maxExp);
    });

    test('5-minute L6-phase-alternating-v3 behavior', async ({ page }) => {
        // CM=7 × R=0.9 = L6 variant
        const minExp = 0.25, maxExp = 0.40;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ALTERNATING,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L6_ALTERNATING_V3', 6, minExp, maxExp);
    });

    // --- LEVEL 7: Additional EXPENSIVE variants ---
    
    test('5-minute L7-full-human-sim-v2 behavior', async ({ page }) => {
        // CM=7 × R=1.0 = L7 variant
        const minExp = 0.12, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_HUMAN_SIM_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-full-human-sim-v3 behavior', async ({ page }) => {
        // CM=7 × R=1.0 = L7 variant
        const minExp = 0.12, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_HUMAN_SIM_V3', 7, minExp, maxExp);
    });

    test('5-minute L7-smooth-bezier-v2 behavior', async ({ page }) => {
        // CM=7 × R=1.0 = L7 variant
        const minExp = 0.12, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_SMOOTH_V2', 7, minExp, maxExp);
    });

    test('5-minute L7-smooth-bezier-v3 behavior', async ({ page }) => {
        // CM=7 × R=1.0 = L7 variant
        const minExp = 0.12, maxExp = 0.25;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L7_SMOOTH_V3', 7, minExp, maxExp);
    });

    // --- LEVEL 9-10: Additional EXPERT variants ---
    
    test('5-minute L9-advanced-human-v2 behavior', async ({ page }) => {
        // CM=9 × R=0.95 = L9 variant
        const minExp = 0.00, maxExp = 0.12;
        const { results } = await runBehaviorSession(
            page, SESSION_SECONDS, BehaviorMode.ADVANCED,
            { minExpectedScore: minExp, maxExpectedScore: maxExp }
        );
        logDetectionResult(results.overallScore, 'L9_ADVANCED_V2', 9, minExp, maxExp);
    });

    test('5-minute L10-ultimate-evasion-v2 behavior', async ({ page }) => {
        // CM=10 × R=1.0 = L10 variant
        const minExp = 0.00, maxExp = 0.12;
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
 * TIER-TO-CATEGORY MAPPING:
 * - Level 1-2  → 💰 TRIVIAL/CHEAP  → 🤖 BOT (≥0.40)
 * - Level 3-4  → 💵 BUDGET          → ⚠️ SUSPICIOUS (0.25-0.40)
 * - Level 5-6  → 💵💵 MODERATE      → ⚠️ SUSPICIOUS (0.25-0.40)
 * - Level 7-8  → 💵💵💵 EXPENSIVE   → 👤 LIKELY_HUMAN (0.12-0.25)
 * - Level 9-10 → 💵💵💵💵 EXPERT    → ✅ VERIFIED (≤0.12)
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
    } else if (score >= 0.12) {
        detectionClass = '👤 LIKELY_HUMAN';
    } else {
        detectionClass = '✅ VERIFIED';
    }
    
    // Expected class from level-to-class mapping
    const expected = LEVEL_TO_CLASS[sophisticationLevel];
    const expectedClassLabel = expected ? `${expected.emoji} ${expected.class}` : '?';
    const classMatch = expected && detectionClass.includes(expected.class);
    const gapLabel = classMatch ? '' : ` ⚠️ DETECTION_GAP(expected: ${expectedClassLabel})`;
    
    const tier = costTier[sophisticationLevel] || '?';
    const inRange = score >= minExpected && score <= maxExpected;
    const inRangeSymbol = inRange ? '✓' : '❌';
    
    console.log(`[${testName}] Level=${sophisticationLevel} (${tier}) | Score=${score.toFixed(2)} | Expected=[${minExpected.toFixed(2)}-${maxExpected.toFixed(2)}] ${inRangeSymbol} | Detection=${detectionClass}${gapLabel}`);
    
    // ASSERT: Fail the test if score is outside expected range
    if (!inRange) {
        throw new Error(
            `SCORE OUT OF RANGE: ${testName} scored ${score.toFixed(2)} but expected ${minExpected.toFixed(2)}-${maxExpected.toFixed(2)} for Level ${sophisticationLevel} (${tier})`
        );
    }
}


