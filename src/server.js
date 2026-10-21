// src/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');

const { seoMiddleware } = require('./middleware/seo');
const { optionalAuth } = require('./middleware/auth');
const { initCronJobs } = require('./cron/jobs');
const prisma = require('./services/db');

// Route modules
const seoRoutes = require('./routes/seo');
const apiRoutes = require('./routes/api');
const toolsRoutes = require('./routes/tools');
const blogsRoutes = require('./routes/blogs');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Security & Optimization Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for inline SVGs, calculators, and dynamic themes
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'embeddedindia_default_session_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// Static files directory
app.use(express.static(path.join(__dirname, '../public')));

// SEO & Global View Locals Middleware
app.use(seoMiddleware);
app.use(optionalAuth);

// Mount Sitemaps, Robots & OG Image
app.use('/', seoRoutes);

// Mount API routes
app.use('/api', apiRoutes);

// Mount Interactive Calculators
app.use('/tools', toolsRoutes);

// Mount Dynamic Technical Blog
app.use('/blogs', blogsRoutes);

// Mount Admin Management Dashboard
app.use('/admin', adminRoutes);

// Core Website Pages (Replicating Embedded India design & content)

// 1. Homepage
app.get('/', async (req, res) => {
  try {
    const recentPosts = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      take: 3
    });
    res.render('pages/index', { recentPosts });
  } catch (err) {
    res.render('pages/index', { recentPosts: [] });
  }
});

// 2. Services Page
app.get('/services', (req, res) => {
  res.locals.seo.title = 'Services - Embedded India';
  res.locals.seo.description = 'Comprehensive hardware design, firmware development, BSP, IoT edge computing, and automotive embedded system services.';
  res.render('pages/services');
});

// 3. About Page
app.get('/about', (req, res) => {
  res.locals.seo.title = 'About - Embedded India';
  res.locals.seo.description = 'Engineering the connected future: Precision engineering, V&V, HIL testing, and trusted embedded partnerships across India.';
  res.render('pages/about');
});

// 4. Projects Page
app.get('/projects', (req, res) => {
  res.locals.seo.title = 'Projects - Embedded India';
  res.locals.seo.description = 'Explore our portfolio of industrial embedded systems: Bus AC Controllers, Smart Water Dispensers, and IoT gateways.';
  res.render('pages/projects');
});

// 5. Contact Page
app.get('/contact', (req, res) => {
  res.locals.seo.title = 'Contact - Embedded India';
  res.locals.seo.description = 'Get in touch with Embedded India for turnkey electronic hardware and firmware development.';
  res.render('pages/contact');
});

// 6. Privacy Policy
app.get('/privacy-policy', (req, res) => {
  res.locals.seo.title = 'Privacy Policy - Embedded India';
  res.render('pages/privacy');
});

// 7. Integra
app.get('/integra', (req, res) => {
  res.locals.seo.title = 'Integra - Embedded India';
  res.render('pages/integra');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('pages/message', {
    title: 'Page Not Found',
    heading: '404 - Page Not Found',
    message: 'The page you are looking for does not exist or has been relocated.',
    buttonText: 'Return to Home',
    buttonLink: '/'
  });
});

// 500 Handler
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT ERROR]', err);
  res.status(500).render('pages/message', {
    title: 'Server Error',
    heading: '500 - Server Error',
    message: 'Something went wrong on our end. Our engineering team has been alerted.',
    buttonText: 'Return to Home',
    buttonLink: '/'
  });
});

// Start Server & Background Cron
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n========================================================`);
    console.log(`🚀 Embedded India Web Portal is running at http://localhost:${PORT}`);
    console.log(`🔒 Admin Dashboard: http://localhost:${PORT}/admin (User: ${process.env.ADMIN_DEFAULT_EMAIL || 'admin@embeddedindia.in'})`);
    console.log(`⚡ Engineering Tools: http://localhost:${PORT}/tools`);
    console.log(`📚 Technical Blog: http://localhost:${PORT}/blogs`);
    console.log(`🗺️ Sitemap: http://localhost:${PORT}/sitemap.xml`);
    console.log(`========================================================\n`);

    initCronJobs();

    // Auto-bootstrap database seed if empty (enables 100% terminal-free cPanel deployment)
    (async () => {
      try {
        const userCount = await prisma.user.count();
        if (userCount === 0) {
          console.log('[AUTO-INIT] Empty database detected. Running automatic initial seed...');
          const seed = require('../prisma/seed');
          await seed();
        }
      } catch (seedErr) {
        console.warn('[AUTO-INIT NOTICE]', seedErr.message);
      }
    })();
  });
}

module.exports = app;
