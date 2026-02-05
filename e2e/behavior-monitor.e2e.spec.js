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

// Session durations
const FULL_SESSION_SECONDS = 5 * 60; // 5 minutes
const QUICK_SESSION_SECONDS = 30;    // 30 seconds

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
            FULL_SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.3 }
        );
        
        logDetectionResult(results.overallScore);
    });

    test('quick human-like sanity check (30s)', async ({ page }) => {
        const { results } = await runBehaviorSession(
            page,
            QUICK_SESSION_SECONDS,
            BehaviorMode.HUMAN_LIKE,
            { minExpectedScore: 0.3 }
        );
        
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Robot behavior tests (no human-like)
    // ========================================

    test('robot behavior - regular Playwright API (30s)', async ({ page }) => {
        // Robot behavior should be easily detected - expect higher scores
        const { results } = await runBehaviorSession(
            page,
            QUICK_SESSION_SECONDS,
            BehaviorMode.ROBOT,
            { minExpectedScore: 0.4 }
        );
        
        console.log('✓ Robot behavior test - using regular Playwright API');
        logDetectionResult(results.overallScore);
    });

    // ========================================
    // Impulsive behavior tests
    // ========================================

    test('human-like + impulsive fast movements (30s)', async ({ page }) => {
        // Mix of human-like behavior with rapid impulsive bursts
        const { results } = await runBehaviorSession(
            page,
            QUICK_SESSION_SECONDS,
            BehaviorMode.HUMAN_IMPULSIVE,
            { minExpectedScore: 0.3 }
        );
        
        console.log('✓ Human + impulsive behavior test');
        logDetectionResult(results.overallScore);
    });

    test('robot + impulsive fast movements (30s)', async ({ page }) => {
        // Robot behavior combined with rapid impulsive movements
        // This should produce the highest bot scores
        const { results } = await runBehaviorSession(
            page,
            QUICK_SESSION_SECONDS,
            BehaviorMode.ROBOT_IMPULSIVE,
            { minExpectedScore: 0.4 }
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
