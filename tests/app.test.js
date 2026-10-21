// tests/app.test.js
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/services/db');

describe('Embedded India Web Application Test Suite', () => {

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Core Public Website Pages', () => {
    test('GET / returns 200 and Embedded India branding', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Embedded System Design');
      expect(res.text).toContain('Think Big.');
      expect(res.text).toContain('Services we offer');
    });

    test('GET /services returns 200 and services list', async () => {
      const res = await request(app).get('/services');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Hardware Development &amp; Design');
      expect(res.text).toContain('Firmware &amp; BSP Development');
    });

    test('GET /about returns 200 and vision details', async () => {
      const res = await request(app).get('/about');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Engineering the Connected Future');
    });

    test('GET /projects returns 200 and portfolio items', async () => {
      const res = await request(app).get('/projects');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Bus AC Controller');
      expect(res.text).toContain('Smart Water Dispenser');
    });

    test('GET /contact returns 200 and anti-spam form', async () => {
      const res = await request(app).get('/contact');
      expect(res.status).toBe(200);
      expect(res.text).toContain('website_url_trap');
      expect(res.text).toContain('info@embeddedindia.in');
    });

    test('GET /privacy-policy returns 200', async () => {
      const res = await request(app).get('/privacy-policy');
      expect(res.status).toBe(200);
    });
  });

  describe('Engineering Calculators (/tools)', () => {
    test('GET /tools returns hub with all 8 calculators', async () => {
      const res = await request(app).get('/tools');
      expect(res.status).toBe(200);
      expect(res.text).toContain('PCB Trace Width');
      expect(res.text).toContain('555 Timer');
      expect(res.text).toContain('LED Resistor');
      expect(res.text).toContain('UART Baud');
    });

    test('GET /tools/pcb-trace returns IPC-2221 calculator', async () => {
      const res = await request(app).get('/tools/pcb-trace');
      expect(res.status).toBe(200);
      expect(res.text).toContain('IPC-2221');
    });

    test('GET /tools/555-timer returns 555 simulator', async () => {
      const res = await request(app).get('/tools/555-timer');
      expect(res.status).toBe(200);
      expect(res.text).toContain('NE555');
    });

    test('GET /tools/led-resistor returns LED resistor tool', async () => {
      const res = await request(app).get('/tools/led-resistor');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Ohm&#39;s Law');
    });

    test('GET /tools/uart-baud returns UART baud error calculator', async () => {
      const res = await request(app).get('/tools/uart-baud');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Framing Error');
    });
  });

  describe('Technical Blog Engine (/blogs)', () => {
    test('GET /blogs returns article listings', async () => {
      const res = await request(app).get('/blogs');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Bridging the Divide');
      expect(res.text).toContain('Hardware-in-the-Loop');
    });

    test('GET /blogs/:slug renders full article with code highlighting', async () => {
      const res = await request(app).get('/blogs/bridging-the-divide');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Bridging the Divide: How to Align Hardware and Firmware Teams');
      expect(res.text).toContain('language-c');
    });

    test('GET /blogs/invalid-slug returns 404', async () => {
      const res = await request(app).get('/blogs/non-existent-article-xyz');
      expect(res.status).toBe(404);
    });
  });

  describe('Automated SEO, Sitemaps & Dynamic OG Images', () => {
    test('GET /sitemap.xml returns valid XML sitemap with blog & tool URLs', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('xml');
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('/tools/pcb-trace');
      expect(res.text).toContain('/blogs/bridging-the-divide');
    });

    test('GET /robots.txt disallows /admin/ and references sitemap', async () => {
      const res = await request(app).get('/robots.txt');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Disallow: /admin/');
      expect(res.text).toContain('Sitemap:');
    });

    test('GET /api/og returns dynamic SVG social preview card', async () => {
      const res = await request(app).get('/api/og?title=Test%20Article');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/svg+xml');
      const bodyText = res.text || (Buffer.isBuffer(res.body) ? res.body.toString() : '');
      expect(bodyText).toContain('EMBEDDED');
      expect(bodyText).toContain('Test Article');
    });
  });

  describe('Contact & Newsletter Anti-Spam APIs', () => {
    test('POST /api/contact traps bot with honeypot silently', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Spam Bot',
          email: 'bot@spam.com',
          subject: 'Cheap backlinks',
          message: 'Buy now',
          website_url_trap: 'http://spam-link.com'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it was NOT saved to database
      const count = await prisma.inquiry.count({ where: { email: 'bot@spam.com' } });
      expect(count).toBe(0);
    });

    test('POST /api/contact saves valid inquiry to database', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Priya Sharma',
          email: 'priya.test@example.com',
          phone: '+91 9988776655',
          serviceCategory: 'Hardware Design',
          subject: 'Custom 4-Layer STM32 Motor Board',
          message: 'We require full-cycle hardware engineering and prototype assembly.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const saved = await prisma.inquiry.findFirst({ where: { email: 'priya.test@example.com' } });
      expect(saved).not.toBeNull();
      expect(saved.serviceCategory).toBe('Hardware Design');
    });

    test('POST /api/newsletter/subscribe initiates double opt-in subscriber', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'engineer.test@firmware.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const sub = await prisma.subscriber.findUnique({ where: { email: 'engineer.test@firmware.com' } });
      expect(sub).not.toBeNull();
      expect(sub.status).toBe('pending');
      expect(sub.verifyToken).not.toBeNull();
    });
  });

  describe('Admin Dashboard Authentication', () => {
    test('GET /admin redirects unauthenticated users to /admin/login', async () => {
      const res = await request(app).get('/admin');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/admin/login');
    });

    test('POST /admin/login rejects invalid password', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ email: 'admin@embeddedindia.in', password: 'WrongPassword' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('Invalid email or password');
    });

    test('POST /admin/login succeeds with valid credentials and sets session cookie', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ email: 'admin@embeddedindia.in', password: 'AdminEmbedded@2026!' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Ad Monetization & Root ads.txt Support', () => {
    test('GET /ads.txt returns 200 with text/plain and Google publisher format', async () => {
      const res = await request(app).get('/ads.txt');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('google.com');
      expect(res.text).toContain('DIRECT');
      expect(res.text).toContain('f08c47fec0942fa0');
    });
  });

  describe('Admin AI Model Engine & SMTP & Accounts Management', () => {
    let authCookie = '';

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/admin/login')
        .send({ email: 'admin@embeddedindia.in', password: 'AdminEmbedded@2026!' });
      authCookie = loginRes.headers['set-cookie'];
    });

    test('GET /admin/ai renders AI model configuration and blog studio', async () => {
      const res = await request(app)
        .get('/admin/ai')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('AI Model Configuration');
      expect(res.text).toContain('NVIDIA NIM');
      expect(res.text).toContain('Google Gemini');
      expect(res.text).toContain('Technical Article Topic');
    });

    test('POST /admin/ai/test performs connection verification without crashing', async () => {
      const res = await request(app)
        .post('/admin/ai/test')
        .set('Cookie', authCookie)
        .send({ provider: 'nvidia', apiKey: 'demo-key', model: 'meta/llama-3.1-70b-instruct' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.response).toContain('Connection Test Successful');
    });

    test('POST /admin/ai/generate creates technical article draft in database', async () => {
      const res = await request(app)
        .post('/admin/ai/generate')
        .set('Cookie', authCookie)
        .send({
          topic: 'Designing STM32 CAN-FD Firmware with FreeRTOS Queues',
          category: 'Guides',
          targetAudience: 'Firmware Engineers'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.id).toBeDefined();
      expect(res.body.post.title).toContain('CAN-FD');

      const savedPost = await prisma.post.findUnique({ where: { id: res.body.post.id } });
      expect(savedPost).not.toBeNull();
      expect(savedPost.status).toBe('draft');
    }, 15000);

    test('POST /admin/settings/test-smtp validates outgoing mailer test handshake', async () => {
      const res = await request(app)
        .post('/admin/settings/test-smtp')
        .set('Cookie', authCookie)
        .send({
          host: 'mock',
          port: '587',
          secure: 'false',
          user: 'mock',
          pass: 'mock',
          toEmail: 'test@embeddedindia.in'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageId).toBeDefined();
    });

    test('POST /admin/settings/validate-ad-account verifies publisher ID and updates ads.txt', async () => {
      const res = await request(app)
        .post('/admin/settings/validate-ad-account')
        .set('Cookie', authCookie)
        .send({ pubId: 'ca-pub-2644536267352236' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pubId).toBe('ca-pub-2644536267352236');
      expect(res.body.adsTxtUrl).toBe('/ads.txt');
    });

    test('POST /admin/settings/add-account validates format, uniqueness, and adds new staff user', async () => {
      const newStaffEmail = `embedded.architect.${Date.now()}@embeddedindia.in`;
      const res = await request(app)
        .post('/admin/settings/add-account')
        .set('Cookie', authCookie)
        .send({
          email: newStaffEmail,
          password: 'SecureFirmware@2026!',
          role: 'editor'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(newStaffEmail);
      expect(res.body.user.role).toBe('editor');

      const createdUser = await prisma.user.findUnique({ where: { email: newStaffEmail } });
      expect(createdUser).not.toBeNull();
      expect(createdUser.role).toBe('editor');
    });
  });

  describe('QA & Security Hardening Verification', () => {
    test('GET /login returns 301 redirecting to /admin', async () => {
      const res = await request(app).get('/login');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/admin');
    });

    test('HTTP Security Headers: x-powered-by disabled, nosniff, frameAncestors none, HSTS present', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    test('GET / contains completed copy for "More than just service" and 6 service links', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('More than just service');
      expect(res.text).toContain('Performance and Cost Optimization');
      expect(res.text).toContain("protecting your profit margins over the product's entire lifecycle.");
      expect(res.text).toContain('Accelerated Time-to-Market');
      expect(res.text).toContain('Start your new design experience with us');
      expect(res.text).toContain('/services/full-cycle-embedded-product-engineering');
      expect(res.text).toContain('/services/embedded-software-firmware-development');
      expect(res.text).toContain('/services/hardware-design-engineering');
      expect(res.text).toContain('/services/bsp-development');
      expect(res.text).toContain('/services/iot-edge-computing-solutions');
      expect(res.text).toContain('/services/automotive-embedded-systems');
    });

    test('GET /services/:slug renders all 6 detailed service pages with unique SEO titles and canonical tags', async () => {
      const slugs = [
        'full-cycle-embedded-product-engineering',
        'embedded-software-firmware-development',
        'hardware-design-engineering',
        'bsp-development',
        'iot-edge-computing-solutions',
        'automotive-embedded-systems'
      ];

      for (const slug of slugs) {
        const res = await request(app).get(`/services/${slug}`);
        expect(res.status).toBe(200);
        expect(res.text).toContain(`/services/${slug}`);
        expect(res.text).toContain('Request Service Quote');
      }
    });

    test('GET /sitemap.xml includes all 6 service routes', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.text).toContain('/services/full-cycle-embedded-product-engineering');
      expect(res.text).toContain('/services/embedded-software-firmware-development');
      expect(res.text).toContain('/services/hardware-design-engineering');
      expect(res.text).toContain('/services/bsp-development');
      expect(res.text).toContain('/services/iot-edge-computing-solutions');
      expect(res.text).toContain('/services/automotive-embedded-systems');
    });

    test('POST /api/contact sanitizes user input against XSS before database persistence', async () => {
      const xssPayload = '<script>alert("xss")</script>Embedded XSS Test';
      const testEmail = `xss.test.${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: xssPayload,
          email: testEmail,
          phone: '+91 9123456789',
          serviceCategory: 'Hardware Design',
          subject: '<img src=x onerror=alert(1)>Sanitized Subject',
          message: '<b>Hello</b> <script>alert(2)</script>Clean Message'
        });

      expect(res.status).toBe(200);
      const savedInquiry = await prisma.inquiry.findFirst({ where: { email: testEmail } });
      expect(savedInquiry).not.toBeNull();
      expect(savedInquiry.name).not.toContain('<script>');
      expect(savedInquiry.name).toContain('Embedded XSS Test');
      expect(savedInquiry.subject).not.toContain('<img');
      expect(savedInquiry.subject).toContain('Sanitized Subject');
      expect(savedInquiry.message).not.toContain('<script>');
    });
  });

});
