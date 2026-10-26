// src/middleware/seo.js
const { parseFaqs } = require('../services/faqs');
const { canShowAd } = require('../services/ads');
const prisma = require('../services/db');
const { resolveTheme } = require('../services/themeEngine');

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
  const currentPath = (req.originalUrl || req.path).split('?')[0];

  // Resolve dynamic theme CSS variables & palette
  const isAdminRoute = currentPath.startsWith('/admin');
  const themeSettings = isAdminRoute
    ? { ...settings, active_theme_palette: settings.active_theme_palette || 'titanium-slate' }
    : settings;
  const theme = resolveTheme(themeSettings);

  // Default SEO meta object
  const defaultTitle = settings.site_title_default || 'Embedded System Design & Development Services in India';
  const siteName = settings.site_name || 'Embedded India';
  const siteDescription = settings.site_description_default || 'Embedded System Design & Development Services in India, from concept to production. Specializing in IoT, microcontrollers, and hardware/firmware solutions.';
  const defaultKeywords = settings.site_keywords_default || 'embedded systems india, PCB design hyderabad, firmware development, IoT edge computing, microcontroller programming, hardware engineering';

  res.locals.seo = {
    robots: isAdminRoute ? 'noindex, nofollow' : 'index, follow',
    title: defaultTitle,
    siteName: siteName,
    description: siteDescription,
    keywords: defaultKeywords,
    canonical: canonicalUrl,
    ogImage: `${appUrl}/api/og?title=${encodeURIComponent(defaultTitle)}`,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteName,
      url: appUrl,
      logo: `${appUrl}/assets/images/logo.png`,
      description: 'Full-Cycle Embedded Product Engineering, Hardware Design, and Firmware Solutions.',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        streetAddress: settings.contact_address || 'Hyderabad, India'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: settings.contact_email || 'info@embeddedindia.in',
        telephone: settings.contact_phone || '+91 83285 14090',
        contactType: 'Customer Service'
      }
    }
  };

  // Route-Specific SEO Overrides from Admin JSON configuration
  if (settings.seo_route_overrides) {
    try {
      const overrides = JSON.parse(settings.seo_route_overrides);
      if (overrides[currentPath]) {
        const routeMeta = overrides[currentPath];
        if (routeMeta.robots) res.locals.seo.robots = routeMeta.robots;
        if (routeMeta.title) res.locals.seo.title = routeMeta.title;
        if (routeMeta.description) res.locals.seo.description = routeMeta.description;
        if (routeMeta.keywords) res.locals.seo.keywords = routeMeta.keywords;
        if (routeMeta.ogImage) res.locals.seo.ogImage = routeMeta.ogImage;
        if (routeMeta.canonical) res.locals.seo.canonical = routeMeta.canonical;
        if (routeMeta.structuredData) res.locals.seo.structuredData = routeMeta.structuredData;
      }
    } catch (e) {
      // Ignore JSON parse errors in overrides
    }
  }

  try { res.locals.customFaqs = parseFaqs(settings.custom_faqs); } catch { res.locals.customFaqs = []; }
  res.locals.colorThemes = require('../data/colorThemes');
  res.locals.canShowAd = canShowAd;
  res.locals.settings = settings;
  res.locals.theme = theme;
  res.locals.currentPath = currentPath;
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
