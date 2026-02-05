/**
 * Reusable test helpers for behavior monitor e2e tests
 * Implements DRY principles to avoid code duplication
 */

const { expect } = require('@playwright/test');
const { HumanBehavior, resetMousePosition, sleep, randomBetween, randomInt } = require('./human-behavior');

/**
 * Configuration for different behavior modes
 */
const BehaviorMode = {
    HUMAN_LIKE: 'human-like',
    ROBOT: 'robot',
    IMPULSIVE: 'impulsive',
    HUMAN_IMPULSIVE: 'human-impulsive',
    ROBOT_IMPULSIVE: 'robot-impulsive'
};

/**
 * Robot-like behavior - uses regular Playwright API without human-like delays
 * This should be easily detected as bot behavior
 */
class RobotBehavior {
    /**
     * Click without human-like delays - instant clicks
     * @param {import('@playwright/test').Page} page
     * @param {string} selector
     */
    static async click(page, selector) {
        await page.locator(selector).first().click();
    }

    /**
     * Move mouse in straight line without Bezier curves
     * @param {import('@playwright/test').Page} page
     * @param {number} x
     * @param {number} y
     */
    static async moveMouse(page, x, y) {
        await page.mouse.move(x, y);
    }

    /**
     * Scroll instantly without pauses
     * @param {import('@playwright/test').Page} page
     * @param {number} amount
     */
    static async scroll(page, amount) {
        await page.evaluate((a) => window.scrollBy(0, a), amount);
    }

    /**
     * Type text instantly
     * @param {import('@playwright/test').Page} page
     * @param {string} text
     */
    static async type(page, text) {
        await page.keyboard.type(text, { delay: 0 });
    }

    /**
     * Perform robot-like random actions - fast, uniform, predictable
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        let actionCount = 0;
        let lastLoggedMinute = 0;

        while (Date.now() < endTime) {
            const actionType = actionCount % 4; // Rotate through actions uniformly (bot-like)

            try {
                switch (actionType) {
                    case 0: // Mouse move - straight line
                        const x = Math.floor(Math.random() * viewport.width);
                        const y = Math.floor(Math.random() * viewport.height);
                        await RobotBehavior.moveMouse(page, x, y);
                        break;

                    case 1: // Scroll - fixed amounts
                        await RobotBehavior.scroll(page, 200);
                        break;

                    case 2: // Scroll back
                        await RobotBehavior.scroll(page, -200);
                        break;

                    case 3: // Key press - instant
                        await page.keyboard.press('Tab');
                        break;
                }

                actionCount++;

                // Fixed interval between actions (very bot-like)
                await sleep(100);

            } catch (error) {
                console.log(`Robot action ${actionType} failed:`, error.message || String(error));
            }

            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentMinute = Math.floor(elapsed / 60);
            if (currentMinute > lastLoggedMinute) {
                lastLoggedMinute = currentMinute;
                console.log(`Robot progress: ${elapsed}s elapsed, ${actionCount} actions performed`);
            }
        }

        console.log(`Robot actions completed: ${actionCount} actions in ${durationSeconds}s`);
    }
}

/**
 * Impulsive fast movement behavior - rapid, erratic movements
 * Simulates someone moving mouse/scrolling very fast
 */
class ImpulsiveBehavior {
    /**
     * Perform rapid mouse movements
     * @param {import('@playwright/test').Page} page
     * @param {number} count - Number of rapid movements
     */
    static async rapidMouseMovements(page, count = 20) {
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        for (let i = 0; i < count; i++) {
            const x = randomInt(50, viewport.width - 50);
            const y = randomInt(50, viewport.height - 50);
            await page.mouse.move(x, y);
            // Very short delay - faster than human capability
            await sleep(randomBetween(5, 20));
        }
    }

    /**
     * Perform rapid scroll movements (like frantically swiping)
     * @param {import('@playwright/test').Page} page
     * @param {number} count - Number of rapid scrolls
     */
    static async rapidScrolls(page, count = 30) {
        for (let i = 0; i < count; i++) {
            const direction = Math.random() > 0.5 ? 1 : -1;
            const amount = randomInt(200, 800) * direction;
            await page.evaluate((a) => window.scrollBy(0, a), amount);
            // Very short delay
            await sleep(randomBetween(10, 50));
        }
    }

    /**
     * Perform rapid key presses
     * @param {import('@playwright/test').Page} page
     * @param {number} count
     */
    static async rapidKeyPresses(page, count = 15) {
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Space'];
        for (let i = 0; i < count; i++) {
            const key = keys[randomInt(0, keys.length - 1)];
            await page.keyboard.press(key);
            await sleep(randomBetween(10, 30));
        }
    }

    /**
     * Perform impulsive random actions - rapid bursts of activity
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;

        let burstCount = 0;
        let lastLoggedMinute = 0;

        while (Date.now() < endTime) {
            // Random burst type
            const burstType = randomInt(0, 2);

            try {
                switch (burstType) {
                    case 0:
                        await ImpulsiveBehavior.rapidMouseMovements(page, randomInt(15, 30));
                        break;
                    case 1:
                        await ImpulsiveBehavior.rapidScrolls(page, randomInt(20, 40));
                        break;
                    case 2:
                        await ImpulsiveBehavior.rapidKeyPresses(page, randomInt(10, 20));
                        break;
                }

                burstCount++;

                // Brief pause between bursts
                await sleep(randomBetween(500, 1500));

            } catch (error) {
                console.log(`Impulsive burst ${burstType} failed:`, error.message || String(error));
            }

            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentMinute = Math.floor(elapsed / 60);
            if (currentMinute > lastLoggedMinute) {
                lastLoggedMinute = currentMinute;
                console.log(`Impulsive progress: ${elapsed}s elapsed, ${burstCount} bursts performed`);
            }
        }

        console.log(`Impulsive actions completed: ${burstCount} bursts in ${durationSeconds}s`);
    }
}

/**
 * Start a behavior monitor session
 * @param {import('@playwright/test').Page} page
 * @param {BehaviorMode} mode - Behavior mode for clicking
 */
async function startSession(page, mode = BehaviorMode.HUMAN_LIKE) {
    await page.goto('/behavior-monitor.html');

    if (mode === BehaviorMode.HUMAN_LIKE || mode === BehaviorMode.HUMAN_IMPULSIVE) {
        await HumanBehavior.pageLoadDelay();
    } else {
        await sleep(500); // Minimal delay for robot mode
    }

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Headless Behavior Monitor');

    // Click start button
    if (mode === BehaviorMode.HUMAN_LIKE || mode === BehaviorMode.HUMAN_IMPULSIVE) {
        await HumanBehavior.clickWithHumanBehavior(page, '#start-btn');
    } else {
        await RobotBehavior.click(page, '#start-btn');
    }

    // Verify session started
    await expect(page.locator('#status-text')).toHaveText('Session Running');
}

/**
 * Stop a behavior monitor session and get results
 * @param {import('@playwright/test').Page} page
 * @param {BehaviorMode} mode - Behavior mode for clicking
 * @returns {Promise<{results: object, status: object}>}
 */
async function stopSessionAndGetResults(page, mode = BehaviorMode.HUMAN_LIKE) {
    // Small pause before stopping
    if (mode === BehaviorMode.HUMAN_LIKE || mode === BehaviorMode.HUMAN_IMPULSIVE) {
        await HumanBehavior.randomDelay(0.5, 1);
    }

    // Click stop button
    if (mode === BehaviorMode.HUMAN_LIKE || mode === BehaviorMode.HUMAN_IMPULSIVE) {
        await HumanBehavior.clickWithHumanBehavior(page, '#stop-btn');
    } else {
        await RobotBehavior.click(page, '#stop-btn');
    }

    // Wait for results
    await expect(page.locator('#results-grid')).toBeVisible({ timeout: 5000 });

    // Get results from monitor
    const results = await page.evaluate(() => {
        if (window.__behaviorMonitor) {
            return window.__behaviorMonitor.getResults();
        }
        return null;
    });

    const status = await page.evaluate(() => {
        if (window.__behaviorMonitor) {
            return window.__behaviorMonitor.getStatus();
        }
        return null;
    });

    return { results, status };
}

/**
 * Perform actions based on mode
 * @param {import('@playwright/test').Page} page
 * @param {number} durationSeconds
 * @param {BehaviorMode} mode
 */
async function performActions(page, durationSeconds, mode) {
    switch (mode) {
        case BehaviorMode.HUMAN_LIKE:
            await HumanBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.ROBOT:
            await RobotBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.IMPULSIVE:
            await ImpulsiveBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.HUMAN_IMPULSIVE:
            // Mix human-like with impulsive bursts
            await performMixedActions(page, durationSeconds, HumanBehavior, ImpulsiveBehavior);
            break;

        case BehaviorMode.ROBOT_IMPULSIVE:
            // Mix robot-like with impulsive bursts
            await performMixedActions(page, durationSeconds, RobotBehavior, ImpulsiveBehavior);
            break;

        default:
            throw new Error(`Unknown behavior mode: ${mode}`);
    }
}

/**
 * Perform mixed actions - alternate between two behavior types
 * @param {import('@playwright/test').Page} page
 * @param {number} durationSeconds
 * @param {typeof HumanBehavior|typeof RobotBehavior} baseBehavior
 * @param {typeof ImpulsiveBehavior} impulsiveBehavior
 */
async function performMixedActions(page, durationSeconds, baseBehavior, impulsiveBehavior) {
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    const segmentDuration = 5; // 5 second segments

    let segmentCount = 0;
    let lastLoggedMinute = 0;

    while (Date.now() < endTime) {
        const remainingTime = Math.max(0, (endTime - Date.now()) / 1000);
        const segmentTime = Math.min(segmentDuration, remainingTime);

        if (segmentTime <= 0) break;

        try {
            if (segmentCount % 2 === 0) {
                // Base behavior segment
                await baseBehavior.performRandomActions(page, segmentTime);
            } else {
                // Impulsive burst segment
                await impulsiveBehavior.performRandomActions(page, segmentTime);
            }
        } catch (error) {
            console.log(`Mixed segment ${segmentCount} failed:`, error.message || String(error));
        }

        segmentCount++;

        // Log progress every minute
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const currentMinute = Math.floor(elapsed / 60);
        if (currentMinute > lastLoggedMinute) {
            lastLoggedMinute = currentMinute;
            console.log(`Mixed progress: ${elapsed}s elapsed, ${segmentCount} segments performed`);
        }
    }

    console.log(`Mixed actions completed: ${segmentCount} segments in ${durationSeconds}s`);
}

/**
 * Run a complete behavior monitor test session
 * @param {import('@playwright/test').Page} page
 * @param {number} durationSeconds
 * @param {BehaviorMode} mode
 * @param {object} options
 * @param {number} [options.minExpectedScore] - Minimum expected bot score
 * @param {number} [options.maxExpectedScore] - Maximum expected bot score
 * @returns {Promise<{results: object, status: object}>}
 */
async function runBehaviorSession(page, durationSeconds, mode, options = {}) {
    const { minExpectedScore = 0, maxExpectedScore = 1 } = options;

    console.log(`Starting ${mode} behavior session for ${durationSeconds} seconds...`);

    // Reset mouse tracking if using human-like behavior
    if (mode === BehaviorMode.HUMAN_LIKE || mode === BehaviorMode.HUMAN_IMPULSIVE) {
        resetMousePosition();
    }

    // Start session
    await startSession(page, mode);

    // Perform actions
    await performActions(page, durationSeconds, mode);

    // Stop and get results
    const { results, status } = await stopSessionAndGetResults(page, mode);

    // Validate results
    expect(results).not.toBeNull();
    console.log('Session Results:', JSON.stringify(results, null, 2));
    console.log('Final Status:', JSON.stringify(status, null, 2));

    // Assert score is within expected range
    expect(results.overallScore).toBeGreaterThanOrEqual(minExpectedScore);
    expect(results.overallScore).toBeLessThanOrEqual(maxExpectedScore);

    console.log(`Overall Bot Score: ${results.overallScore} (expected: ${minExpectedScore}-${maxExpectedScore})`);

    return { results, status };
}

module.exports = {
    BehaviorMode,
    RobotBehavior,
    ImpulsiveBehavior,
    startSession,
    stopSessionAndGetResults,
    performActions,
    runBehaviorSession
};
