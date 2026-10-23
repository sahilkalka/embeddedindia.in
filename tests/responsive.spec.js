const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'mobile-small', width: 375, height: 667 },
  { name: 'mobile-regular', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 }
];

const PUBLIC_PAGES = ['/', '/tools', '/contact', '/services', '/projects', '/about', '/privacy-policy'];

test.describe('Responsive Layout & Viewport Verification', () => {

  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {

      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const pagePath of PUBLIC_PAGES) {
        test(`public page ${pagePath} has no horizontal overflow`, async ({ page }) => {
          await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

          const overflow = await page.evaluate(() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              scrollWidth: docWidth,
              innerWidth: winWidth,
              hasHorizontalOverflow: docWidth > winWidth + 2 // allow 2px subpixel tolerance
            };
          });

          expect(
            overflow.hasHorizontalOverflow,
            `Page ${pagePath} has horizontal overflow at ${vp.width}px: scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`
          ).toBe(false);
        });
      }

      test('mobile navigation menu toggles correctly on small viewports', async ({ page }) => {
        if (vp.width >= 1024) return; // public desktop nav is visible >= 1024px

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        const mobileMenuBtn = page.locator('#mobile-menu-btn, button[aria-label*="menu" i]').first();
        if (await mobileMenuBtn.count() > 0 && await mobileMenuBtn.isVisible()) {
          await mobileMenuBtn.click();
          const mobileDrawer = page.locator('#mobile-menu, [data-mobile-menu]');
          if (await mobileDrawer.count() > 0) {
            await expect(mobileDrawer.first()).toBeVisible();
          }
        }
      });
    });
  }

  test.describe('Admin Settings Responsiveness', () => {
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

    test('admin settings modules render cleanly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.context().addCookies(authCookies);
      await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });

      // Verify no horizontal overflow in settings
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth + 2;
      });
      expect(overflow).toBe(true);

      // Verify mobile settings navigation switches tabs
      const seoTabBtn = page.locator('[data-settings-tab="seo-scripts"]').first();
      await expect(seoTabBtn).toBeVisible();
      await seoTabBtn.click();
      await expect(page.locator('#seo-scripts')).toBeVisible();

      // Screenshot mobile settings
      await page.screenshot({
        path: 'test-results/audit/responsive/admin-settings-mobile.png',
        fullPage: false
      });
    });

    test('admin settings renders side-by-side workspace on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.context().addCookies(authCookies);
      await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });

      const sidebar = page.locator('#settingsLeftSidebar');
      const content = page.locator('.settings-content');
      await expect(sidebar).toBeVisible();
      await expect(content).toBeVisible();

      await page.screenshot({
        path: 'test-results/audit/responsive/admin-settings-desktop.png',
        fullPage: false
      });
    });
  });
});
