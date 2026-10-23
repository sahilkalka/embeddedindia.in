// tests/new_features.test.js
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/services/db');
const { resolveTheme } = require('../src/services/themeEngine');
const mailer = require('../src/services/mailer');

describe('Newly Added & Updated Features Test Suite', () => {
  let authCookie;

  beforeAll(async () => {
    // Authenticate through the login endpoint to receive a valid session cookie
    const loginRes = await request(app)
      .post('/admin/login')
      .send({ email: 'admin@embeddedindia.in', password: 'AdminEmbedded@2026!' });
    authCookie = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Bangalore Lab Event Toggle & Status Configuration', () => {
    test('lab_event_enabled="false" hides the header status pill and telemetry banner', async () => {
      // Upsert disabled event
      await prisma.setting.upsert({
        where: { key: 'lab_event_enabled' },
        update: { value: 'false' },
        create: { key: 'lab_event_enabled', value: 'false' }
      });
      const { clearSettingsCache } = require('../src/middleware/seo');
      clearSettingsCache();

      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).not.toContain('<!-- Live Hardware Lab Status Pill');
      expect(res.text).not.toContain('aria-label="Lab Telemetry"');
    });

    test('lab_event_enabled="true" displays configured label and target URL', async () => {
      await prisma.setting.upsert({
        where: { key: 'lab_event_enabled' },
        update: { value: 'true' },
        create: { key: 'lab_event_enabled', value: 'true' }
      });
      await prisma.setting.upsert({
        where: { key: 'lab_event_label' },
        update: { value: 'Bangalore Lab Active' },
        create: { key: 'lab_event_label', value: 'Bangalore Lab Active' }
      });
      await prisma.setting.upsert({
        where: { key: 'lab_event_url' },
        update: { value: '/about#lab' },
        create: { key: 'lab_event_url', value: '/about#lab' }
      });
      const { clearSettingsCache } = require('../src/middleware/seo');
      clearSettingsCache();

      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Bangalore Lab Active');
      expect(res.text).toContain('href="/about#lab"');
      expect(res.text).toContain('aria-label="Lab Telemetry"');
    });
  });

  describe('2. Unified Theme Palettes Engine', () => {
    const expectedPalettes = [
      'cyber-emerald',
      'quantum-cyan',
      'titanium-slate',
      'solar-amber',
      'supernova-violet',
      'clean-light'
    ];

    test('all 6 unified palettes are defined with color hexes and secondary accents', () => {
      expectedPalettes.forEach(key => {
        const theme = resolveTheme({ active_theme_palette: key });
        expect(theme).toBeDefined();
        expect(theme.palette).toBeDefined();
        expect(theme.palette.accentPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(theme.palette.accentSecondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    test('clean-light enterprise palette resolves with high-contrast light colors', () => {
      const theme = resolveTheme({ active_theme_palette: 'clean-light' });
      expect(theme.palette.accentPrimary).toBe('#2563eb');
      expect(theme.palette.bgPrimary).toBe('#f8fafc');
    });
  });

  describe('3. Customer Query & Newsletter Recipient Email Routing', () => {
    test('sendInquiryNotification routes to inquiry_recipient_emails setting', async () => {
      const testInqEmail = 'inquiry-lead@embeddedindia.in';
      await prisma.setting.upsert({
        where: { key: 'inquiry_recipient_emails' },
        update: { value: testInqEmail },
        create: { key: 'inquiry_recipient_emails', value: testInqEmail }
      });

      const res = await mailer.sendInquiryNotification({
        name: 'Alex Engineer',
        email: 'alex@client.io',
        subject: 'High-Speed PCB Consultation',
        serviceCategory: 'Hardware Design',
        message: 'Need 8-layer impedance matched board.'
      });

      expect(res.success).toBe(true);
      expect(res.accepted).toContain(testInqEmail);
    });

    test('sendNewsletterAdminNotification routes to newsletter_recipient_emails setting', async () => {
      const testNewsEmail = 'growth-team@embeddedindia.in';
      await prisma.setting.upsert({
        where: { key: 'newsletter_recipient_emails' },
        update: { value: testNewsEmail },
        create: { key: 'newsletter_recipient_emails', value: testNewsEmail }
      });

      const res = await mailer.sendNewsletterAdminNotification({
        email: 'subscriber@devicecorp.com',
        status: 'active',
        source: 'Footer Form'
      });

      expect(res.success).toBe(true);
      expect(res.accepted).toContain(testNewsEmail);
    });
  });

  describe('4. Newsletter Digest Configuration', () => {
    test('newsletter configuration options (frequency, topic, category) persist correctly', async () => {
      const config = {
        newsletter_frequency: 'weekly',
        newsletter_topic: 'RTOS & Embedded Systems Weekly',
        newsletter_category: 'firmware',
        newsletter_intro_content: 'Welcome to this week’s firmware architecture digest.'
      };

      for (const [key, value] of Object.entries(config)) {
        await prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }

      const settings = await prisma.setting.findMany({
        where: { key: { in: Object.keys(config) } }
      });
      const map = settings.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});

      expect(map.newsletter_frequency).toBe('weekly');
      expect(map.newsletter_topic).toBe('RTOS & Embedded Systems Weekly');
      expect(map.newsletter_category).toBe('firmware');
      expect(map.newsletter_intro_content).toContain('Welcome to this week’s firmware architecture digest.');
    });
  });

  describe('5. Modular Admin Settings AJAX Save Endpoint', () => {
    test('POST /admin/settings returns JSON on AJAX request with independent module', async () => {
      const res = await request(app)
        .post('/admin/settings')
        .set('Cookie', authCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          _active_tab: 'theme-engine',
          active_theme_palette: 'quantum-cyan',
          theme_bounce_intensity: 'bouncy'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Settings saved and applied live!');
      expect(res.body.activeTab).toBe('theme-engine');

      const savedPalette = await prisma.setting.findUnique({
        where: { key: 'active_theme_palette' }
      });
      expect(savedPalette.value).toBe('quantum-cyan');
    });

    test('POST /admin/settings saves modular section feature flags independently', async () => {
      const res = await request(app)
        .post('/admin/settings')
        .set('Cookie', authCookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          _active_tab: 'feature-flags',
          section_hero_enabled: 'true',
          section_sandbox_enabled: 'true',
          section_projects_enabled: 'true'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const flag = await prisma.setting.findUnique({
        where: { key: 'section_sandbox_enabled' }
      });
      expect(flag.value).toBe('true');
    });
  });

});

