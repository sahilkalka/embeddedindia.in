const { test, expect } = require('@playwright/test');

test.describe('Admin Settings Hub & Palette Engine', () => {
  test.beforeEach(async ({ page }) => {
    // Perform standard admin login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@embeddedindia.in');
    await page.fill('input[name="password"]', 'AdminEmbedded@2026!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');
  });

  test('Sidebar collapse and expand behaves as narrow strip', async ({ page }) => {
    await page.goto('/admin/settings');
    const sidebar = page.locator('#settingsLeftSidebar');
    await expect(sidebar).toBeVisible();

    // Initially expanded (w-60)
    await expect(sidebar).toHaveClass(/w-60/);

    // Click collapse button
    const collapseBtn = page.locator('#sidebarCollapseToggle');
    await collapseBtn.click();

    // Now collapsed (w-20 narrow strip)
    await expect(sidebar).toHaveClass(/w-20/);

    // Click again to expand back
    await collapseBtn.click();
    await expect(sidebar).toHaveClass(/w-60/);
  });

  test('Palette edit button expands drawer with individual color pickers and reset button', async ({ page }) => {
    await page.goto('/admin/settings');

    const drawer = page.locator('#drawer-cyber-emerald');
    // Initially hidden
    await expect(drawer).toHaveClass(/hidden/);

    // Find and click Edit button on Cyber Emerald card
    const emeraldCard = page.locator('[data-palette-card="cyber-emerald"]');
    const editBtn = emeraldCard.locator('button:has-text("Edit")');
    await editBtn.click();

    // Drawer is now open (not hidden)
    await expect(drawer).not.toHaveClass(/hidden/);

    // Verify all 5 color pickers exist
    await expect(page.locator('#picker_cyber-emerald_bgPrimary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_bgSurface')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_accentPrimary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_accentSecondary')).toBeVisible();
    await expect(page.locator('#picker_cyber-emerald_textPrimary')).toBeVisible();

    // Verify Save and Reset buttons exist
    await expect(drawer.locator('button:has-text("Save")')).toBeVisible();
    await expect(drawer.locator('button:has-text("Delete / Reset")')).toBeVisible();

    // Live theme preview window is visible and bound
    const previewBox = page.locator('#liveThemePreviewBox');
    await expect(previewBox).toBeVisible();
  });

  test('Switching sections switches views and highlights active white capsule', async ({ page }) => {
    await page.goto('/admin/settings');

    // Themes active by default
    const themesBtn = page.locator('aside button[data-settings-tab="theme-engine"]');
    await expect(themesBtn).toHaveClass(/bg-white text-slate-900/);

    // Click Site Customizer
    const customizerBtn = page.locator('aside button[data-settings-tab="site-customizer"]');
    await customizerBtn.click();

    // Customizer becomes active white capsule
    await expect(customizerBtn).toHaveClass(/bg-white text-slate-900/);
    await expect(page.locator('#site-customizer')).toBeVisible();
    await expect(page.locator('#theme-engine')).toHaveClass(/hidden/);
  });
});

