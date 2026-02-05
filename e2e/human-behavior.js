/**
 * Human-like behavior emulation for Playwright browser automation
 * Adapted from Python implementation for bypassing headless detection
 */

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

class HumanBehavior {
    /**
     * Get viewport size with fallback to default
     * @param {import('@playwright/test').Page} page - Playwright page
     * @returns {{width: number, height: number}}
     */
    static getViewportSize(page) {
        const viewportSize = page.viewportSize();
        if (!viewportSize) {
            return { width: 1920, height: 1080 };
        }
        return viewportSize;
    }

    /**
     * Random delay for human-like timing
     * @param {number} minSeconds - Minimum delay in seconds
     * @param {number} maxSeconds - Maximum delay in seconds
     * @returns {Promise<void>}
     */
    static async randomDelay(minSeconds = 0.5, maxSeconds = 2.0) {
        const delay = randomBetween(minSeconds, maxSeconds);
        await sleep(delay * 1000);
    }

    /**
     * Delay between keystrokes (50-150ms)
     * @returns {Promise<void>}
     */
    static async typingDelay() {
        const delay = randomBetween(0.05, 0.15);
        await sleep(delay * 1000);
    }

    /**
     * Delay for "reading" text
     * Approximately 200-300 words per minute = 200-300ms per word
     * @param {number} textLength - Length of text in characters
     * @returns {Promise<void>}
     */
    static async readingDelay(textLength) {
        const words = textLength / 5; // approximately 5 characters per word
        let readingTime = words * randomBetween(0.2, 0.3);
        // Minimum 1 second, maximum 10 seconds
        readingTime = Math.max(1.0, Math.min(10.0, readingTime));
        await sleep(readingTime * 1000);
    }

    /**
     * Delay after page load
     * @returns {Promise<void>}
     */
    static async pageLoadDelay() {
        await sleep(randomBetween(1.0, 3.0) * 1000);
    }

    /**
     * Bezier curve for smooth mouse movement
     * Cubic bezier (0.25, 0.1, 0.25, 1)
     * @param {number} t - Progress (0 to 1)
     * @returns {number}
     */
    static bezierCurve(t) {
        return 3 * Math.pow(1 - t, 2) * t * 0.25 + 3 * (1 - t) * Math.pow(t, 2) * 0.25 + Math.pow(t, 3);
    }

    /**
     * Smooth mouse movement with Bezier curve and jitter
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} steps - Number of steps for movement
     * @returns {Promise<void>}
     */
    static async moveMouseHumanLike(page, targetX, targetY, steps = 50) {
        const viewportSize = HumanBehavior.getViewportSize(page);
        
        const startX = viewportSize.width / 2;
        const startY = viewportSize.height / 2;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const progress = HumanBehavior.bezierCurve(t);

            // Current position with Bezier interpolation
            let x = startX + (targetX - startX) * progress;
            let y = startY + (targetY - startY) * progress;

            // Add jitter (small deviations)
            const jitterX = randomBetween(-3, 3);
            const jitterY = randomBetween(-3, 3);

            x += jitterX;
            y += jitterY;

            // Move mouse
            await page.mouse.move(x, y);

            // Micro-delay between steps
            await sleep(randomBetween(10, 30));
        }

        // Final position without jitter
        await page.mouse.move(targetX, targetY);
    }

    /**
     * Smooth page scrolling with pauses
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {number} scrollDistance - Scroll distance in pixels
     * @param {'down'|'up'} direction - Scroll direction
     * @returns {Promise<void>}
     */
    static async scrollPageHumanLike(page, scrollDistance = 300, direction = 'down') {
        const scrollAmount = direction === 'down' ? scrollDistance : -scrollDistance;
        const steps = randomInt(3, 6); // 3-6 scroll steps
        const stepSize = scrollAmount / steps;

        for (let i = 0; i < steps; i++) {
            // Scroll part
            await page.evaluate((amount) => window.scrollBy(0, amount), stepSize);
            // Pause like a human
            await sleep(randomBetween(100, 300));
        }

        // Pause after scrolling (human reads)
        await sleep(randomBetween(500, 1500));
    }

    /**
     * Click with human-like behavior:
     * 1. Scroll to element
     * 2. Move mouse to element
     * 3. Small pause
     * 4. Click
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {string} selector - CSS selector
     * @param {boolean} scrollIntoView - Whether to scroll element into view
     * @returns {Promise<void>}
     */
    static async clickWithHumanBehavior(page, selector, scrollIntoView = true) {
        const element = page.locator(selector).first();

        // Scroll to element if needed
        if (scrollIntoView) {
            await element.scrollIntoViewIfNeeded();
            await sleep(randomBetween(300, 700));
        }

        // Get element coordinates
        const box = await element.boundingBox();
        if (box) {
            // Click at center of element with small deviation
            const centerX = box.x + box.width / 2 + randomBetween(-5, 5);
            const centerY = box.y + box.height / 2 + randomBetween(-5, 5);

            // Smoothly move mouse to element
            await HumanBehavior.moveMouseHumanLike(page, centerX, centerY);

            // Pause before click
            await sleep(randomBetween(100, 300));

            // Click
            await element.click();
        } else {
            // If coordinates unavailable, just click
            await element.click();
        }
    }

    /**
     * Type text like a human with random delays
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {string} selector - CSS selector of input field
     * @param {string} text - Text to type
     * @returns {Promise<void>}
     */
    static async typeLikeHuman(page, selector, text) {
        const element = page.locator(selector).first();
        await element.click();

        // Delay before starting to type
        await sleep(randomBetween(200, 500));

        for (const char of text) {
            await element.type(char);
            // Random delay between characters
            let delay = randomBetween(50, 150);
            // Sometimes make longer pauses (like human thinking)
            if (Math.random() < 0.1) {
                delay += randomBetween(200, 500);
            }
            await sleep(delay);
        }

        // Delay after typing
        await sleep(randomBetween(300, 700));
    }

    /**
     * Random mouse movements across the page (like human reading)
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {number} numMovements - Number of movements
     * @returns {Promise<void>}
     */
    static async randomMouseMovement(page, numMovements = 3) {
        const viewportSize = HumanBehavior.getViewportSize(page);

        for (let i = 0; i < numMovements; i++) {
            // Random point within window
            const x = randomInt(100, viewportSize.width - 100);
            const y = randomInt(100, viewportSize.height - 100);

            // Smoothly move mouse
            await HumanBehavior.moveMouseHumanLike(page, x, y, 30);

            // Pause
            await sleep(randomBetween(500, 1500));
        }
    }

    /**
     * Press a key with human-like timing
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {string} key - Key to press
     * @returns {Promise<void>}
     */
    static async pressKeyHumanLike(page, key) {
        await page.keyboard.down(key);
        await sleep(randomBetween(50, 150)); // Hold time
        await page.keyboard.up(key);
        await sleep(randomBetween(100, 300)); // Pause after key
    }

    /**
     * Perform random human-like actions on the page
     * This is useful for filling a monitoring session with varied behavior
     * @param {import('@playwright/test').Page} page - Playwright page
     * @param {number} durationSeconds - Duration of random actions in seconds
     * @returns {Promise<void>}
     */
    static async performRandomActions(page, durationSeconds = 300) {
        const startTime = Date.now();
        const endTime = startTime + durationSeconds * 1000;
        
        const actions = [
            'mousemove',
            'scroll',
            'idle',
            'keypress'
        ];

        let actionCount = 0;
        
        while (Date.now() < endTime) {
            const action = actions[randomInt(0, actions.length - 1)];
            
            try {
                switch (action) {
                    case 'mousemove':
                        await HumanBehavior.randomMouseMovement(page, randomInt(1, 3));
                        break;
                    
                    case 'scroll':
                        const direction = Math.random() > 0.5 ? 'down' : 'up';
                        const distance = randomInt(100, 400);
                        await HumanBehavior.scrollPageHumanLike(page, distance, direction);
                        break;
                    
                    case 'idle':
                        // Just wait - humans don't do stuff constantly
                        await sleep(randomBetween(2000, 5000));
                        break;
                    
                    case 'keypress':
                        // Press Tab or Arrow keys occasionally
                        const keys = ['Tab', 'ArrowDown', 'ArrowUp', 'Space'];
                        const key = keys[randomInt(0, keys.length - 1)];
                        await HumanBehavior.pressKeyHumanLike(page, key);
                        break;
                }
                
                actionCount++;
                
                // Add a random pause between actions (1-5 seconds)
                // This keeps the action rate reasonable
                await sleep(randomBetween(1000, 5000));
                
            } catch (error) {
                // Ignore errors from actions (e.g., scroll at page end)
                console.log(`Action ${action} failed:`, error.message);
            }
            
            // Log progress every minute
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            if (elapsed > 0 && elapsed % 60 === 0) {
                console.log(`Progress: ${elapsed}s elapsed, ${actionCount} actions performed`);
            }
        }
        
        console.log(`Random actions completed: ${actionCount} actions in ${durationSeconds}s`);
    }
}

module.exports = { HumanBehavior, sleep, randomBetween, randomInt };
