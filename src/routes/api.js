// src/routes/api.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const prisma = require('../services/db');
const mailer = require('../services/mailer');
const { contactLimiter, newsletterLimiter } = require('../middleware/rateLimiter');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeText(value) {
  if (value === undefined || value === null) return '';
  return purify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

// POST /api/contact & POST /contact - Handle Contact Us form
const handleContact = async (req, res) => {
  try {
    const { name, email, phone, company, subject, serviceCategory, message, website_url_trap } = req.body;

    // Layer 1: Honeypot trap check
    if (website_url_trap && String(website_url_trap).trim() !== '') {
      console.warn(`[SPAM DETECTED] Honeypot triggered by IP: ${req.ip}`);
      // Pretend success so bot doesn't retry
      return res.json({ success: true, message: 'Thank you for your inquiry! Our engineering team will review it shortly.' });
    }

    // Input Sanitization against XSS
    const cleanName = sanitizeText(name);
    const cleanEmail = sanitizeText(email).toLowerCase();
    const cleanPhone = sanitizeText(phone);
    const cleanCompany = sanitizeText(company);
    const cleanSubject = sanitizeText(subject || 'General Engineering Inquiry');
    const cleanServiceCategory = sanitizeText(serviceCategory || 'General');
    const cleanMessage = sanitizeText(message);

    // Validation
    if (!cleanName || !cleanEmail || !cleanMessage) {
      return res.status(400).json({ success: false, message: 'Please provide your name, valid email address, and message.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const formattedMessage = cleanCompany
      ? `Company: ${cleanCompany}\n\n${cleanMessage}`
      : cleanMessage;

    // Save to Database FIRST
    const inquiry = await prisma.inquiry.create({
      data: {
        name: cleanName.slice(0, 100),
        email: cleanEmail.slice(0, 150),
        phone: cleanPhone ? cleanPhone.slice(0, 30) : null,
        subject: cleanSubject.slice(0, 200),
        serviceCategory: cleanServiceCategory.slice(0, 50),
        message: formattedMessage.slice(0, 5000),
        ipAddress: req.ip
      }
    });

    // Layer 3: Send immediate admin notification email to info@embeddedindia.in
    mailer.sendInquiryNotification({
      ...inquiry,
      company: cleanCompany
    }).catch(err => {
      console.error('[MAILER ERROR] Failed to send admin inquiry notification:', err.message);
    });

    return res.json({
      success: true,
      message: 'Thank you for reaching out! An Embedded India systems engineer will contact you within 24 hours.'
    });
  } catch (err) {
    console.error('[CONTACT API ERROR]', err);
    return res.status(500).json({ success: false, message: 'An internal error occurred. Please try again or email info@embeddedindia.in directly.' });
  }
};

router.post('/contact', contactLimiter, handleContact);

// POST /api/newsletter & POST /api/newsletter/subscribe - Double Opt-in Newsletter Signup
const handleNewsletterSubscribe = async (req, res) => {
  try {
    const { email, source, honeypot } = req.body;

    // Honeypot trap
    if (honeypot && String(honeypot).trim() !== '') {
      return res.json({ success: true, message: 'Subscription request received.' });
    }

    const emailClean = sanitizeText(email).toLowerCase();
    if (!emailClean) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');

    // Check if subscriber already exists
    const existing = await prisma.subscriber.findUnique({
      where: { email: emailClean }
    });

    if (existing && existing.status === 'active') {
      return res.json({
        success: true,
        message: 'You are already an active subscriber! Download your checklist directly from /downloads/embedded-design-checklist.pdf'
      });
    }

    const subscriber = await prisma.subscriber.upsert({
      where: { email: emailClean },
      update: {
        verifyToken,
        status: 'pending',
        source: sanitizeText(source) || 'website'
      },
      create: {
        email: emailClean,
        verifyToken,
        status: 'pending',
        source: sanitizeText(source) || 'website'
      }
    });

    // 1. Send immediate admin notification/approval request email to info@embeddedindia.in
    mailer.sendNewsletterAdminNotification(subscriber).catch(err => {
      console.error('[MAILER ERROR] Newsletter admin notification failed:', err.message);
    });

    // 2. Send double-opt-in verification email to subscriber
    mailer.sendVerificationEmail(emailClean, verifyToken).catch(err => {
      console.error('[MAILER ERROR] Verification mail failed:', err.message);
    });

    return res.json({
      success: true,
      message: 'Please check your inbox! A confirmation link has been sent to activate your subscription and receive your free PCB Design Checklist.'
    });
  } catch (err) {
    console.error('[NEWSLETTER SUBSCRIBE ERROR]', err);
    return res.status(500).json({ success: false, message: 'Error processing subscription. Please try again.' });
  }
};

router.post('/newsletter/subscribe', newsletterLimiter, handleNewsletterSubscribe);
router.post('/newsletter', newsletterLimiter, handleNewsletterSubscribe);

// GET /api/newsletter/verify - Verify Double Opt-in Token
router.get('/newsletter/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.render('pages/message', {
        title: 'Verification Failed',
        heading: 'Invalid Verification Link',
        message: 'The confirmation token is missing or has expired. Please subscribe again on our homepage.',
        buttonText: 'Return to Home',
        buttonLink: '/'
      });
    }

    const cleanToken = sanitizeText(token);
    const subscriber = await prisma.subscriber.findUnique({
      where: { verifyToken: cleanToken }
    });

    if (!subscriber) {
      return res.render('pages/message', {
        title: 'Verification Failed',
        heading: 'Token Not Found',
        message: 'This confirmation link is invalid or already used.',
        buttonText: 'Return to Home',
        buttonLink: '/'
      });
    }

    // Activate subscriber
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'active',
        verifiedAt: new Date(),
        verifyToken: null,
        leadMagnetSent: true
      }
    });

    // Automatically dispatch Lead Magnet PDF
    mailer.sendLeadMagnetEmail(subscriber.email).catch(e => console.error(e));

    return res.render('pages/message', {
      title: 'Subscription Confirmed!',
      heading: 'Subscription Confirmed & Checklist Ready! 🎉',
      message: `Your email (${subscriber.email}) is verified. We have sent the 2026 Embedded Hardware & Firmware Design Checklist PDF to your inbox. You can also download it right now using the button below.`,
      buttonText: 'Download PDF Checklist Now',
      buttonLink: '/downloads/embedded-design-checklist.pdf'
    });
  } catch (err) {
    console.error('[VERIFY ERROR]', err);
    res.status(500).send('Verification error');
  }
});

// GET /api/newsletter/unsubscribe
router.get('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { email } = req.query;
    if (email) {
      const cleanEmail = sanitizeText(email).toLowerCase();
      await prisma.subscriber.updateMany({
        where: { email: cleanEmail },
        data: { status: 'unsubscribed' }
      });
    }

    return res.render('pages/message', {
      title: 'Unsubscribed',
      heading: 'You have been unsubscribed',
      message: 'You will no longer receive our weekly technical digest. You can resubscribe at any time.',
      buttonText: 'Return to Home',
      buttonLink: '/'
    });
  } catch (err) {
    console.error('[UNSUBSCRIBE ERROR]', err);
    res.status(500).send('Unsubscribe error');
  }
});

module.exports = router;
module.exports.handleContact = handleContact;
