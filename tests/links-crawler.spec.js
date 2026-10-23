const { test, expect } = require('@playwright/test');

const CORE_ROUTES = [
  '/',
  '/tools',
  '/contact',
  '/services',
  '/projects',
  '/about',
  '/privacy-policy'
];

const ADMIN_ROUTES = [
  '/admin',
  '/admin/inquiries',
  '/admin/subscribers',
  '/admin/posts',
  '/admin/projects',
  '/admin/settings',
  '/admin/ai'
];

test.describe('Automated Link Crawler & Health Check', () => {
  let authCookies;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@embeddedindia.in');
    await page.fill('input[name="password"]', 'AdminEmbedded@2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
    authCookies = (await context.storageState()).cookies;
    await context.close();
  });

  test('Public and Admin core routes return HTTP 200 without JavaScript exceptions', async ({ page }) => {
    await page.context().addCookies(authCookies);
    const jsErrors = [];

    page.on('pageerror', err => {
      jsErrors.push(`Uncaught JS exception: ${err.message}`);
    });

    const allRoutes = [...CORE_ROUTES, ...ADMIN_ROUTES];
    for (const route of allRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response.status(), `Route ${route} returned error status ${response.status()}`).toBe(200);
      await expect(page.locator('body')).toBeVisible();
    }

    expect(jsErrors, `JavaScript errors encountered during route traversal:\n${jsErrors.join('\n')}`).toEqual([]);
  });

  test('Deep crawl of internal links on public website', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Gather all href attributes from anchor tags across public pages
    const visited = new Set();
    const toVisit = new Set(CORE_ROUTES);
    const discoveredLinks = new Set();

    for (const route of toVisit) {
      if (visited.has(route)) continue;
      visited.add(route);

      try {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const hrefs = await page.locator('a[href]').evaluateAll(elements =>
          elements.map(a => a.getAttribute('href')).filter(Boolean)
        );

        for (const href of hrefs) {
          if (
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            href.startsWith('#') ||
            href.startsWith('http://') ||
            href.startsWith('https://')
          ) {
            continue;
          }
          // Normalize clean path
          const cleanPath = href.split('?')[0].split('#')[0];
          if (cleanPath && cleanPath.startsWith('/')) {
            discoveredLinks.add(cleanPath);
          }
        }
      } catch (e) {
        // Continue crawling
      }
    }

    console.log(`Discovered ${discoveredLinks.size} unique internal public paths`);

    // Verify all discovered internal paths return valid HTTP responses
    const brokenLinks = [];
    for (const link of discoveredLinks) {
      try {
        const res = await request.get(link);
        if (res.status() >= 400 && res.status() !== 401 && res.status() !== 403) {
          brokenLinks.push({ url: link, status: res.status() });
        }
      } catch (err) {
        brokenLinks.push({ url: link, error: err.message });
      }
    }

    if (brokenLinks.length > 0) {
      console.error('Broken links found:', brokenLinks);
    }
    expect(brokenLinks, `Discovered broken links: ${JSON.stringify(brokenLinks, null, 2)}`).toEqual([]);
  });
});
