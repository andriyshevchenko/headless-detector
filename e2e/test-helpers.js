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
    HUMAN_SMOOTH: 'human-smooth', // Smooth, slow movements with timing jitter
    ROBOT: 'robot',
    IMPULSIVE: 'impulsive',
    HUMAN_IMPULSIVE: 'human-impulsive',
    ROBOT_IMPULSIVE: 'robot-impulsive',
    ALTERNATING: 'alternating', // Alternates between fast/jerky and smooth/slow with long pauses
    ADVANCED: 'advanced', // Most advanced: alternating phases + XY jitter on Bezier curves
    // New diversified modes for more samples
    HUMAN_FAST: 'human-fast', // Human-like but with faster movements
    HUMAN_SLOW: 'human-slow', // Human-like but with slower, careful movements  
    ROBOT_SLOW: 'robot-slow', // Robot-like but with slower timing
    BURST_ONLY: 'burst-only', // Only burst/rapid movements
    SCROLL_HEAVY: 'scroll-heavy', // Primarily scroll-based behavior
    MOUSE_HEAVY: 'mouse-heavy', // Primarily mouse movement-based behavior
    KEYBOARD_HEAVY: 'keyboard-heavy', // Primarily keyboard-based behavior
    MIXED_RANDOM: 'mixed-random' // Randomly switches between all modes
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

                    case 3: // Key press - instant (arrow keys only, avoid Tab/Space)
                        await page.keyboard.press('ArrowDown');
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
 * Smooth, slow human-like behavior with enhanced timing jitter
 * Simulates very natural, unhurried human movements
 */
class SmoothBehavior {
    /**
     * Move mouse very smoothly with more steps and enhanced jitter
     * @param {import('@playwright/test').Page} page
     * @param {number} targetX
     * @param {number} targetY
     */
    static async moveMouse(page, targetX, targetY) {
        // Use more steps for smoother movement (100 instead of 50)
        await HumanBehavior.moveMouseHumanLike(page, targetX, targetY, 100);
        // Add extra settling time with jitter
        await sleep(randomBetween(100, 300));
    }

    /**
     * Scroll very smoothly with many small steps
     * @param {import('@playwright/test').Page} page
     * @param {number} totalAmount
     */
    static async scroll(page, totalAmount) {
        const steps = randomInt(8, 15); // More steps for smoother scroll
        const stepAmount = totalAmount / steps;

        for (let i = 0; i < steps; i++) {
            await page.evaluate((a) => window.scrollBy(0, a), stepAmount);
            // Variable delays between scroll steps (timing jitter)
            await sleep(randomBetween(80, 250));
        }

        // Reading pause after scroll with jitter
        await sleep(randomBetween(500, 1500));
    }

    /**
     * Type very slowly with natural rhythm variations
     * @param {import('@playwright/test').Page} page
     * @param {string} text
     */
    static async type(page, text) {
        for (const char of text) {
            await page.keyboard.type(char);
            // Very slow typing with high jitter
            let delay = randomBetween(100, 250);
            // Occasional thinking pauses
            if (Math.random() < 0.15) {
                delay += randomBetween(300, 800);
            }
            await sleep(delay);
        }
    }

    /**
     * Perform smooth, slow random actions with enhanced timing jitter
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
            // Random action selection (weighted towards slower actions)
            const roll = Math.random();
            let action;
            if (roll < 0.35) {
                action = 'mouse';
            } else if (roll < 0.65) {
                action = 'scroll';
            } else if (roll < 0.85) {
                action = 'wait'; // Just pause (like reading/thinking)
            } else {
                action = 'key';
            }

            try {
                switch (action) {
                    case 'mouse': {
                        // Smooth mouse movement to random position
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        const x = randomInt(minX, maxX);
                        const y = randomInt(minY, maxY);
                        await SmoothBehavior.moveMouse(page, x, y);
                        break;
                    }

                    case 'scroll': {
                        // Gentle scroll with variable distance
                        const direction = Math.random() > 0.3 ? 1 : -1;
                        const amount = randomInt(100, 300) * direction;
                        await SmoothBehavior.scroll(page, amount);
                        break;
                    }

                    case 'wait': {
                        // Natural pause (like reading content)
                        await sleep(randomBetween(1000, 3000));
                        break;
                    }

                    case 'key': {
                        // Occasional key press (arrow keys only, avoid Tab/Space)
                        const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
                        const key = keys[randomInt(0, keys.length - 1)];
                        await page.keyboard.press(key);
                        // Pause after key press
                        await sleep(randomBetween(500, 1500));
                        break;
                    }
                }

                actionCount++;

                // Variable pause between actions (timing jitter)
                // Sometimes quick, sometimes longer pauses
                const pauseRoll = Math.random();
                if (pauseRoll < 0.2) {
                    // Quick transition
                    await sleep(randomBetween(300, 800));
                } else if (pauseRoll < 0.7) {
                    // Normal pause
                    await sleep(randomBetween(800, 2000));
                } else {
                    // Longer pause (like reading/thinking)
                    await sleep(randomBetween(2000, 4000));
                }

            } catch (error) {
                const errorMessage = (error && typeof error.message === 'string')
                    ? error.message
                    : String(error);
                console.log(`Smooth action ${action} failed:`, errorMessage);
            }

            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentMinute = Math.floor(elapsed / 60);
            if (currentMinute > lastLoggedMinute) {
                lastLoggedMinute = currentMinute;
                console.log(`Smooth progress: ${elapsed}s elapsed, ${actionCount} actions performed`);
            }
        }

        console.log(`Smooth actions completed: ${actionCount} actions in ${durationSeconds}s`);
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
        // Arrow keys only - avoid Tab/Space which can trigger focused buttons
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
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
 * Alternating behavior - switches between fast/jerky bursts and smooth/slow phases
 * With occasional long 10-15 second pauses (like thinking/distraction)
 * Most human-like pattern for real user simulation
 */
class AlternatingBehavior {
    /**
     * Perform fast, jerky movements (burst phase)
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performBurstPhase(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 2);

            try {
                switch (actionType) {
                    case 0: // Rapid mouse movements
                        for (let i = 0; i < randomInt(5, 15); i++) {
                            const x = randomInt(50, viewport.width - 50);
                            const y = randomInt(50, viewport.height - 50);
                            await page.mouse.move(x, y);
                            await sleep(randomBetween(15, 50)); // Quick but with jitter
                        }
                        break;

                    case 1: // Quick scrolls
                        for (let i = 0; i < randomInt(3, 8); i++) {
                            const direction = Math.random() > 0.5 ? 1 : -1;
                            const amount = randomInt(150, 400) * direction;
                            await page.evaluate((a) => window.scrollBy(0, a), amount);
                            await sleep(randomBetween(30, 100));
                        }
                        break;

                    case 2: // Fast key presses (arrow keys only, avoid Tab/Space)
                        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                        for (let i = 0; i < randomInt(2, 5); i++) {
                            const key = keys[randomInt(0, keys.length - 1)];
                            await page.keyboard.press(key);
                            await sleep(randomBetween(50, 150));
                        }
                        break;
                }

                // Short pause between burst actions (with jitter)
                await sleep(randomBetween(100, 400));

            } catch (error) {
                // Ignore errors during burst phase
            }
        }
    }

    /**
     * Perform smooth, slow movements (calm phase)
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performSmoothPhase(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 3);

            try {
                switch (actionType) {
                    case 0: // Slow mouse movement with Bezier curve
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        const x = randomInt(minX, maxX);
                        const y = randomInt(minY, maxY);
                        await HumanBehavior.moveMouseHumanLike(page, x, y, 80);
                        await sleep(randomBetween(200, 500));
                        break;

                    case 1: // Gentle scroll
                        const direction = Math.random() > 0.4 ? 1 : -1;
                        const totalAmount = randomInt(80, 200) * direction;
                        const steps = randomInt(5, 10);
                        for (let i = 0; i < steps; i++) {
                            await page.evaluate((a) => window.scrollBy(0, a), totalAmount / steps);
                            await sleep(randomBetween(100, 200));
                        }
                        break;

                    case 2: // Reading pause
                        await sleep(randomBetween(800, 2000));
                        break;

                    case 3: // Slow key press
                        await page.keyboard.press('ArrowDown');
                        await sleep(randomBetween(400, 800));
                        break;
                }

                // Natural pause between actions (with jitter)
                await sleep(randomBetween(500, 1500));

            } catch (error) {
                // Ignore errors during smooth phase
            }
        }
    }

    /**
     * Perform alternating behavior - switches between burst and smooth phases
     * with occasional long pauses
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;

        let phaseCount = 0;
        let lastLoggedMinute = 0;
        let isBurstPhase = Math.random() > 0.5; // Random start

        while (Date.now() < endTime) {
            const remainingTime = Math.max(0, (endTime - Date.now()) / 1000);
            if (remainingTime <= 0) break;

            // Determine phase duration with jitter (8-20 seconds)
            const phaseDuration = Math.min(randomBetween(8, 20), remainingTime);

            try {
                console.log(`Phase ${phaseCount + 1}: ${isBurstPhase ? 'BURST' : 'SMOOTH'} for ${phaseDuration.toFixed(1)}s`);

                if (isBurstPhase) {
                    await AlternatingBehavior.performBurstPhase(page, phaseDuration);
                } else {
                    await AlternatingBehavior.performSmoothPhase(page, phaseDuration);
                }

                phaseCount++;

                // Occasional long pause (10-15 seconds) like distraction/thinking
                // Happens roughly every 3-5 phases
                if (phaseCount % randomInt(3, 5) === 0 && Date.now() < endTime - 15000) {
                    const longPause = randomBetween(10000, 15000);
                    console.log(`  Long pause: ${(longPause / 1000).toFixed(1)}s (like distraction)`);
                    await sleep(longPause);
                } else {
                    // Normal transition pause with jitter
                    await sleep(randomBetween(500, 2000));
                }

                // Toggle phase
                isBurstPhase = !isBurstPhase;

            } catch (error) {
                console.log(`Alternating phase ${phaseCount} failed:`, error.message || String(error));
            }

            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentMinute = Math.floor(elapsed / 60);
            if (currentMinute > lastLoggedMinute) {
                lastLoggedMinute = currentMinute;
                console.log(`Alternating progress: ${elapsed}s elapsed, ${phaseCount} phases completed`);
            }
        }

        console.log(`Alternating actions completed: ${phaseCount} phases in ${durationSeconds}s`);
    }
}

/**
 * Advanced behavior - the most sophisticated human simulation
 * Combines alternating phases with XY jitter on all Bezier mouse movements
 * This adds micro-tremor to simulate human hand instability
 */
class AdvancedBehavior {
    /**
     * Add XY jitter to a position (simulates hand tremor)
     * @param {number} x - Base X position
     * @param {number} y - Base Y position
     * @param {number} [maxJitter=5] - Maximum jitter in pixels
     * @returns {{x: number, y: number}} - Position with jitter applied
     */
    static applyJitter(x, y, maxJitter = 5) {
        const jitterX = randomBetween(-maxJitter, maxJitter);
        const jitterY = randomBetween(-maxJitter, maxJitter);
        return {
            x: Math.max(0, x + jitterX),
            y: Math.max(0, y + jitterY)
        };
    }

    /**
     * Move mouse with Bezier curve AND XY jitter applied to each step
     * @param {import('@playwright/test').Page} page
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     * @param {number} [steps=40] - Number of movement steps
     */
    static async moveMouseWithJitter(page, targetX, targetY, steps = 40) {
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };
        
        // Get current position (from HumanBehavior's tracking)
        const startX = HumanBehavior.getCurrentX ? HumanBehavior.getCurrentX() : viewport.width / 2;
        const startY = HumanBehavior.getCurrentY ? HumanBehavior.getCurrentY() : viewport.height / 2;

        // Generate Bezier control points with jitter
        const cp1 = AdvancedBehavior.applyJitter(
            startX + (targetX - startX) * 0.3 + randomBetween(-50, 50),
            startY + (targetY - startY) * 0.3 + randomBetween(-50, 50),
            3
        );
        const cp2 = AdvancedBehavior.applyJitter(
            startX + (targetX - startX) * 0.7 + randomBetween(-50, 50),
            startY + (targetY - startY) * 0.7 + randomBetween(-50, 50),
            3
        );

        // Move along Bezier curve with jitter at each step
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            
            // Cubic Bezier calculation
            const baseX = Math.pow(1 - t, 3) * startX +
                         3 * Math.pow(1 - t, 2) * t * cp1.x +
                         3 * (1 - t) * Math.pow(t, 2) * cp2.x +
                         Math.pow(t, 3) * targetX;
            const baseY = Math.pow(1 - t, 3) * startY +
                         3 * Math.pow(1 - t, 2) * t * cp1.y +
                         3 * (1 - t) * Math.pow(t, 2) * cp2.y +
                         Math.pow(t, 3) * targetY;

            // Apply jitter that varies through the movement
            // Less jitter at start and end, more in the middle
            const jitterIntensity = Math.sin(t * Math.PI) * randomBetween(1, 5);
            const { x: jitteredX, y: jitteredY } = AdvancedBehavior.applyJitter(baseX, baseY, jitterIntensity);

            // Clamp to viewport
            const clampedX = Math.max(0, Math.min(viewport.width - 1, jitteredX));
            const clampedY = Math.max(0, Math.min(viewport.height - 1, jitteredY));

            await page.mouse.move(clampedX, clampedY);

            // Variable timing between steps with jitter
            await sleep(randomBetween(8, 25));
        }
    }

    /**
     * Perform burst phase with XY jitter
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performBurstPhase(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 2);

            try {
                switch (actionType) {
                    case 0: // Rapid mouse movements with jitter
                        for (let i = 0; i < randomInt(3, 8); i++) {
                            const maxX = Math.max(50, viewport.width - 50);
                            const maxY = Math.max(50, viewport.height - 50);
                            const x = randomInt(50, maxX);
                            const y = randomInt(50, maxY);
                            await AdvancedBehavior.moveMouseWithJitter(page, x, y, randomInt(15, 25));
                            await sleep(randomBetween(50, 150));
                        }
                        break;

                    case 1: // Quick scrolls with timing jitter
                        for (let i = 0; i < randomInt(3, 6); i++) {
                            const direction = Math.random() > 0.5 ? 1 : -1;
                            const amount = randomInt(150, 350) * direction;
                            await page.evaluate((a) => window.scrollBy(0, a), amount);
                            await sleep(randomBetween(40, 120));
                        }
                        break;

                    case 2: // Fast key presses with timing jitter
                        // Note: Avoid 'Space' as it can trigger focused buttons (like Stop)
                        // Avoid 'Tab' as it can navigate to interactive elements
                        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                        for (let i = 0; i < randomInt(2, 4); i++) {
                            const key = keys[randomInt(0, keys.length - 1)];
                            await page.keyboard.press(key);
                            await sleep(randomBetween(60, 180));
                        }
                        break;
                }

                await sleep(randomBetween(100, 400));

            } catch (error) {
                // Ignore errors during burst phase
            }
        }
    }

    /**
     * Perform smooth phase with XY jitter on Bezier movements
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performSmoothPhase(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 3);

            try {
                switch (actionType) {
                    case 0: // Slow Bezier mouse movement with XY jitter
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        const x = randomInt(minX, maxX);
                        const y = randomInt(minY, maxY);
                        await AdvancedBehavior.moveMouseWithJitter(page, x, y, randomInt(50, 80));
                        await sleep(randomBetween(300, 700));
                        break;

                    case 1: // Gentle scroll with timing jitter
                        const direction = Math.random() > 0.4 ? 1 : -1;
                        const totalAmount = randomInt(80, 180) * direction;
                        const steps = randomInt(6, 12);
                        for (let i = 0; i < steps; i++) {
                            await page.evaluate((a) => window.scrollBy(0, a), totalAmount / steps);
                            await sleep(randomBetween(80, 200));
                        }
                        break;

                    case 2: // Reading pause with jitter
                        await sleep(randomBetween(1000, 2500));
                        break;

                    case 3: // Slow key press
                        await page.keyboard.press('ArrowDown');
                        await sleep(randomBetween(500, 1000));
                        break;
                }

                await sleep(randomBetween(600, 1800));

            } catch (error) {
                // Ignore errors during smooth phase
            }
        }
    }

    /**
     * Perform silence phase - minimal activity with occasional tiny movements
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performSilencePhase(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            // Mostly just wait, occasionally tiny mouse movement (like hand resting on mouse)
            if (Math.random() < 0.1) {
                // Very small movement (1-10 pixels)
                const currentX = viewport.width / 2;
                const currentY = viewport.height / 2;
                const { x, y } = AdvancedBehavior.applyJitter(currentX, currentY, 10);
                await page.mouse.move(x, y);
            }
            await sleep(randomBetween(500, 2000));
        }
    }

    /**
     * Perform advanced behavior - alternates between burst, smooth, and silence phases
     * with XY jitter on all Bezier mouse movements
     * @param {import('@playwright/test').Page} page
     * @param {number} durationSeconds
     */
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;

        let phaseCount = 0;
        let lastLoggedMinute = 0;
        const phases = ['burst', 'smooth', 'silence'];
        let currentPhaseIndex = randomInt(0, 2);

        while (Date.now() < endTime) {
            const remainingTime = Math.max(0, (endTime - Date.now()) / 1000);
            if (remainingTime <= 0) break;

            // Phase duration varies by type
            let phaseDuration;
            const currentPhase = phases[currentPhaseIndex];
            
            switch (currentPhase) {
                case 'burst':
                    phaseDuration = Math.min(randomBetween(8, 15), remainingTime);
                    break;
                case 'smooth':
                    phaseDuration = Math.min(randomBetween(10, 20), remainingTime);
                    break;
                case 'silence':
                    phaseDuration = Math.min(randomBetween(10, 15), remainingTime);
                    break;
            }

            try {
                console.log(`Advanced Phase ${phaseCount + 1}: ${currentPhase.toUpperCase()} for ${phaseDuration.toFixed(1)}s`);

                switch (currentPhase) {
                    case 'burst':
                        await AdvancedBehavior.performBurstPhase(page, phaseDuration);
                        break;
                    case 'smooth':
                        await AdvancedBehavior.performSmoothPhase(page, phaseDuration);
                        break;
                    case 'silence':
                        await AdvancedBehavior.performSilencePhase(page, phaseDuration);
                        break;
                }

                phaseCount++;

                // Transition pause with jitter
                await sleep(randomBetween(300, 1500));

                // Move to next phase (with some randomness)
                if (Math.random() < 0.7) {
                    // Usually go to next phase
                    currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
                } else {
                    // Sometimes skip a phase or repeat
                    currentPhaseIndex = randomInt(0, 2);
                }

            } catch (error) {
                console.log(`Advanced phase ${phaseCount} failed:`, error.message || String(error));
            }

            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const currentMinute = Math.floor(elapsed / 60);
            if (currentMinute > lastLoggedMinute) {
                lastLoggedMinute = currentMinute;
                console.log(`Advanced progress: ${elapsed}s elapsed, ${phaseCount} phases completed`);
            }
        }

        console.log(`Advanced actions completed: ${phaseCount} phases in ${durationSeconds}s`);
    }
}

/**
 * Human Fast behavior - human-like but with faster movements
 */
class HumanFastBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 3);

            try {
                switch (actionType) {
                    case 0: // Fast Bezier mouse movement
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        const x = randomInt(minX, maxX);
                        const y = randomInt(minY, maxY);
                        await HumanBehavior.humanLikeMouseMove(page, x, y, randomInt(10, 20));
                        break;
                    case 1: // Fast scroll
                        await page.evaluate((a) => window.scrollBy(0, a), randomInt(-200, 200));
                        break;
                    case 2: // Fast key press
                        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
                        await page.keyboard.press(keys[randomInt(0, keys.length - 1)]);
                        break;
                    case 3: // Quick mouse click area
                        const cx = randomInt(100, viewport.width - 100);
                        const cy = randomInt(100, viewport.height - 100);
                        await HumanBehavior.humanLikeMouseMove(page, cx, cy, 10);
                        break;
                }
                await sleep(randomBetween(50, 200)); // Faster timing
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Human Slow behavior - human-like but with slower, careful movements
 */
class HumanSlowBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 3);

            try {
                switch (actionType) {
                    case 0: // Slow Bezier mouse movement
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        const x = randomInt(minX, maxX);
                        const y = randomInt(minY, maxY);
                        await HumanBehavior.humanLikeMouseMove(page, x, y, randomInt(80, 120));
                        break;
                    case 1: // Very slow scroll
                        for (let i = 0; i < 5; i++) {
                            await page.evaluate((a) => window.scrollBy(0, a), randomInt(-30, 30));
                            await sleep(randomBetween(150, 300));
                        }
                        break;
                    case 2: // Long reading pause
                        await sleep(randomBetween(2000, 5000));
                        break;
                    case 3: // Slow key press
                        await page.keyboard.press('ArrowDown');
                        await sleep(randomBetween(500, 1500));
                        break;
                }
                await sleep(randomBetween(800, 2000)); // Much slower timing
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Robot Slow behavior - robot-like but with slower timing
 */
class RobotSlowBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const actionType = randomInt(0, 2);

            try {
                switch (actionType) {
                    case 0: // Straight line mouse move
                        await page.mouse.move(randomInt(0, viewport.width), randomInt(0, viewport.height));
                        break;
                    case 1: // Fixed scroll
                        await page.evaluate(() => window.scrollBy(0, 100));
                        break;
                    case 2: // Fixed key press
                        await page.keyboard.press('ArrowDown');
                        break;
                }
                await sleep(500); // Slower fixed timing
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Burst Only behavior - only rapid/burst movements
 */
class BurstOnlyBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            // Rapid bursts of activity
            for (let burst = 0; burst < randomInt(5, 15); burst++) {
                const actionType = randomInt(0, 2);
                try {
                    switch (actionType) {
                        case 0:
                            await page.mouse.move(randomInt(0, viewport.width), randomInt(0, viewport.height));
                            break;
                        case 1:
                            await page.evaluate((a) => window.scrollBy(0, a), randomInt(-300, 300));
                            break;
                        case 2:
                            await page.keyboard.press('ArrowDown');
                            break;
                    }
                    await sleep(randomBetween(10, 50)); // Very fast between actions
                } catch (error) { /* ignore */ }
            }
            // Short pause between bursts
            await sleep(randomBetween(100, 500));
        }
    }
}

/**
 * Scroll Heavy behavior - primarily scroll-based
 */
class ScrollHeavyBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;

        while (Date.now() < endTime) {
            const scrollType = randomInt(0, 3);

            try {
                switch (scrollType) {
                    case 0: // Continuous scroll down
                        for (let i = 0; i < randomInt(5, 15); i++) {
                            await page.evaluate((a) => window.scrollBy(0, a), randomInt(50, 150));
                            await sleep(randomBetween(30, 100));
                        }
                        break;
                    case 1: // Continuous scroll up
                        for (let i = 0; i < randomInt(5, 15); i++) {
                            await page.evaluate((a) => window.scrollBy(0, a), randomInt(-150, -50));
                            await sleep(randomBetween(30, 100));
                        }
                        break;
                    case 2: // Jump scroll
                        await page.evaluate((a) => window.scrollBy(0, a), randomInt(-500, 500));
                        break;
                    case 3: // Reading pause
                        await sleep(randomBetween(500, 1500));
                        break;
                }
                await sleep(randomBetween(200, 800));
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Mouse Heavy behavior - primarily mouse movement-based
 */
class MouseHeavyBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const viewport = page.viewportSize() || { width: 1920, height: 1080 };

        while (Date.now() < endTime) {
            const moveType = randomInt(0, 3);

            try {
                switch (moveType) {
                    case 0: // Bezier curve movement
                        const maxX = Math.max(0, viewport.width - 100);
                        const minX = Math.min(100, maxX);
                        const maxY = Math.max(0, viewport.height - 100);
                        const minY = Math.min(100, maxY);
                        await HumanBehavior.humanLikeMouseMove(page, randomInt(minX, maxX), randomInt(minY, maxY), randomInt(20, 50));
                        break;
                    case 1: // Small jittery movements
                        for (let i = 0; i < randomInt(5, 10); i++) {
                            const currentPos = { x: randomInt(100, viewport.width - 100), y: randomInt(100, viewport.height - 100) };
                            await page.mouse.move(currentPos.x + randomInt(-20, 20), currentPos.y + randomInt(-20, 20));
                            await sleep(randomBetween(20, 80));
                        }
                        break;
                    case 2: // Long sweep
                        await HumanBehavior.humanLikeMouseMove(page, randomInt(50, viewport.width - 50), randomInt(50, viewport.height - 50), randomInt(60, 100));
                        break;
                    case 3: // Hover pause
                        await sleep(randomBetween(300, 1000));
                        break;
                }
                await sleep(randomBetween(100, 400));
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Keyboard Heavy behavior - primarily keyboard-based
 */
class KeyboardHeavyBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];

        while (Date.now() < endTime) {
            const keyType = randomInt(0, 3);

            try {
                switch (keyType) {
                    case 0: // Rapid key presses
                        for (let i = 0; i < randomInt(3, 8); i++) {
                            await page.keyboard.press(keys[randomInt(0, keys.length - 1)]);
                            await sleep(randomBetween(50, 150));
                        }
                        break;
                    case 1: // Slow key presses
                        await page.keyboard.press(keys[randomInt(0, keys.length - 1)]);
                        await sleep(randomBetween(500, 1500));
                        break;
                    case 2: // Key hold simulation
                        const key = keys[randomInt(0, 3)]; // Only arrow keys
                        for (let i = 0; i < randomInt(3, 6); i++) {
                            await page.keyboard.press(key);
                            await sleep(randomBetween(80, 200));
                        }
                        break;
                    case 3: // Thinking pause
                        await sleep(randomBetween(1000, 3000));
                        break;
                }
                await sleep(randomBetween(200, 600));
            } catch (error) { /* ignore */ }
        }
    }
}

/**
 * Mixed Random behavior - randomly switches between all modes
 */
class MixedRandomBehavior {
    static async performRandomActions(page, durationSeconds) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        
        const behaviors = [
            HumanBehavior, RobotBehavior, ImpulsiveBehavior, 
            SmoothBehavior, HumanFastBehavior, HumanSlowBehavior,
            ScrollHeavyBehavior, MouseHeavyBehavior, KeyboardHeavyBehavior
        ];

        while (Date.now() < endTime) {
            // Pick a random behavior and run it for 5-20 seconds
            const behavior = behaviors[randomInt(0, behaviors.length - 1)];
            const segmentDuration = randomInt(5, 20);
            const actualDuration = Math.min(segmentDuration, (endTime - Date.now()) / 1000);
            
            if (actualDuration > 0) {
                try {
                    await behavior.performRandomActions(page, actualDuration);
                } catch (error) { /* ignore */ }
            }
            
            // Random pause between segments
            await sleep(randomBetween(200, 1000));
        }
    }
}

/**
 * Start a behavior monitor session
 * @param {import('@playwright/test').Page} page
 * @param {BehaviorMode} mode - Behavior mode for clicking
 */
async function startSession(page, mode = BehaviorMode.HUMAN_LIKE) {
    await page.goto('/behavior-monitor.html');

    const isHumanLike = mode === BehaviorMode.HUMAN_LIKE || 
                        mode === BehaviorMode.HUMAN_SMOOTH || 
                        mode === BehaviorMode.HUMAN_IMPULSIVE ||
                        mode === BehaviorMode.ALTERNATING ||
                        mode === BehaviorMode.ADVANCED ||
                        mode === BehaviorMode.HUMAN_FAST ||
                        mode === BehaviorMode.HUMAN_SLOW ||
                        mode === BehaviorMode.MOUSE_HEAVY ||
                        mode === BehaviorMode.MIXED_RANDOM;

    if (isHumanLike) {
        await HumanBehavior.pageLoadDelay();
    } else {
        await sleep(500); // Minimal delay for robot mode
    }

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Headless Behavior Monitor');

    // Wait for start button to be enabled before clicking
    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeEnabled({ timeout: 10000 });

    // Click start button
    if (isHumanLike) {
        await HumanBehavior.clickWithHumanBehavior(page, '#start-btn');
    } else {
        await RobotBehavior.click(page, '#start-btn');
    }

    // Verify session started - wait for status text to change
    await expect(page.locator('#status-text')).toHaveText('Session Running', { timeout: 10000 });

    // Also verify the stop button is now enabled (session is truly running)
    const stopBtn = page.locator('#stop-btn');
    await expect(stopBtn).toBeEnabled({ timeout: 10000 });
    
    console.log('✅ Session started successfully');
}

/**
 * Stop a behavior monitor session and get results
 * @param {import('@playwright/test').Page} page
 * @param {BehaviorMode} mode - Behavior mode for clicking
 * @returns {Promise<{results: object, status: object}>}
 */
async function stopSessionAndGetResults(page, mode = BehaviorMode.HUMAN_LIKE) {
    const isHumanLike = mode === BehaviorMode.HUMAN_LIKE || 
                        mode === BehaviorMode.HUMAN_SMOOTH || 
                        mode === BehaviorMode.HUMAN_IMPULSIVE ||
                        mode === BehaviorMode.ALTERNATING ||
                        mode === BehaviorMode.ADVANCED ||
                        mode === BehaviorMode.HUMAN_FAST ||
                        mode === BehaviorMode.HUMAN_SLOW ||
                        mode === BehaviorMode.MOUSE_HEAVY ||
                        mode === BehaviorMode.MIXED_RANDOM;

    // Small pause before stopping
    if (isHumanLike) {
        await HumanBehavior.randomDelay(0.5, 1);
    }

    // Wait for stop button to be enabled before clicking
    const stopBtn = page.locator('#stop-btn');
    await expect(stopBtn).toBeEnabled({ timeout: 30000 });
    
    console.log('✅ Stop button is enabled, clicking to stop session');

    // Click stop button
    if (isHumanLike) {
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

        case BehaviorMode.HUMAN_SMOOTH:
            // Smooth, slow movements with enhanced timing jitter
            await SmoothBehavior.performRandomActions(page, durationSeconds);
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

        case BehaviorMode.ALTERNATING:
            // Alternating between fast/jerky and smooth/slow with long pauses
            await AlternatingBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.ADVANCED:
            // Most advanced: alternating phases + XY jitter on Bezier curves
            await AdvancedBehavior.performRandomActions(page, durationSeconds);
            break;

        // New diversified behavior modes
        case BehaviorMode.HUMAN_FAST:
            await HumanFastBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.HUMAN_SLOW:
            await HumanSlowBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.ROBOT_SLOW:
            await RobotSlowBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.BURST_ONLY:
            await BurstOnlyBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.SCROLL_HEAVY:
            await ScrollHeavyBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.MOUSE_HEAVY:
            await MouseHeavyBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.KEYBOARD_HEAVY:
            await KeyboardHeavyBehavior.performRandomActions(page, durationSeconds);
            break;

        case BehaviorMode.MIXED_RANDOM:
            await MixedRandomBehavior.performRandomActions(page, durationSeconds);
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
    const isHumanLike = mode === BehaviorMode.HUMAN_LIKE || 
                        mode === BehaviorMode.HUMAN_SMOOTH || 
                        mode === BehaviorMode.HUMAN_IMPULSIVE ||
                        mode === BehaviorMode.ALTERNATING ||
                        mode === BehaviorMode.ADVANCED ||
                        mode === BehaviorMode.HUMAN_FAST ||
                        mode === BehaviorMode.HUMAN_SLOW ||
                        mode === BehaviorMode.MOUSE_HEAVY ||
                        mode === BehaviorMode.MIXED_RANDOM;
    if (isHumanLike) {
        resetMousePosition();
    }

    // Start session
    await startSession(page, mode);

    // Perform actions
    await performActions(page, durationSeconds, mode);

    // Stop and get results
    const { results, status } = await stopSessionAndGetResults(page, mode);

    // Get calibration data for detailed metrics export
    // Note: The HTML page stores the monitor as window.__behaviorMonitor
    const calibrationData = await page.evaluate(() => {
        const monitor = window.__behaviorMonitor || window.behaviorMonitor;
        if (monitor && typeof monitor.getCalibrationData === 'function') {
            return monitor.getCalibrationData();
        }
        return null;
    });

    // Validate results
    expect(results).not.toBeNull();
    console.log('Session Results:', JSON.stringify(results, null, 2));
    console.log('Final Status:', JSON.stringify(status, null, 2));
    
    // Log calibration data for weight tuning
    if (calibrationData) {
        console.log('\n=== CALIBRATION DATA (for weight tuning) ===');
        console.log(JSON.stringify(calibrationData, null, 2));
        console.log('==============================================\n');
        
        // Output calibration data in a structured format for easy parsing by CI
        // This allows the data to be extracted and saved as an artifact
        console.log('===CALIBRATION_JSON_START===');
        console.log(JSON.stringify({
            testMode: mode,
            timestamp: new Date().toISOString(),
            durationSeconds,
            results,
            status,
            calibration: calibrationData
        }));
        console.log('===CALIBRATION_JSON_END===');
    }

    // Assert score is within expected range
    expect(results.overallScore).toBeGreaterThanOrEqual(minExpectedScore);
    expect(results.overallScore).toBeLessThanOrEqual(maxExpectedScore);

    console.log(`Overall Bot Score: ${results.overallScore} (expected: ${minExpectedScore}-${maxExpectedScore})`);

    return { results, status, calibrationData };
}

module.exports = {
    BehaviorMode,
    RobotBehavior,
    ImpulsiveBehavior,
    AlternatingBehavior,
    AdvancedBehavior,
    SmoothBehavior,
    HumanFastBehavior,
    HumanSlowBehavior,
    RobotSlowBehavior,
    BurstOnlyBehavior,
    ScrollHeavyBehavior,
    MouseHeavyBehavior,
    KeyboardHeavyBehavior,
    MixedRandomBehavior,
    startSession,
    stopSessionAndGetResults,
    performActions,
    runBehaviorSession
};
