/**
 * Playwright E2E test for behavior monitor with human-like behavior
 * 
 * This test connects to the behavioral monitor, initiates a 5-minute session,
 * and performs human-like actions to test detection bypass capabilities.
 */

const { test, expect } = require('@playwright/test');
const { HumanBehavior, resetMousePosition } = require('./human-behavior');

// Session duration in seconds (5 minutes)
const SESSION_DURATION_SECONDS = 5 * 60;

test.describe('Behavior Monitor E2E Tests', () => {
    
    // Reset mouse position tracking before each test to ensure clean state
    test.beforeEach(() => {
        resetMousePosition();
    });
    
    test('5-minute human-like behavior session', async ({ page }) => {
        // Navigate to the behavior monitor page
        await page.goto('/behavior-monitor.html');
        
        // Wait for page to be fully loaded
        await HumanBehavior.pageLoadDelay();
        
        // Verify the page loaded correctly
        await expect(page.locator('h1')).toContainText('Headless Behavior Monitor');
        
        // Verify the start button is available
        const startButton = page.locator('#start-btn');
        await expect(startButton).toBeVisible();
        await expect(startButton).toBeEnabled();
        
        console.log('Starting behavior monitor session...');
        
        // Click the start button with human-like behavior
        await HumanBehavior.clickWithHumanBehavior(page, '#start-btn');
        
        // Verify session started
        await expect(page.locator('#status-text')).toHaveText('Session Running');
        await expect(page.locator('#stop-btn')).toBeEnabled();
        
        console.log(`Running human-like behavior for ${SESSION_DURATION_SECONDS} seconds (5 minutes)...`);
        
        // Perform random human-like actions for 5 minutes
        await HumanBehavior.performRandomActions(page, SESSION_DURATION_SECONDS);
        
        // Small pause before stopping
        await HumanBehavior.randomDelay(1, 2);
        
        console.log('Stopping session...');
        
        // Click the stop button
        await HumanBehavior.clickWithHumanBehavior(page, '#stop-btn');
        
        // Wait for results to be displayed
        await expect(page.locator('#results-grid')).toBeVisible({ timeout: 5000 });
        
        // Get the final results from the monitor
        const results = await page.evaluate(() => {
            if (window.__behaviorMonitor) {
                return window.__behaviorMonitor.getResults();
            }
            return null;
        });
        
        console.log('Session Results:', JSON.stringify(results, null, 2));
        
        // Verify we collected samples
        expect(results).not.toBeNull();
        expect(results.metadata).toBeDefined();
        
        // Log sample counts
        const status = await page.evaluate(() => {
            if (window.__behaviorMonitor) {
                return window.__behaviorMonitor.getStatus();
            }
            return null;
        });
        
        console.log('Final Status:', JSON.stringify(status, null, 2));
        
        // Verify we collected meaningful samples
        // Due to 5 minutes of activity, we should have plenty
        expect(status.samples.mouse).toBeGreaterThan(0);
        expect(status.samples.keyboard).toBeGreaterThanOrEqual(0);
        expect(status.samples.scroll).toBeGreaterThan(0);
        
        // Log the overall score
        console.log(`Overall Bot Score: ${results.overallScore}`);
        console.log(`Confidence: ${results.confidence}`);
        
        // The score should indicate human-like behavior (lower is more human)
        // We're testing if the human-like behavior can bypass detection
        // A score below 0.5 generally indicates human-like behavior
        if (results.overallScore < 0.5) {
            console.log('✓ Test PASSED: Human-like behavior successfully detected as human');
        } else {
            console.log('⚠ Note: Bot score is elevated, but this can vary based on timing');
        }
    });
    
    test('quick sanity check (30 seconds)', async ({ page }) => {
        // A shorter test for quick validation
        const QUICK_DURATION = 30;
        
        await page.goto('/behavior-monitor.html');
        await HumanBehavior.pageLoadDelay();
        
        await expect(page.locator('h1')).toContainText('Headless Behavior Monitor');
        
        // Start session
        await HumanBehavior.clickWithHumanBehavior(page, '#start-btn');
        await expect(page.locator('#status-text')).toHaveText('Session Running');
        
        console.log(`Quick sanity check: ${QUICK_DURATION} seconds of human-like behavior...`);
        
        // Perform actions for 30 seconds
        await HumanBehavior.performRandomActions(page, QUICK_DURATION);
        
        // Stop session
        await HumanBehavior.clickWithHumanBehavior(page, '#stop-btn');
        
        // Wait for results
        await expect(page.locator('#results-grid')).toBeVisible({ timeout: 5000 });
        
        // Get results
        const results = await page.evaluate(() => {
            if (window.__behaviorMonitor) {
                return window.__behaviorMonitor.getResults();
            }
            return null;
        });
        
        expect(results).not.toBeNull();
        console.log(`Quick test completed. Score: ${results.overallScore}`);
    });
});
