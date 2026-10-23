const { test, expect } = require('@playwright/test');

test('UI smoke test', async ({ page }) => {

    const appErrors = [];

    // Actual uncaught JavaScript exceptions
    page.on('pageerror', error => {
        appErrors.push(`JS ERROR: ${error.message}`);
    });

    // Important console errors only
    page.on('console', msg => {

        if (msg.type() !== 'error') {
            return;
        }

        const text = msg.text();

        // Ignore known third-party/network noise
        const ignoredPatterns = [
            'adtrafficquality.google',
            'googlesyndication.com',
            'Failed to load resource'
        ];

        if (ignoredPatterns.some(pattern => text.includes(pattern))) {
            return;
        }

        appErrors.push(`CONSOLE ERROR: ${text}`);
    });

    await page.goto('/', {
        waitUntil: 'domcontentloaded'
    });

    await expect(page.locator('body')).toBeVisible();

    await page.screenshot({
        path: 'test-results/homepage.png',
        fullPage: true
    });

    expect(
        appErrors,
        `Application errors detected:\n${appErrors.join('\n\n')}`
    ).toEqual([]);
});