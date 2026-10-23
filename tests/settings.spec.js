const { test, expect } = require('@playwright/test');

test.describe('Admin Settings Hub & Palette Engine', () => {
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

  test.beforeEach(async ({ page }) => {
    await page.context().addCookies(authCookies);
    await page.goto('/admin');
  });

  test('Taskbar navigation switches sections and marks the active module', async ({ page }) => {
    await page.goto('/admin/settings');

    const workspace = page.locator('.settings-workspace');
    await expect(workspace.locator('#settingsLeftSidebar')).toBeVisible();
    await expect(workspace.locator('.settings-content')).toBeVisible();
    await expect(page.locator('.settings-taskbar-link')).toHaveCount(0);

    const themesBtn = page.locator('aside button[data-settings-tab="theme-engine"]');
    const customizerBtn = page.locator('aside button[data-settings-tab="site-customizer"]');
    await expect(themesBtn).toHaveAttribute('aria-current', 'page');
    await expect(themesBtn.locator('.material-symbols-rounded')).toHaveText('palette');
    await customizerBtn.click();
    await expect(customizerBtn).toHaveClass(/is-active/);
    await expect(customizerBtn).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#site-customizer')).toBeVisible();
    await expect(page.locator('#theme-engine')).toHaveClass(/hidden/);
  });

  test('Global appearance menu combines theme mode and palette selection', async ({ page }) => {
    await page.locator('#admin-palette-dropdown-btn').click();
    const appearanceMenu = page.locator('#admin-palette-dropdown-menu');
    const modeToggle = appearanceMenu.locator('#theme-toggle');
    await expect(modeToggle).toBeVisible();
    await expect(appearanceMenu.locator('[data-scheme="cyber-emerald"]')).toBeVisible();

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    });
    await modeToggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect(modeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');
    await expect(modeToggle.locator('#theme-toggle-label')).toHaveText('Dark mode');
    await expect(page).toHaveURL(/admin/);

    await appearanceMenu.locator('[data-scheme="quantum-cyan"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'quantum-cyan');
    await expect(page.locator('#admin-active-scheme-dot')).toHaveCSS('background-color', 'rgb(2, 132, 199)');
  });

  test('Public navigation uses Tools and Connect with a combined appearance menu', async ({ page }) => {
    await page.goto('/');
    const primaryNav = page.getByRole('navigation', { name: 'Primary Navigation' });
    await expect(primaryNav.locator('a[href="/tools"]')).toContainText('Tools');
    await expect(primaryNav.locator('a[href="/contact"]')).toHaveText('Connect');

    await page.locator('#palette-dropdown-btn').click();
    const appearanceMenu = page.locator('#palette-dropdown-menu');
    await expect(appearanceMenu.locator('#theme-toggle')).toBeVisible();
    await expect(appearanceMenu.locator('[data-scheme="cyber-emerald"]')).toBeVisible();
    await expect(appearanceMenu.locator('[data-scheme="clean-light"]')).toBeVisible();
  });

  test('Theme preview night-mode toggle is isolated from the rest of settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.locator('[data-palette-card="quantum-cyan"]').click();
    const previewBox = page.locator('#liveThemePreviewBox');
    const toggle = page.locator('#themePreviewModeToggle');
    const workspace = page.locator('.settings-workspace');
    const workspaceBackgroundBefore = await workspace.evaluate(el => getComputedStyle(el).backgroundColor);
    const rootClassBefore = await page.locator('html').getAttribute('class');

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#previewModeLabel')).toHaveText('Day preview');
    await expect(previewBox).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(workspace).toHaveCSS('background-color', workspaceBackgroundBefore);
    await expect(page.locator('html')).toHaveAttribute('class', rootClassBefore);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(previewBox).toHaveCSS('background-color', 'rgb(8, 16, 26)');
  });

  test('Palette editor exposes separate reset and delete actions', async ({ page }) => {
    await page.goto('/admin/settings');

    const drawer = page.locator('#drawer-cyber-emerald');
    await expect(drawer).toHaveClass(/hidden/);
    const emeraldCard = page.locator('[data-palette-card="cyber-emerald"]');
    await emeraldCard.locator('button:has-text("Edit")').click();
    await expect(drawer).not.toHaveClass(/hidden/);

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    });
    await expect(page.locator('.palette-picker-panel')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(page.locator('[data-palette-card="quantum-cyan"]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(drawer).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await expect(page.locator('[data-palette-card="quantum-cyan"]')).toHaveCSS('background-color', 'rgb(19, 34, 30)');
    const themeColors = await page.evaluate(() => ({
      expectedPrimary: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim(),
      expectedSurface: getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim(),
      pickerBackground: getComputedStyle(document.querySelector('.palette-picker-panel')).backgroundColor,
      cardBackground: getComputedStyle(document.querySelector('[data-palette-card="quantum-cyan"]')).backgroundColor,
      drawerBackground: getComputedStyle(document.querySelector('#drawer-cyber-emerald')).backgroundColor
    }));
    const colorProbe = await page.evaluate(colors => {
      const probe = document.createElement('div');
      document.body.append(probe);
      probe.style.backgroundColor = colors.expectedPrimary;
      const primary = getComputedStyle(probe).backgroundColor;
      probe.style.backgroundColor = colors.expectedSurface;
      const surface = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { primary, surface };
    }, themeColors);
    expect(themeColors.pickerBackground).toBe(colorProbe.primary);
    expect(themeColors.cardBackground).toBe(colorProbe.surface);
    expect(themeColors.drawerBackground).toBe(colorProbe.surface);

    await expect(page.locator('#picker_cyber-emerald_bgPrimary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_bgSurface')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_accentPrimary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_accentSecondary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_textPrimary')).toBeVisible();
    await expect(drawer.locator('button:has-text("Save")')).toBeVisible();
    await expect(drawer.locator('button:has-text("Reset")')).toBeVisible();
    await expect(drawer.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('Authenticated homepage preview permits same-origin framing only', async ({ page, browser }) => {
    await page.goto('/admin/settings');
    const homepagePreview = page.frameLocator('#liveHomepageIframe');
    await expect(homepagePreview.locator('body')).toContainText('Embedded India');

    const previewHeaders = await page.evaluate(async () => {
      const response = await fetch('/?preview=1');
      return {
        status: response.status,
        frameOptions: response.headers.get('x-frame-options'),
        contentSecurityPolicy: response.headers.get('content-security-policy')
      };
    });
    expect(previewHeaders.status).toBe(200);
    expect(previewHeaders.frameOptions).toBe('SAMEORIGIN');
    expect(previewHeaders.contentSecurityPolicy).toContain("frame-ancestors 'self'");

    const anonymousContext = await browser.newContext();
    try {
      const origin = new URL(page.url()).origin;
      const response = await anonymousContext.request.get(`${origin}/?preview=1`);
      expect(response.status()).toBe(401);
    } finally {
      await anonymousContext.close();
    }
  });

  test('Meta Pixel rejects invalid IDs and does not report a successful save', async ({ page }) => {
    await page.goto('/admin/settings#monetization-ads');
    await page.locator('#enable_meta_pixel').selectOption('true');
    await page.locator('#meta_pixel_id').fill('not-a-pixel-id');
    await page.locator('#monetization-ads button[type="submit"]').first().click();
    await expect(page.locator('#settingsToastMsg')).toContainText('Meta Pixel ID must contain 5 to 20 digits.');
    await expect(page.locator('#settingsToast')).toHaveClass(/bg-red-600/);
  });

  test('Deleted built-in palettes can be restored from settings', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.evaluate(async () => {
      await fetch('/admin/settings/palettes/quantum-cyan/reset', { method: 'POST' });
    });
    await page.reload();

    const paletteCard = page.locator('[data-palette-card="quantum-cyan"]');
    await paletteCard.locator('button:has-text("Edit")').click();
    page.once('dialog', dialog => dialog.accept());
    await paletteCard.locator('button:has-text("Delete")').click();
    await expect(page.locator('[data-palette-card="quantum-cyan"]')).toHaveCount(0);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Restore Quantum Cyan' }).click();
    await expect(page.locator('[data-palette-card="quantum-cyan"]')).toBeVisible();
  });
});
