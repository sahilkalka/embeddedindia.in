// src/middleware/seo.js
const prisma = require('../services/db');

// Cache settings in memory with a 60s TTL
let cachedSettings = null;
let lastSettingsFetch = 0;

async function getSettings() {
  const now = Date.now();
  if (!cachedSettings || now - lastSettingsFetch > 60000) {
    try {
      const records = await prisma.setting.findMany();
      cachedSettings = records.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      lastSettingsFetch = now;
    } catch (e) {
      cachedSettings = cachedSettings || {};
    }
  }
  return cachedSettings;
}

async function seoMiddleware(req, res, next) {
  const settings = await getSettings();
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const canonicalUrl = `${appUrl}${req.path}`;

  // Default SEO meta object
  res.locals.seo = {
    title: 'Embedded System Design & Development Services in India',
    siteName: settings.site_name || 'Embedded India',
    description: 'Embedded System Design & Development Services in India, from concept to production. Specializing in IoT, microcontrollers, and hardware/firmware solutions.',
    keywords: 'embedded systems india, PCB design bangalore, firmware development, IoT edge computing, microcontroller programming, hardware engineering',
    canonical: canonicalUrl,
    ogImage: `${appUrl}/api/og?title=${encodeURIComponent('Embedded System Design & Development Services in India')}`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: settings.site_name || 'Embedded India',
      url: appUrl,
      logo: `${appUrl}/assets/images/logo.png`,
      description: 'Full-Cycle Embedded Product Engineering, Hardware Design, and Firmware Solutions.',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        streetAddress: settings.contact_address || 'Bangalore, Hyderabad, Pune, India'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: settings.contact_email || 'info@embeddedindia.in',
        telephone: settings.contact_phone || '+91 98765 43210',
        contactType: 'Customer Service'
      }
    }
  };

  res.locals.settings = settings;
  res.locals.currentPath = (req.originalUrl || req.path).split('?')[0];
  res.locals.appUrl = appUrl;

  // Track lightweight page view analytics (ignoring static assets, /admin, and API)
  if (!req.path.startsWith('/admin') && !req.path.startsWith('/api') && !req.path.includes('.')) {
    prisma.analytics.create({
      data: {
        path: req.path,
        referrer: req.get('referrer') || null,
        userAgent: req.get('user-agent')?.slice(0, 200) || null
      }
    }).catch(() => {});
  }

  next();
}

function clearSettingsCache() {
  cachedSettings = null;
  lastSettingsFetch = 0;
}

module.exports = {
  seoMiddleware,
  getSettings,
  clearSettingsCache
};
