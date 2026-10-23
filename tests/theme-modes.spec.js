const { test, expect } = require('@playwright/test');

const PALETTES = [
  'cyber-emerald',
  'quantum-cyan',
  'titanium-slate',
  'solar-amber',
  'supernova-violet',
  'clean-light'
];

/**
 * Calculates WCAG 2.1 relative luminance and contrast ratio between two RGB colors
 */
function parseRgb(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  };
}

function getLuminance({ r, g, b }) {
  const sRGB = [r, g, b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function getContrastRatio(fgStr, bgStr) {
  const fg = parseRgb(fgStr);
  const bg = parseRgb(bgStr);
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test.describe('Theme & Dark/Light Mode Contrast Suite', () => {
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

  test('Public Homepage switches between Light and Dark mode without contrast clash', async ({ page }) => {
    await page.goto('/');

    // 1. Light Mode Verification
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    });

    const lightBody = await page.locator('body').evaluate(el => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, fg: cs.color };
    });
    expect(getContrastRatio(lightBody.fg, lightBody.bg)).toBeGreaterThanOrEqual(4.5);

    // 2. Dark Mode Verification
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    });

    const darkBody = await page.locator('body').evaluate(el => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, fg: cs.color };
    });
    expect(getContrastRatio(darkBody.fg, darkBody.bg)).toBeGreaterThanOrEqual(4.5);
  });

  for (const scheme of PALETTES) {
    test(`Palette [${scheme}] applies without breaking body text contrast`, async ({ page }) => {
      await page.goto('/');
      await page.evaluate((pal) => {
        document.documentElement.setAttribute('data-palette', pal);
        document.documentElement.classList.add('dark');
      }, scheme);

      const colors = await page.locator('body').evaluate(el => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, fg: cs.color };
      });
      const ratio = getContrastRatio(colors.fg, colors.bg);
      expect(
        ratio,
        `Palette ${scheme} has poor dark mode contrast ratio: ${ratio.toFixed(2)}`
      ).toBeGreaterThanOrEqual(4.0);
    });
  }

  test.describe('Admin Settings Forms Contrast (Prevent White-on-White Bug)', () => {

    test.beforeEach(async ({ page }) => {
      await page.context().addCookies(authCookies);
    });

    test('SEO & Scripts form in dark mode has high contrast on all inputs and check cards', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
      });

      // Switch to SEO tab
      await page.locator('[data-settings-tab="seo-scripts"]').click();
      await expect(page.locator('#seo-scripts')).toBeVisible();

      // Check SEO inputs (Meta Title, Description, Keywords, OG Image)
      const inputSelectors = [
        '#seo_title',
        '#seo_description',
        '#seo_keywords',
        '#seo_og_image'
      ];

      for (const sel of inputSelectors) {
        const inputStyles = await page.locator(sel).evaluate(el => {
          const cs = getComputedStyle(el);
          return { fg: cs.color, bg: cs.backgroundColor };
        });

        const ratio = getContrastRatio(inputStyles.fg, inputStyles.bg);
        const bgRgb = parseRgb(inputStyles.bg);
        const isNearWhiteBg = bgRgb.r > 240 && bgRgb.g > 240 && bgRgb.b > 240;

        expect(
          isNearWhiteBg,
          `Input ${sel} in dark mode has a white background (${inputStyles.bg}), causing contrast issues!`
        ).toBe(false);

        expect(
          ratio,
          `Input ${sel} has poor contrast ratio: ${ratio.toFixed(2)} (fg=${inputStyles.fg}, bg=${inputStyles.bg})`
        ).toBeGreaterThanOrEqual(3.0);
      }

      // Check SEO diagnostic checkpoint boxes (#chk_title, #chk_desc, etc.)
      const checkCardSelectors = ['#chk_title', '#chk_desc', '#chk_keywords', '#chk_og'];
      for (const cardSel of checkCardSelectors) {
        const cardStyles = await page.locator(cardSel).evaluate(el => {
          const cs = getComputedStyle(el);
          const label = el.querySelector('span.font-bold');
          return {
            bg: cs.backgroundColor,
            labelFg: label ? getComputedStyle(label).color : cs.color
          };
        });

        const cardRatio = getContrastRatio(cardStyles.labelFg, cardStyles.bg);
        const bgRgb = parseRgb(cardStyles.bg);
        const isNearWhite = bgRgb.r > 240 && bgRgb.g > 240 && bgRgb.b > 240;

        expect(isNearWhite, `Check card ${cardSel} has white background in dark mode!`).toBe(false);
        expect(cardRatio).toBeGreaterThanOrEqual(3.0);
      }

      // Capture visual audit screenshot
      await page.screenshot({
        path: 'test-results/audit/themes/admin-seo-dark-mode.png',
        fullPage: false
      });
    });

    test('Newsletter Configuration form in dark mode has high contrast on selects and textareas', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('color-theme', 'dark');
      });

      // Switch to Newsletter tab
      await page.locator('[data-settings-tab="newsletter-config"]').click();
      await expect(page.locator('#newsletter-config')).toBeVisible();

      const formControls = [
        'select[name="newsletter_frequency"]',
        'input[name="newsletter_topic"]',
        'select[name="newsletter_category"]',
        'textarea[name="newsletter_intro_content"]'
      ];

      for (const sel of formControls) {
        const styles = await page.locator(sel).evaluate(el => {
          const cs = getComputedStyle(el);
          return { fg: cs.color, bg: cs.backgroundColor };
        });

        const ratio = getContrastRatio(styles.fg, styles.bg);
        const bgRgb = parseRgb(styles.bg);
        const isNearWhite = bgRgb.r > 240 && bgRgb.g > 240 && bgRgb.b > 240;

        expect(
          isNearWhite,
          `Newsletter control ${sel} has white background in dark mode (${styles.bg})!`
        ).toBe(false);

        expect(
          ratio,
          `Newsletter control ${sel} has poor contrast ratio: ${ratio.toFixed(2)}`
        ).toBeGreaterThanOrEqual(3.0);
      }

      // Capture visual audit screenshot
      await page.screenshot({
        path: 'test-results/audit/themes/admin-newsletter-dark-mode.png',
        fullPage: false
      });
    });
  });
});

