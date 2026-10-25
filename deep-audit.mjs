import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const OUT_DIR = './deep-qa-report';
const INITIAL_ROUTES = ['/', '/services', '/projects', '/tools', '/blogs', '/about', '/contact'];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'tablet',  width: 768,  height: 1024, isMobile: true },
  { name: 'mobile',  width: 375,  height: 812, isMobile: true }
];

fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log(`\n🚀 Starting Deep Forensic Audit on ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { critical: 0, high: 0, medium: 0, low: 0, totalChecksPassed: 0 },
    findings: []
  };

  const addFinding = (severity, category, route, viewport, message, selector = '') => {
    report.summary[severity.toLowerCase()]++;
    report.findings.push({ severity, category, route, viewport, message, selector });
  };

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile
    });

    const page = await context.newPage();

    // Inject CLS observer before page scripts run
    await page.addInitScript(() => {
      window.__clsScore = 0;
      window.__clsEntries = [];
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__clsScore += entry.value;
              window.__clsEntries.push({ value: entry.value, sources: entry.sources?.map(s => s.node?.nodeName) });
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
    });

    for (const route of INITIAL_ROUTES) {
      const url = new URL(route, BASE_URL).href;
      const consoleErrors = [];
      const networkFailures = [];

      const onConsole = msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('powerPreference') && !text.includes('No available adapters')) {
            consoleErrors.push(text);
          }
        }
      };
      const onPageError = err => consoleErrors.push(`Uncaught Exception: ${err.message}`);
      const onResponse = res => {
        if (res.status() >= 400) {
          networkFailures.push(`HTTP ${res.status()} on ${res.url()}`);
        }
      };
      const onRequestFailed = req => {
        networkFailures.push(`Failed Request (${req.failure()?.errorText || 'unknown'}): ${req.url()}`);
      };

      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('response', onResponse);
      page.on('requestfailed', onRequestFailed);

      console.log(`🔍 Auditing [${vp.name.toUpperCase()}] ${route} ...`);

      try {
        const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        if (!res || res.status() >= 400) {
          addFinding('CRITICAL', 'Routing', route, vp.name, `Route returned HTTP ${res ? res.status() : 'No Response'}`);
          continue;
        }

        // Scroll smoothly through the page to trigger lazy loading, animations, and measure CLS
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 250;
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= document.body.scrollHeight) {
                clearInterval(timer);
                window.scrollTo({ top: 0, behavior: 'instant' });
                const checkZero = setInterval(() => {
                  if (window.scrollY === 0) {
                    clearInterval(checkZero);
                    setTimeout(resolve, 300);
                  }
                }, 50);
              }
            }, 60);
          });
        });

        // Wait for web fonts to settle
        await page.evaluate(() => document.fonts.ready);

        // Execute deep in-browser DOM, CSS, A11y, and Geometry inspection
        const domAudit = await page.evaluate((isMobileViewport) => {
          const issues = [];
          const highlightBoxes = [];

          const getSelector = (el) => {
            if (!el || el.nodeType !== 1) return '';
            if (el.id) return `#${el.id}`;
            let sel = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
              const classes = el.className.trim().split(/\s+/).slice(0, 2).join('.');
              if (classes) sel += `.${classes}`;
            }
            return sel;
          };

          const isVisible = (el) => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0 || style.pointerEvents === 'none') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          // Helper: Parse rgb/rgba string into [r, g, b, a]
          const parseColor = (str) => {
            const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (!m) return [0, 0, 0, 0];
            return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
          };

          // Helper: Blend foreground RGBA over background RGB
          const blend = (fg, bg) => {
            const a = fg[3];
            return [
              Math.round(fg[0] * a + bg[0] * (1 - a)),
              Math.round(fg[1] * a + bg[1] * (1 - a)),
              Math.round(fg[2] * a + bg[2] * (1 - a)),
              1
            ];
          };

          // Helper: Resolve effective background color by walking up ancestors
          const getEffectiveBg = (el) => {
            let current = el;
            const layers = [];
            while (current && current.nodeType === 1) {
              const bg = parseColor(window.getComputedStyle(current).backgroundColor);
              if (bg[3] > 0) layers.push(bg);
              if (bg[3] === 1) break;
              current = current.parentElement;
            }
            let base = [255, 255, 255, 1]; // Default browser canvas
            for (let i = layers.length - 1; i >= 0; i--) {
              base = blend(layers[i], base);
            }
            return base;
          };

          const getLuminance = ([r, g, b]) => {
            const a = [r, g, b].map(v => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
          };

          const getContrast = (c1, c2) => {
            const l1 = getLuminance(c1);
            const l2 = getLuminance(c2);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          };

          // 1. Page-level Horizontal Overflow
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
            issues.push({
              severity: 'HIGH',
              category: 'Layout',
              message: `Document horizontal scrollbar detected (${document.documentElement.scrollWidth}px > ${document.documentElement.clientWidth}px)`,
              selector: 'html'
            });
          }

          // 2. Duplicate IDs (Breaks ARIA & JS selectors)
          const idMap = new Map();
          document.querySelectorAll('[id]').forEach(el => {
            if (!el.id) return;
            idMap.set(el.id, (idMap.get(el.id) || 0) + 1);
          });
          for (const [id, count] of idMap.entries()) {
            if (count > 1) {
              issues.push({
                severity: 'HIGH',
                category: 'DOM Integrity',
                message: `Duplicate ID "#${id}" found ${count} times on page`,
                selector: `#${id}`
              });
            }
          }

          // 3. Heading Hierarchy Check
          const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(isVisible);
          const h1Count = headings.filter(h => h.tagName === 'H1').length;
          if (h1Count === 0) {
            issues.push({ severity: 'MEDIUM', category: 'SEO & A11y', message: 'Page is missing a visible <h1> heading', selector: 'body' });
          } else if (h1Count > 1) {
            issues.push({ severity: 'LOW', category: 'SEO & A11y', message: `Multiple visible <h1> headings found (${h1Count})`, selector: 'h1' });
          }
          for (let i = 1; i < headings.length; i++) {
            const prev = parseInt(headings[i - 1].tagName[1]);
            const curr = parseInt(headings[i].tagName[1]);
            if (curr - prev > 1) {
              issues.push({
                severity: 'LOW',
                category: 'SEO & A11y',
                message: `Skipped heading level: <h${prev}> jumped directly to <h${curr}> ("${headings[i].innerText.slice(0, 30).trim()}")`,
                selector: getSelector(headings[i])
              });
            }
          }

          // 4. Template Leakage & Undefined Values in Visible Text
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const leakPatterns = [/\bundefined\b/, /\bNaN\b/, /\[object Object\]/, /<%=/, /\{\{.*?\}\}/];
          let node;
          while ((node = walker.nextNode())) {
            const parent = node.parentElement;
            if (!parent || ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT'].includes(parent.tagName)) continue;
            if (!isVisible(parent)) continue;
            const txt = node.nodeValue.trim();
            for (const pat of leakPatterns) {
              if (pat.test(txt)) {
                issues.push({
                  severity: 'HIGH',
                  category: 'Content Leak',
                  message: `Suspicious raw token matched ${pat} in visible text: "${txt.slice(0, 50)}"`,
                  selector: getSelector(parent)
                });
              }
            }
          }

          // 5. Inspect All Visible Elements (Contrast, Clipping, Overflow)
          const allElements = document.querySelectorAll('body *');
          allElements.forEach(el => {
            if (!isVisible(el)) return;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            // 5a. Off-screen bleed (element extending past right viewport edge)
            if (rect.right > window.innerWidth + 2 && style.position !== 'fixed') {
              // Check if an ancestor hides the overflow
              let clippedByAncestor = false;
              let p = el.parentElement;
              while (p && p !== document.body) {
                const ps = window.getComputedStyle(p);
                if (['hidden', 'clip', 'scroll', 'auto'].includes(ps.overflowX)) {
                  clippedByAncestor = true;
                  break;
                }
                p = p.parentElement;
              }
              if (!clippedByAncestor) {
                issues.push({
                  severity: 'MEDIUM',
                  category: 'Visual Bleed',
                  message: `Element bleeds ${Math.round(rect.right - window.innerWidth)}px past right viewport edge`,
                  selector: getSelector(el)
                });
                highlightBoxes.push({ el, color: 'orange' });
              }
            }

            // 5b. Accidental Silent Text Clipping
            const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.nodeValue.trim().length > 0);
            const isSrOnly = el.classList?.contains("sr-only") || el.closest(".sr-only") || (Math.round(rect.width) <= 1 && Math.round(rect.height) <= 1);
            if (hasDirectText && !isSrOnly) {
              if ((style.overflowX === 'hidden' || style.overflowX === 'clip') && style.textOverflow !== 'ellipsis') {
                if (el.scrollWidth > el.clientWidth + 4) {
                  issues.push({
                    severity: 'MEDIUM',
                    category: 'Text Clipping',
                    message: `Horizontal text truncation without ellipsis (${el.scrollWidth}px content in ${el.clientWidth}px box): "${el.innerText.slice(0, 30).trim()}"`,
                    selector: getSelector(el)
                  });
                  highlightBoxes.push({ el, color: 'red' });
                }
              }

              // 5c. WCAG Color Contrast Verification
              // Skip elements with background images or gradient text fills
              if (style.backgroundImage === 'none' && style.webkitBackgroundClip !== 'text' && !isSrOnly) {
                const bg = getEffectiveBg(el);
                const fgRaw = parseColor(style.color);
                const fg = blend(fgRaw, bg);
                const ratio = getContrast(fg, bg);
                const fontSize = parseFloat(style.fontSize);
                const isBold = parseInt(style.fontWeight) >= 700 || style.fontWeight === 'bold';
                const isLarge = fontSize >= 24 || (fontSize >= 18.66 && isBold);
                const minRatio = isLarge ? 3.0 : 4.5;

                if (ratio < minRatio) {
                  issues.push({
                    severity: 'MEDIUM',
                    category: 'WCAG Contrast',
                    message: `Low contrast ratio ${ratio.toFixed(2)}:1 (needs ${minRatio}:1) on text "${el.innerText.slice(0, 25).trim()}"`,
                    selector: getSelector(el)
                  });
                  highlightBoxes.push({ el, color: 'magenta' });
                }
              }
            }
          });

          // 6. Interactive Elements: Hit-Testing, Touch Targets, A11y Labels
          const interactives = document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]');
          interactives.forEach(el => {
            if (!isVisible(el)) return;
            const rect = el.getBoundingClientRect();

            // 6a. Touch Target / Click Area Size
            const minSize = isMobileViewport ? 40 : 24;
            if (rect.width < minSize && rect.height < minSize) {
              issues.push({
                severity: 'LOW',
                category: 'Tap Target',
                message: `Interactive element smaller than ${minSize}x${minSize}px (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
                selector: getSelector(el)
              });
            }

            // 6b. Center-Point Z-Index Occlusion Test
            if (rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth) {
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const topEl = document.elementFromPoint(cx, cy);
              if (topEl && !el.contains(topEl) && !topEl.contains(el) && window.getComputedStyle(topEl).pointerEvents !== 'none') {
                // Ignore if covered by sticky nav when scrolled, but we are at scrollTop=0
                issues.push({
                  severity: 'HIGH',
                  category: 'Click Occlusion',
                  message: `Interactive element center (${Math.round(cx)},${Math.round(cy)}) is covered by ${getSelector(topEl)}`,
                  selector: getSelector(el)
                });
                highlightBoxes.push({ el, color: 'red' });
              }
            }

            // 6c. Form Control Labeling
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
              const hasIdLabel = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
              const hasParentLabel = el.closest('label');
              const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
              if (!hasIdLabel && !hasParentLabel && !hasAria) {
                issues.push({
                  severity: 'MEDIUM',
                  category: 'Accessibility',
                  message: `Form input missing associated <label> or aria-label (placeholder="${el.getAttribute('placeholder') || ''}")`,
                  selector: getSelector(el)
                });
              }
            }

            // 6d. External Tabnabbing Security Check
            if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
              const rel = (el.getAttribute('rel') || '').toLowerCase();
              if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
                issues.push({
                  severity: 'LOW',
                  category: 'Security',
                  message: `External target="_blank" link missing rel="noopener noreferrer" (${el.getAttribute('href')})`,
                  selector: getSelector(el)
                });
              }
            }
          });

          // 7. Image Quality & Aspect Ratio Distortion Check
          document.querySelectorAll('img').forEach(img => {
            if (!isVisible(img)) return;
            if (!img.complete || img.naturalWidth === 0) {
              issues.push({
                severity: 'HIGH',
                category: 'Broken Asset',
                message: `Broken or unrendered image: ${img.currentSrc || img.src}`,
                selector: getSelector(img)
              });
            } else {
              const style = window.getComputedStyle(img);
              if (style.objectFit === 'fill' || !style.objectFit) {
                const naturalRatio = img.naturalWidth / img.naturalHeight;
                const renderedRatio = img.clientWidth / img.clientHeight;
                if (Math.abs(naturalRatio - renderedRatio) > 0.15 && img.clientHeight > 20) {
                  issues.push({
                    severity: 'MEDIUM',
                    category: 'Image Distortion',
                    message: `Image aspect ratio stretched (natural ${naturalRatio.toFixed(2)} vs rendered ${renderedRatio.toFixed(2)})`,
                    selector: getSelector(img)
                  });
                }
              }
            }
          });

          // 8. SVG Icon Zero-Dimension Check
          document.querySelectorAll('svg').forEach(svg => {
            const style = window.getComputedStyle(svg);
            if (style.display !== 'none' && style.visibility !== 'hidden' && svg.parentElement && isVisible(svg.parentElement)) {
              const rect = svg.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) {
                issues.push({
                  severity: 'MEDIUM',
                  category: 'Broken Icon',
                  message: `Visible parent contains 0x0px SVG icon`,
                  selector: getSelector(svg.parentElement)
                });
              }
            }
          });

          // 9. Performance & CLS Metrics
          const navEntry = performance.getEntriesByType('navigation')[0];
          const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
          const cls = window.__clsScore || 0;
          const domNodes = document.querySelectorAll('*').length;

          if (cls > 0.1) {
            issues.push({
              severity: cls > 0.25 ? 'HIGH' : 'MEDIUM',
              category: 'Performance (CLS)',
              message: `Cumulative Layout Shift (CLS) score is ${cls.toFixed(3)} (threshold <= 0.1)`,
              selector: 'body'
            });
          }
          if (domNodes > 1500) {
            issues.push({
              severity: 'LOW',
              category: 'Performance (DOM)',
              message: `Large DOM size detected (${domNodes} elements; recommended < 1500)`,
              selector: 'body'
            });
          }

          // Draw visual debug outlines before screenshot if issues were found on elements
          highlightBoxes.forEach(({ el, color }) => {
            el.style.outline = `3px solid ${color}`;
            el.style.outlineOffset = '2px';
          });

          return {
            issues,
            metrics: {
              ttfb: navEntry ? Math.round(navEntry.responseStart) : 0,
              fcp: fcpEntry ? Math.round(fcpEntry.startTime) : 0,
              cls: Number(cls.toFixed(4)),
              domNodes
            }
          };
        }, vp.isMobile);

        // Record Console & Network errors
        consoleErrors.forEach(err => addFinding('HIGH', 'Console/Runtime', route, vp.name, err));
        networkFailures.forEach(net => addFinding('HIGH', 'Network', route, vp.name, net));

        // Deduplicate identical messages per route/viewport
        const seen = new Set();
        for (const issue of domAudit.issues) {
          const key = `${issue.category}:${issue.message}:${issue.selector}`;
          if (!seen.has(key)) {
            seen.add(key);
            addFinding(issue.severity, issue.category, route, vp.name, issue.message, issue.selector);
          }
        }

        if (domAudit.issues.length === 0 && consoleErrors.length === 0 && networkFailures.length === 0) {
          report.summary.totalChecksPassed++;
        }

        // Save annotated screenshot
        const safeRoute = route === '/' ? 'home' : route.replace(/\//g, '_');
        await page.screenshot({
          path: path.join(OUT_DIR, `${vp.name}${safeRoute}.png`),
          fullPage: true
        });

      } catch (err) {
        addFinding('CRITICAL', 'Audit Execution', route, vp.name, err.message);
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
        page.off('response', onResponse);
        page.off('requestfailed', onRequestFailed);
      }
    }

    await context.close();
  }

  await browser.close();

  // Write JSON and Markdown Reports
  fs.writeFileSync(path.join(OUT_DIR, 'audit-report.json'), JSON.stringify(report, null, 2));

  console.log('\n============================================================');
  console.log('📊 DEEP FORENSIC QA SUMMARY');
  console.log('============================================================');
  console.log(`🔴 CRITICAL : ${report.summary.critical}`);
  console.log(`🟠 HIGH     : ${report.summary.high}`);
  console.log(`🟡 MEDIUM   : ${report.summary.medium}`);
  console.log(`🔵 LOW      : ${report.summary.low}`);
  console.log('------------------------------------------------------------');

  if (report.findings.length === 0) {
    console.log('✅ Zero visual, accessibility, contrast, or runtime issues found!');
  } else {
    // Group by category for clean terminal output
    const grouped = report.findings.reduce((acc, f) => {
      acc[f.category] = acc[f.category] || [];
      acc[f.category].push(f);
      return acc;
    }, {});

    for (const [category, items] of Object.entries(grouped)) {
      console.log(`\n### ${category} (${items.length})`);
      items.slice(0, 12).forEach(f => {
        console.log(`  [${f.severity}] [${f.viewport.toUpperCase()} ${f.route}] ${f.message} ${f.selector ? `(${f.selector})` : ''}`);
      });
      if (items.length > 12) {
        console.log(`  ... and ${items.length - 12} more in ${category} (see ${OUT_DIR}/audit-report.json)`);
      }
    }
  }
  console.log(`\n📁 Annotated screenshots & full JSON report saved to: ${OUT_DIR}/`);
})();