// src/routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const router = express.Router();
const prisma = require('../services/db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { clearSettingsCache } = require('../middleware/seo');
const { publishScheduledPosts, sendWeeklyNewsletterDigest } = require('../cron/jobs');
const aiGenerator = require('../services/aiGenerator');
const aiScheduler = require('../services/aiScheduler');
const { renderMarkdown } = require('../services/markdown');
const mailer = require('../services/mailer');

// GET /admin/login - Login Page
router.get('/login', (req, res) => {
  if (req.cookies.admin_token) {
    try {
      jwt.verify(req.cookies.admin_token, JWT_SECRET);
      return res.redirect('/admin');
    } catch (e) {}
  }
  res.render('admin/login', { error: null });
});

// POST /admin/login - Authenticate Admin
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('admin/login', { error: 'Please enter your email and password.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { username: email.trim() }
        ]
      }
    });

    if (!user) {
      return res.render('admin/login', { error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.render('admin/login', { error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect(req.query.redirect || '/admin');
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.render('admin/login', { error: 'An unexpected authentication error occurred.' });
  }
});

// GET /admin/logout
router.get('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/admin/login');
});

// ALL SUBSEQUENT ROUTES REQUIRE AUTHENTICATION
router.use(requireAuth);

// GET /admin - Dashboard Overview
router.get('/', async (req, res) => {
  try {
    const [
      totalPosts,
      totalInquiries,
      newInquiries,
      totalSubscribers,
      activeSubscribers,
      pageViews,
      topPosts,
      calculatorStats
    ] = await Promise.all([
      prisma.post.count(),
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: 'new' } }),
      prisma.subscriber.count(),
      prisma.subscriber.count({ where: { status: 'active' } }),
      prisma.analytics.count(),
      prisma.post.findMany({
        orderBy: { views: 'desc' },
        take: 5
      }),
      prisma.calculatorStat.findMany({
        orderBy: { executionCount: 'desc' },
        take: 6
      })
    ]);

    res.render('admin/dashboard', {
      totalPosts,
      totalInquiries,
      newInquiries,
      totalSubscribers,
      activeSubscribers,
      pageViews,
      topPosts,
      calculatorStats
    });
  } catch (err) {
    console.error('[ADMIN DASHBOARD ERROR]', err);
    res.status(500).send('Error loading dashboard metrics');
  }
});

// GET /admin/inquiries - List and Filter Inquiries
router.get('/inquiries', async (req, res) => {
  try {
    const status = req.query.status || undefined;
    const where = status ? { status } : {};

    const inquiries = await prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.render('admin/inquiries', { inquiries, selectedStatus: status });
  } catch (err) {
    res.status(500).send('Error loading inquiries');
  }
});

// POST /admin/inquiries/:id/status - Update Inquiry Status
router.post('/inquiries/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.redirect('/admin/inquiries');
  } catch (err) {
    res.status(500).send('Failed to update status');
  }
});

// POST /admin/inquiries/:id/delete
router.post('/inquiries/:id/delete', async (req, res) => {
  try {
    await prisma.inquiry.delete({ where: { id: req.params.id } });
    res.redirect('/admin/inquiries');
  } catch (err) {
    res.status(500).send('Failed to delete inquiry');
  }
});

// GET /admin/subscribers - Subscriber List & CSV Export
router.get('/subscribers', async (req, res) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.render('admin/subscribers', { subscribers, message: null });
  } catch (err) {
    res.status(500).send('Error loading subscribers');
  }
});

// GET /admin/subscribers/export - Download CSV
router.get('/subscribers/export', async (req, res) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { status: 'active' },
      select: { email: true, createdAt: true, source: true }
    });

    let csv = 'Email,Date Subscribed,Source\n';
    subscribers.forEach(s => {
      csv += `"${s.email}","${s.createdAt.toISOString()}","${s.source}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`embeddedindia-subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).send('Failed to export CSV');
  }
});

// GET /admin/posts - CMS Post Management
router.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.render('admin/posts/index', { posts });
  } catch (err) {
    res.status(500).send('Error loading posts');
  }
});

// GET /admin/posts/new - Create Post
router.get('/posts/new', (req, res) => {
  res.render('admin/posts/edit', {
    post: null,
    categories: ['Embedded Electronics', 'Guides', 'Troubleshooting', 'Industry Info']
  });
});

// POST /admin/posts/new - Save Post
router.post('/posts/new', async (req, res) => {
  try {
    const { title, category, tags, summary, contentMarkdown, status, scheduledAt, readingTime } = req.body;
    const cleanTitle = (title || 'Untitled Technical Guide').trim();
    const slug = slugify(cleanTitle, { lower: true, strict: true }) || 'post-' + Date.now();

    const validScheduledAt = scheduledAt && !isNaN(Date.parse(scheduledAt)) ? new Date(scheduledAt) : null;
    const contentHtml = renderMarkdown(contentMarkdown || '');

    await prisma.post.create({
      data: {
        title: cleanTitle,
        slug,
        category: category || 'Embedded Electronics',
        tags: tags || 'embedded',
        summary: summary || '',
        contentMarkdown: contentMarkdown || '',
        contentHtml,
        status: status || 'published',
        readingTime: parseInt(readingTime) || 4,
        scheduledAt: validScheduledAt,
        publishedAt: status === 'published' ? new Date() : (validScheduledAt ? null : null)
      }
    });

    res.redirect('/admin/posts');
  } catch (err) {
    console.error('[CREATE POST ERROR]', err);
    res.status(500).send('Error creating post: ' + err.message);
  }
});

// GET /admin/posts/:id/edit - Edit Post
router.get('/posts/:id/edit', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    });
    if (!post) {
      return res.redirect('/admin/posts?error=Post+not+found');
    }

    res.render('admin/posts/edit', {
      post,
      categories: ['Embedded Electronics', 'Guides', 'Troubleshooting', 'Industry Info']
    });
  } catch (err) {
    console.error('[FETCH POST ERROR]', err);
    res.redirect('/admin/posts');
  }
});

// POST /admin/posts/:id/edit - Update Post
router.post('/posts/:id/edit', async (req, res) => {
  try {
    const { title, slug, category, tags, summary, contentMarkdown, status, scheduledAt, readingTime } = req.body;
    const cleanTitle = (title || 'Untitled Technical Guide').trim();

    let targetSlug = slugify(slug || cleanTitle, { lower: true, strict: true }) || `post-${Date.now().toString().slice(-4)}`;
    const existing = await prisma.post.findFirst({
      where: { slug: targetSlug, NOT: { id: req.params.id } }
    });
    if (existing) {
      targetSlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
    }

    const validScheduledAt = scheduledAt && !isNaN(Date.parse(scheduledAt)) ? new Date(scheduledAt) : null;
    const contentHtml = renderMarkdown(contentMarkdown || '');

    // Check if post exists; if not found, upsert/auto-create it to safeguard author's writing
    const postExists = await prisma.post.findUnique({
      where: { id: req.params.id }
    });

    if (!postExists) {
      console.warn(`[UPDATE POST] Post ${req.params.id} not found in DB; auto-creating to preserve submitted content.`);
      await prisma.post.create({
        data: {
          id: req.params.id,
          title: cleanTitle,
          slug: targetSlug,
          category: category || 'Embedded Electronics',
          tags: tags || 'embedded',
          summary: summary || '',
          contentMarkdown: contentMarkdown || '',
          contentHtml,
          status: status || 'draft',
          readingTime: parseInt(readingTime) || 4,
          scheduledAt: validScheduledAt,
          publishedAt: status === 'published' ? new Date() : null
        }
      });
      return res.redirect('/admin/posts');
    }

    await prisma.post.update({
      where: { id: req.params.id },
      data: {
        title: cleanTitle,
        slug: targetSlug,
        category: category || postExists.category,
        tags: tags || postExists.tags,
        summary: summary !== undefined ? summary : postExists.summary,
        contentMarkdown: contentMarkdown !== undefined ? contentMarkdown : postExists.contentMarkdown,
        contentHtml,
        status: status || postExists.status,
        readingTime: parseInt(readingTime) || postExists.readingTime || 4,
        scheduledAt: validScheduledAt,
        publishedAt: status === 'published' ? (postExists.publishedAt || new Date()) : postExists.publishedAt
      }
    });

    res.redirect('/admin/posts');
  } catch (err) {
    console.error('[UPDATE POST ERROR]', err);
    res.status(500).send('Error updating post: ' + err.message);
  }
});

// POST /admin/posts/:id/delete
router.post('/posts/:id/delete', async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    res.redirect('/admin/posts');
  } catch (err) {
    res.status(500).send('Error deleting post');
  }
});

// GET /admin/settings - Manage Site Settings
router.get('/settings', async (req, res) => {
  try {
    const [settings, users] = await Promise.all([
      prisma.setting.findMany(),
      prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.render('admin/settings', {
      settings: settingsMap,
      users: users || [],
      currentUser: req.user,
      success: req.query.saved === '1'
    });
  } catch (err) {
    res.status(500).send('Error fetching settings');
  }
});

// POST /admin/settings - Update Site Settings
router.post('/settings', async (req, res) => {
  try {
    const fields = req.body;
    for (const key of Object.keys(fields)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: fields[key] },
        create: { key, value: fields[key] }
      });
    }
    clearSettingsCache();
    res.redirect('/admin/settings?saved=1');
  } catch (err) {
    res.status(500).send('Error saving settings');
  }
});

// POST /admin/settings/test-smtp - Test live outgoing SMTP connection
const handleTestSmtp = async (req, res) => {
  try {
    const result = await mailer.testSmtpConnection(req.body);
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/settings/test-smtp', handleTestSmtp);
router.post('/test-smtp', handleTestSmtp);

// POST /admin/settings/validate-ad - Validate Google AdSense Ad Account & sync ads.txt
const handleValidateAd = async (req, res) => {
  try {
    const { pubId } = req.body;
    if (!pubId || !pubId.trim()) {
      return res.json({ success: false, error: 'Please enter a Google AdSense Publisher ID (e.g. ca-pub-2644536267352236).' });
    }
    const cleanPub = pubId.trim();
    const isValid = /^(ca-)?pub-\d{16}$/i.test(cleanPub);
    if (!isValid) {
      return res.json({
        success: false,
        error: 'Invalid AdSense ID format. Expected "ca-pub-XXXXXXXXXXXXXXXX" or "pub-XXXXXXXXXXXXXXXX" (16 digits).'
      });
    }

    const formattedPub = cleanPub.toLowerCase().startsWith('ca-') ? cleanPub : `ca-${cleanPub}`;
    const purePub = cleanPub.replace(/^ca-/i, '');

    // Persist to database settings
    await prisma.setting.upsert({
      where: { key: 'adsense_pub_id' },
      update: { value: formattedPub },
      create: { key: 'adsense_pub_id', value: formattedPub }
    });
    await prisma.setting.upsert({
      where: { key: 'enable_adsense' },
      update: { value: 'true' },
      create: { key: 'enable_adsense', value: 'true' }
    });

    // Write public/ads.txt
    const fs = require('fs');
    const path = require('path');
    const adsTxtPath = path.join(__dirname, '../../public/ads.txt');
    const adsTxtContent = `google.com, ${purePub}, DIRECT, f08c47fec0942fa0\n`;
    fs.writeFileSync(adsTxtPath, adsTxtContent, 'utf8');

    clearSettingsCache();

    res.json({
      success: true,
      pubId: formattedPub,
      purePub,
      adsTxtUrl: '/ads.txt',
      adsTxtLine: adsTxtContent.trim(),
      message: 'AdSense publisher account validated successfully and ads.txt generated.'
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/settings/validate-ad', handleValidateAd);
router.post('/settings/validate-ad-account', handleValidateAd);
router.post('/validate-ad-account', handleValidateAd);

// POST /admin/settings/add-account - Add & Validate New Staff Account
const handleAddAccount = async (req, res) => {
  try {
    const { email, username, password, role } = req.body;
    if (!email || !email.trim()) {
      return res.json({ success: false, error: 'Email address is required.' });
    }
    const emailClean = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return res.json({ success: false, error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const usernameClean = (username || emailClean.split('@')[0]).trim();

    // Check for duplicate account
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailClean },
          { username: usernameClean }
        ]
      }
    });

    if (existingUser) {
      return res.json({ success: false, error: `An account with email "${emailClean}" or username "${usernameClean}" already exists.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: emailClean,
        username: usernameClean,
        passwordHash,
        role: role === 'admin' ? 'admin' : 'editor'
      }
    });

    res.json({
      success: true,
      message: `Account for ${newUser.email} (${newUser.role}) successfully validated and created!`,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/settings/add-account', handleAddAccount);
router.post('/add-account', handleAddAccount);

// POST /admin/settings/delete-account - Remove Staff Account
router.post('/settings/delete-account', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, error: 'Account ID required.' });

    const currentUserId = req.user?.id || req.user?.userId;
    if (currentUserId && currentUserId === id) {
      return res.json({ success: false, error: 'Cannot delete your own active session account.' });
    }

    const total = await prisma.user.count();
    if (total <= 1) {
      return res.json({ success: false, error: 'Cannot remove the last remaining administrator account.' });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: 'Account successfully removed.' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /admin/settings/change-password - Update logged-in admin password
const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.json({ success: false, error: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.json({ success: false, error: 'Authentication required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.json({ success: false, error: 'User account not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.json({ success: false, error: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/settings/change-password', handleChangePassword);
router.post('/change-password', handleChangePassword);

// GET /admin/ai - AI Content Generator & Model Setup Page
router.get('/ai', async (req, res) => {
  try {
    const [settings, schedulerSettings, totalPosts] = await Promise.all([
      prisma.setting.findMany(),
      aiScheduler.getSchedulerSettings(),
      prisma.post.count()
    ]);

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.render('admin/ai', { 
      settings: settingsMap, 
      schedulerSettings,
      totalPosts,
      saved: req.query.saved === '1' 
    });
  } catch (err) {
    console.error('[LOAD AI SETTINGS ERROR]', err);
    res.status(500).send('Error loading AI settings');
  }
});

// POST /admin/ai - Save AI Configuration & Automated Scheduler Settings
router.post('/ai', async (req, res) => {
  try {
    const fields = { ...req.body };
    // Handle checkbox state for ai_auto_gen_enabled
    fields.ai_auto_gen_enabled = (req.body.ai_auto_gen_enabled === 'true' || req.body.ai_auto_gen_enabled === 'on' || req.body.ai_auto_gen_enabled === '1') ? 'true' : 'false';

    for (const key of Object.keys(fields)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(fields[key]) },
        create: { key, value: String(fields[key]) }
      });
    }
    clearSettingsCache();
    res.redirect('/admin/ai?saved=1');
  } catch (err) {
    console.error('[SAVE AI CONFIG ERROR]', err);
    res.status(500).send('Error saving AI configuration');
  }
});

// POST /admin/ai/test - Test AI Model Connectivity
const handleAiTest = async (req, res) => {
  try {
    const result = await aiGenerator.testConnection(req.body);
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/test', handleAiTest);
router.post('/admin/ai/test', handleAiTest);

// POST /admin/ai/generate - Auto-Generate Technical Blog Post
const handleAiGenerate = async (req, res) => {
  try {
    const post = await aiGenerator.generateBlogArticle(req.body);
    res.json({ success: true, post });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/generate', handleAiGenerate);
router.post('/admin/ai/generate', handleAiGenerate);

// POST /admin/ai/suggest-topics - Suggest Trending Technical Topics via AI Agent
const handleAiSuggestTopics = async (req, res) => {
  try {
    const result = await aiGenerator.suggestTopics(req.body);
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/suggest-topics', handleAiSuggestTopics);
router.post('/admin/ai/suggest-topics', handleAiSuggestTopics);

// POST /admin/ai/generate-outline - Generate Technical Article Outline via AI Agent
const handleAiGenerateOutline = async (req, res) => {
  try {
    const result = await aiGenerator.generateOutline(req.body);
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/generate-outline', handleAiGenerateOutline);
router.post('/admin/ai/generate-outline', handleAiGenerateOutline);

// POST /admin/ai/draft-post - Generate Full Post Draft without auto-saving
const handleAiDraftPost = async (req, res) => {
  try {
    const post = await aiGenerator.generateBlogArticle({ ...req.body, createDraftInDb: false });
    res.json({ success: true, post });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/draft-post', handleAiDraftPost);
router.post('/admin/ai/draft-post', handleAiDraftPost);

// POST /admin/ai/auto-gen/run-now - Trigger Scheduled AI Blog Generation Immediately
const handleAiSchedulerRunNow = async (req, res) => {
  try {
    const result = await aiScheduler.executeAutoGeneration({ force: true });
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
};
router.post('/ai/auto-gen/run-now', handleAiSchedulerRunNow);
router.post('/admin/ai/auto-gen/run-now', handleAiSchedulerRunNow);

// POST /admin/trigger-cron - Test background jobs
router.post('/trigger-cron', async (req, res) => {
  try {
    const { action } = req.body;
    if (action === 'publish_scheduled') {
      await publishScheduledPosts();
    } else if (action === 'send_digest') {
      await sendWeeklyNewsletterDigest();
    } else if (action === 'run_auto_blog') {
      await aiScheduler.executeAutoGeneration({ force: true });
    }
    res.json({ success: true, message: `Cron task '${action}' executed successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
