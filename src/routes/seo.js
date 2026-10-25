// src/routes/seo.js
const express = require('express');
const router = express.Router();
const prisma = require('../services/db');
const toolsRegistry = require('../data/toolsRegistry');

let cachedSitemap = null;
let sitemapTimestamp = 0;
const SITEMAP_TTL = 3600 * 1000; // 1 hour

// Dynamic sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  const now = Date.now();
  if (cachedSitemap && now - sitemapTimestamp < SITEMAP_TTL) {
    res.header('Content-Type', 'application/xml');
    return res.send(cachedSitemap);
  }

  try {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true }
    });

    const staticPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/services', priority: '0.9', changefreq: 'weekly' },
      { path: '/services/full-cycle-embedded-product-engineering', priority: '0.8', changefreq: 'weekly' },
      { path: '/services/embedded-software-firmware-development', priority: '0.8', changefreq: 'weekly' },
      { path: '/services/hardware-design-engineering', priority: '0.8', changefreq: 'weekly' },
      { path: '/services/bsp-development', priority: '0.8', changefreq: 'weekly' },
      { path: '/services/iot-edge-computing-solutions', priority: '0.8', changefreq: 'weekly' },
      { path: '/services/automotive-embedded-systems', priority: '0.8', changefreq: 'weekly' },
      { path: '/about', priority: '0.8', changefreq: 'monthly' },
      { path: '/projects', priority: '0.8', changefreq: 'monthly' },
      { path: '/blogs', priority: '0.9', changefreq: 'daily' },
      { path: '/contact', priority: '0.8', changefreq: 'monthly' },
      { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { path: '/tools', priority: '0.9', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/developer-formatters', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/financial-calculators', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/media-file-tools', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/generators-security', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/text-content-tools', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/unit-converters', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/seo-webmaster-tools', priority: '0.85', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/pcb-trace', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/voltage-divider', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/smd-code', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/battery-life', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/led-resistor', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/555-timer', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/uart-baud', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/trace-impedance', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/engineering-hardware/mcu-pinout', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/developer-formatters/json-formatter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/developer-formatters/base64-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/developer-formatters/regex-tester', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/developer-formatters/jwt-decoder', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/developer-formatters/sql-formatter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/financial-calculators/compound-interest-sip', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/financial-calculators/emi-loan-calculator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/financial-calculators/gst-calculator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/financial-calculators/freelance-rate-calculator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/media-file-tools/image-compressor', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/media-file-tools/image-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/media-file-tools/svg-optimizer', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/media-file-tools/pdf-tools', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/generators-security/qr-generator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/generators-security/password-generator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/generators-security/uuid-generator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/generators-security/meta-tag-generator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/text-content-tools/word-counter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/text-content-tools/case-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/text-content-tools/text-diff', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/text-content-tools/markdown-previewer', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/unit-converters/data-storage-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/unit-converters/electrical-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/unit-converters/temp-pressure-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/unit-converters/length-area-converter', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/seo-webmaster-tools/open-graph-previewer', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/seo-webmaster-tools/schema-generator', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/seo-webmaster-tools/http-status-codes', priority: '0.8', changefreq: 'weekly' },
      { path: '/tools/seo-webmaster-tools/robots-sitemap-builder', priority: '0.8', changefreq: 'weekly' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${appUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic blog posts
    for (const post of posts) {
      xml += `  <url>\n`;
      xml += `    <loc>${appUrl}/blogs/${post.slug}</loc>\n`;
      xml += `    <lastmod>${post.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    cachedSitemap = xml;
    sitemapTimestamp = now;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[SITEMAP ERROR]', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Dynamic robots.txt
router.get('/robots.txt', (req, res) => {
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const customRobots = res.locals.settings?.robots_txt_custom;
  if (customRobots && customRobots.trim()) {
    res.header('Content-Type', 'text/plain; charset=utf-8');
    return res.send(customRobots.trim() + '\n');
  }

  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

Sitemap: ${appUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(robots);
});

// Dynamic /ads.txt (IAB / Multi-Provider Ad Engine Validation)
router.get('/ads.txt', async (req, res) => {
  try {
    const customAdsTxt = res.locals.settings?.ads_txt_content;
    if (customAdsTxt && customAdsTxt.trim()) {
      res.header('Content-Type', 'text/plain; charset=utf-8');
      return res.send(customAdsTxt.trim() + '\n');
    }

    const fs = require('fs');
    const path = require('path');
    const adsTxtPath = path.join(__dirname, '../../public/ads.txt');
    if (fs.existsSync(adsTxtPath)) {
      res.header('Content-Type', 'text/plain; charset=utf-8');
      return res.send(fs.readFileSync(adsTxtPath, 'utf8'));
    }

    const setting = await prisma.setting.findUnique({ where: { key: 'adsense_pub_id' } });
    let pubId = 'pub-2644536267352236';
    if (setting && setting.value) {
      pubId = setting.value.trim().replace(/^ca-/, '');
    }
    const content = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.send(content);
  } catch (err) {
    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.send('google.com, pub-2644536267352236, DIRECT, f08c47fec0942fa0\n');
  }
});

// Dynamic OpenGraph Social Image Generator (/api/og)
router.get('/api/og', (req, res) => {
  const title = (req.query.title || 'Embedded System Design & Development').slice(0, 90);
  const category = (req.query.category || 'Embedded India | Engineering Hub').slice(0, 40);

  // High-resolution 1200x630 SVG with Dark Slate & Emerald Green branding
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0d1715"/>
        <stop offset="50%" stop-color="#182c27"/>
        <stop offset="100%" stop-color="#004d3a"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#007f5f"/>
        <stop offset="100%" stop-color="#55a630"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="20" cy="20" r="1.5" fill="#55a630" opacity="0.2"/>
        <line x1="0" y1="20" x2="40" y2="20" stroke="#007f5f" stroke-width="0.5" opacity="0.1"/>
        <line x1="20" y1="0" x2="20" y2="40" stroke="#007f5f" stroke-width="0.5" opacity="0.1"/>
      </pattern>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#grid)"/>

    <!-- Circuit Trace Accents -->
    <path d="M 60,100 L 220,100 L 260,140 L 400,140" stroke="#55a630" stroke-width="3" fill="none" opacity="0.6"/>
    <circle cx="400" cy="140" r="6" fill="#80b918"/>
    <path d="M 800,520 L 960,520 L 1000,480 L 1140,480" stroke="#007f5f" stroke-width="3" fill="none" opacity="0.6"/>
    <circle cx="800" cy="520" r="6" fill="#007f5f"/>

    <!-- Category Pill -->
    <rect x="80" y="80" width="340" height="46" rx="23" fill="#007f5f" opacity="0.9"/>
    <text x="100" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#ffffff" letter-spacing="1">${escapeXml(category.toUpperCase())}</text>

    <!-- Post Title -->
    <foreignObject x="80" y="170" width="1040" height="300">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 54px; font-weight: 800; color: #ffffff; line-height: 1.25; text-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        ${escapeXml(title)}
      </div>
    </foreignObject>

    <!-- Bottom Brand Bar -->
    <rect x="0" y="580" width="1200" height="50" fill="#13221f"/>
    <line x1="0" y1="580" x2="1200" y2="580" stroke="url(#accent)" stroke-width="4"/>

    <text x="80" y="612" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#ffffff">
      EMBEDDED <tspan fill="#55a630">INDIA</tspan>
    </text>
    <text x="320" y="610" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#94a3b8">
      Think Big. We Do! | embeddedindia.in
    </text>
    <text x="1000" y="610" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#80b918">
      ENGINEERING HUB
    </text>
  </svg>`;

  res.header('Content-Type', 'image/svg+xml');
  res.header('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

module.exports = router;
