const { test, expect } = require('@playwright/test');

test('check links', async ({ page, request }) => {

    await page.goto('/');

    const links = await page.locator('a').evaluateAll(elements =>
        elements
            .map(el => el.href)
            .filter(Boolean)
    );

    const uniqueLinks = [...new Set(links)];

    const broken = [];

    for (const link of uniqueLinks) {

        if (
            link.startsWith('mailto:') ||
            link.startsWith('tel:') ||
            link.startsWith('javascript:')
        ) {
            continue;
        }

        try {

            const response = await request.get(link);

            if (response.status() >= 400) {
                broken.push({
                    url: link,
                    status: response.status()
                });
            }

        } catch (error) {

            broken.push({
                url: link,
                error: error.message
            });
        }
    }

    console.log(`Checked ${uniqueLinks.length} links`);

    if (broken.length) {
        console.log('BROKEN LINKS:');
        console.log(broken);
    }

    expect(broken).toEqual([]);
});