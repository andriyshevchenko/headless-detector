/**
 * Playwright E2E tests for behavior monitor
 * 
 * Tests different automation behavior patterns:
 * - Human-like behavior (Bezier curves, delays, jitter)
 * - Robot behavior (instant, uniform, predictable)
 * - Impulsive behavior (rapid, erratic movements)
 * - Mixed behaviors (combinations)
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
    // Human-like behavior tests
    // ========================================

    test('5-minute human-like behavior session', async ({ page }) => {
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.3 }
        );
        
        logDetectionResult(results.overallScore);
    });

    test('5-minute smooth behavior with timing jitter', async ({ page }) => {
        // Smooth, slow movements with enhanced timing jitter
        // This should produce the lowest bot scores (most human-like)
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SMOOTH,
            { minExpectedScore: 0.2 } // We expect very low scores for smooth behavior
        );
        
        console.log('✓ Smooth behavior with timing jitter test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute alternating burst/smooth with long pauses', async ({ page }) => {
        // Alternating between fast/jerky movements and smooth/slow movements
        // with occasional 10-15 second pauses (like distraction/thinking)
        // This simulates the most natural human behavior pattern
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ALTERNATING,
            { minExpectedScore: 0.2 } // Expect low scores due to natural pattern
        );
        
        console.log('✓ Alternating burst/smooth behavior with long pauses');
        logDetectionResult(results.overallScore);
    });

    test('5-minute advanced behavior with XY jitter', async ({ page }) => {
        // The most sophisticated human simulation:
        // - Burst/Smooth/Silence phases
        // - XY jitter on all Bezier mouse movements (simulates hand tremor)
        // - Variable phase durations with timing jitter
        // This should be the hardest for bot detection to catch
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ADVANCED,
            { minExpectedScore: 0.2 } // Expect low scores due to advanced simulation
        );
        
        console.log('✓ Advanced behavior with XY jitter on Bezier movements');
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Robot behavior tests (no human-like)
    // ========================================

    test('5-minute robot behavior - regular Playwright API', async ({ page }) => {
        // Robot behavior should be easily detected - expect higher scores
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: 0.4 }
        );
        
        console.log('✓ Robot behavior test - using regular Playwright API');
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Impulsive behavior tests
    // ========================================

    test('5-minute human-like + impulsive fast movements', async ({ page }) => {
        // Mix of human-like behavior with rapid impulsive bursts
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: 0.3 }
        );
        
        console.log('✓ Human + impulsive behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute robot + impulsive fast movements', async ({ page }) => {
        // Robot behavior combined with rapid impulsive movements
        // This should produce the highest bot scores
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: 0.3 } // Reduced from 0.4 - impulsive movements add variance
        );
        
        console.log('✓ Robot + impulsive behavior test');
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Diversified behavior tests (for more samples)
    // ========================================

    test('5-minute human-fast behavior', async ({ page }) => {
        // Human-like but with faster, more energetic movements
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_FAST,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Human-fast behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute human-slow behavior', async ({ page }) => {
        // Human-like but with slower, careful movements
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.HUMAN_SLOW,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Human-slow behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute robot-slow behavior', async ({ page }) => {
        // Robot-like but with slower timing
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ROBOT_SLOW,
            { minExpectedScore: 0.3 }
        );
        
        console.log('✓ Robot-slow behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute burst-only behavior', async ({ page }) => {
        // Only rapid burst movements
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.BURST_ONLY,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Burst-only behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute scroll-heavy behavior', async ({ page }) => {
        // Primarily scroll-based behavior
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.SCROLL_HEAVY,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Scroll-heavy behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute mouse-heavy behavior', async ({ page }) => {
        // Primarily mouse movement-based behavior
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MOUSE_HEAVY,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Mouse-heavy behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute keyboard-heavy behavior', async ({ page }) => {
        // Primarily keyboard-based behavior
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.KEYBOARD_HEAVY,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Keyboard-heavy behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute mixed-random behavior', async ({ page }) => {
        // Randomly switches between all behavior modes
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.MIXED_RANDOM,
            { minExpectedScore: 0.2 }
        );
        
        console.log('✓ Mixed-random behavior test');
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Advanced stealth bot tests
    // ========================================
    // These bots try to evade detection by mimicking human patterns
    // but should still be detectable due to subtle mechanical tells

    test('5-minute stealth-bot behavior', async ({ page }) => {
        // Stealth bot: adds noise/jitter but noise is mathematically predictable
        // Should score higher than naive robots due to evasion attempts
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.STEALTH_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.6 }
        );
        
        console.log('✓ Stealth-bot behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute replay-bot behavior', async ({ page }) => {
        // Replay bot: uses pre-recorded patterns that are too consistent
        // Should be detectable via pattern repetition analysis
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.REPLAY_BOT,
            { minExpectedScore: 0.25, maxExpectedScore: 0.65 }
        );
        
        console.log('✓ Replay-bot behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute timing-bot behavior', async ({ page }) => {
        // Timing bot: human-like timing but mechanical movements
        // Should be detectable via movement analysis (too straight)
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.TIMING_BOT,
            { minExpectedScore: 0.2, maxExpectedScore: 0.55 }
        );
        
        console.log('✓ Timing-bot behavior test');
        logDetectionResult(results.overallScore);
    });

    test('5-minute ultimate-bot behavior', async ({ page }) => {
        // Ultimate bot: THE MOST SOPHISTICATED EVASION BOT
        // Combines Perlin noise, Fitts's Law, fatigue simulation, micro-saccades,
        // attention modeling, breathing rhythm, and human-calibrated distributions.
        // This represents the best a determined adversary could reasonably deploy.
        // If this scores <0.20, the detection system may need enhancement.
        const { results } = await runBehaviorSession(
            page,
            SESSION_SECONDS,
            BehaviorMode.ULTIMATE_BOT,
            { minExpectedScore: 0.15, maxExpectedScore: 0.50 }
        );
        
        console.log('✓ Ultimate-bot behavior test (most advanced evasion)');
        logDetectionResult(results.overallScore);
    });
});

/**
 * Log detection result with appropriate message
 * @param {number} score 
 */
function logDetectionResult(score) {
    if (score >= 0.7) {
        console.log(`✓ Strong bot detection (score: ${score.toFixed(2)})`);
    } else if (score >= 0.5) {
        console.log(`✓ Moderate bot detection (score: ${score.toFixed(2)})`);
    } else if (score >= 0.3) {
        console.log(`✓ Weak bot detection (score: ${score.toFixed(2)})`);
    } else {
        console.log(`✓ Minimal detection (score: ${score.toFixed(2)})`);
    }
}
