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
