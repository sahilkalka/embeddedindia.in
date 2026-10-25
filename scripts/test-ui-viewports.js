const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const SCREEN_PROFILES = [
  { name: 'Desktop', width: 1440, height: 900, isMobileView: false },
  { name: 'Tablet',  width: 768,  height: 1024, isMobileView: false },
  { name: 'Mobile',  width: 375,  height: 812,  isMobileView: true }
];

const PUBLIC_PAGES = [
  '/',
  '/services',
  '/projects',
  '/tools',
  '/blogs',
  '/about',
  '/contact'
];

async function isServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
    return res.status === 200 || res.status === 302;
  } catch (e) {
    return false;
  }
}

async function gotoWithRetry(page, url, options = { waitUntil: 'domcontentloaded', timeout: 25000 }, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await page.goto(url, options);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 600));
    }
  }
}

async function run() {
  console.log(`\n========================================================`);
  console.log(`🚀 Starting Full UI Test Suite on ${BASE_URL}`);
  console.log(`========================================================\n`);

  const serverReady = await isServerUp();
  if (!serverReady) {
    console.error(`❌ Error: Application server at ${BASE_URL} is not reachable.`);
    process.exit(1);
  }
  console.log(`🔌 Connected to running application server at ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  async function check(desc, fn) {
    totalTests++;
    process.stdout.write(`  • [${desc}] ... `);
    try {
      await fn();
      console.log(`✅ PASS`);
      passedTests++;
    } catch (err) {
      console.log(`❌ FAIL: ${err.message}`);
      failures.push({ desc, error: err.message });
    }
    await new Promise(r => setTimeout(r, 100));
  }

  try {
    // 1. Authenticate admin context once for admin tests
    const adminContext = await browser.newContext();
    const loginPage = await adminContext.newPage();
    await gotoWithRetry(loginPage, `${BASE_URL}/admin/login`);
    await loginPage.fill('input[name="email"]', 'admin@embeddedindia.in');
    await loginPage.fill('input[name="password"]', 'AdminEmbedded@2026!');
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForURL('**/admin', { timeout: 15000 });
    const authCookies = (await adminContext.storageState()).cookies;
    await adminContext.close();
    console.log(`🔑 Admin credentials authenticated successfully.\n`);

    // 2. Iterate through all 3 screen profiles (Desktop, Tablet, Mobile)
    for (const screen of SCREEN_PROFILES) {
      console.log(`\n--------------------------------------------------------`);
      console.log(`📱 SCREEN PROFILE: ${screen.name} (${screen.width}x${screen.height})`);
      console.log(`--------------------------------------------------------`);

      const context = await browser.newContext({
        viewport: { width: screen.width, height: screen.height },
        deviceScaleFactor: 1
      });
      await context.addCookies(authCookies);
      const page = await context.newPage();

      // Listen for uncaught JS errors
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e.message));

      // Test A: No Horizontal Overflow on Public Pages
      for (const route of PUBLIC_PAGES) {
        await check(`${screen.name} - ${route} has no horizontal overflow`, async () => {
          await gotoWithRetry(page, `${BASE_URL}${route}`);
          const overflow = await page.evaluate(() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              scrollWidth: docWidth,
              winWidth: winWidth,
              hasOverflow: docWidth > winWidth + 2
            };
          });
          assert.equal(overflow.hasOverflow, false,
            `Overflow detected: scrollWidth=${overflow.scrollWidth} > winWidth=${overflow.winWidth}`);
        });
      }

      // Test B: Navigation Menu Bar Behavior (Consistent & Collapsed ONLY for Mobile)
      await check(`${screen.name} - Public navigation menu visibility and collapse behavior`, async () => {
        await gotoWithRetry(page, `${BASE_URL}/`);

        const desktopNav = page.locator('nav[aria-label="Primary Navigation"]');
        const mobileBtn = page.locator('#mobile-menu-btn');
        const mobileMenu = page.locator('#mobile-menu');

        if (screen.isMobileView) {
          // Mobile (< 768px): Collapsed
          assert.equal(await desktopNav.isVisible(), false, 'Desktop/Tablet navigation must be hidden on mobile');
          assert.equal(await mobileBtn.isVisible(), true, 'Mobile menu toggle button must be visible on mobile');

          // Test toggle open/close
          await mobileBtn.click();
          assert.equal(await mobileMenu.isVisible(), true, 'Mobile dropdown menu did not open on click');
          await page.keyboard.press('Escape');
          assert.equal(await mobileMenu.isVisible(), false, 'Mobile dropdown menu did not close on Escape');
        } else {
          // Desktop & Tablet (>= 768px): Expanded & Visible
          assert.equal(await desktopNav.isVisible(), true,
            `${screen.name} must show expanded Primary Navigation in header`);
          assert.equal(await mobileBtn.isVisible(), false,
            `${screen.name} must NOT show mobile hamburger button`);
        }
      });

      // Test C: Admin Dashboard Navigation Consistency
      await check(`${screen.name} - Admin dashboard menu consistency and collapse behavior`, async () => {
        await gotoWithRetry(page, `${BASE_URL}/admin`);

        const adminTopNav = page.locator('nav[aria-label="Admin navigation"]');
        const adminMobileNav = page.locator('nav[aria-label="Admin mobile navigation"]');

        if (screen.isMobileView) {
          // Mobile (< 768px): Collapsed to sub-nav row
          assert.equal(await adminTopNav.isVisible(), false,
            'Admin top-bar navigation must be hidden on mobile view');
          assert.equal(await adminMobileNav.isVisible(), true,
            'Admin mobile sub-nav row must be visible on mobile view');
        } else {
          // Desktop & Tablet (>= 768px): Visible in top bar
          assert.equal(await adminTopNav.isVisible(), true,
            `${screen.name} must show Admin navigation tabs in header`);
          assert.equal(await adminMobileNav.isVisible(), false,
            `${screen.name} must NOT show mobile sub-nav row`);
        }
      });

      // Test D: Search Dialog & Focus Restoration
      await check(`${screen.name} - Search modal opens, filters, and restores focus on Escape`, async () => {
        await gotoWithRetry(page, `${BASE_URL}/admin`);
        const searchBtn = page.locator('#header-search-btn');
        assert.ok(await searchBtn.isVisible(), 'Header search button is not visible');

        await searchBtn.click();
        const modal = page.locator('#header-search-modal');
        assert.ok(await modal.isVisible(), 'Header search modal did not open');

        const input = page.locator('#headerSearchInput');
        await input.fill('inquiries');
        assert.ok(await page.locator('#headerSearchResults a[href*="/admin/inquiries"]').count() >= 1,
          'Search results missing inquiry link');

        // Close search with Escape and verify focus restoration
        await page.keyboard.press('Escape');
        assert.equal(await modal.isVisible(), false, 'Search modal did not close on Escape');
        const focused = await searchBtn.evaluate(el => el === document.activeElement);
        assert.equal(focused, true, 'Focus was not restored to search trigger button');
      });

      // Test E: Theme Appearance Toggle & Palette Menu
      await check(`${screen.name} - Theme mode toggle and accent color menu`, async () => {
        await gotoWithRetry(page, `${BASE_URL}/`);

        // 1. Toggle Dark/Light Mode
        const themeToggle = page.locator('#theme-toggle');
        assert.ok(await themeToggle.isVisible(), 'Theme mode toggle is missing');

        const isDarkBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        await themeToggle.click();
        const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        assert.notEqual(isDarkBefore, isDarkAfter, 'Theme toggle did not switch dark mode class');

        // Revert toggle
        await themeToggle.click();

        // 2. Open Palette Dropdown Menu
        const paletteBtn = page.locator('#palette-dropdown-btn');
        assert.ok(await paletteBtn.isVisible(), 'Palette dropdown trigger is missing');
        await paletteBtn.click();
        const menu = page.locator('#palette-dropdown-menu');
        assert.ok(await menu.isVisible(), 'Palette dropdown menu did not open');

        // Verify palettes exist
        const paletteOptions = menu.locator('button[data-scheme]');
        assert.ok(await paletteOptions.count() >= 3, 'Missing accent palette options');

        await paletteBtn.click();
      });

      // Test F: Engineering Calculators on /tools
      await check(`${screen.name} - Engineering tools page renders calculators interactively`, async () => {
        await gotoWithRetry(page, `${BASE_URL}/tools`);
        const toolCards = page.locator('a[href^="/tools/"]');
        assert.ok(await toolCards.count() >= 6, 'Missing calculator cards on /tools');
        assert.equal(pageErrors.length, 0, `JavaScript errors on /tools: ${pageErrors.join(', ')}`);
      });

      await context.close();
    }

    console.log(`\n========================================================`);
    console.log(`📊 UI Test Results: ${passedTests}/${totalTests} Passed`);
    console.log(`========================================================\n`);

    if (failures.length > 0) {
      console.error(`💥 Failed tests:`);
      failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.desc} -> ${f.error}`));
      process.exit(1);
    } else {
      console.log(`🎉 All Desktop, Tablet, and Mobile UI tests passed with zero defects!\n`);
      process.exit(0);
    }
  } catch (fatal) {
    console.error('Fatal test error:', fatal);
    process.exit(2);
  } finally {
    await browser.close();
  }
}

run();
