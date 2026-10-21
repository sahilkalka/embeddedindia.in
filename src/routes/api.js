// src/routes/api.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../services/db');
const mailer = require('../services/mailer');
const { contactLimiter, newsletterLimiter } = require('../middleware/rateLimiter');

// POST /api/contact - Handle Contact Us form
router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const { name, email, phone, subject, serviceCategory, message, website_url_trap } = req.body;

    // Layer 1: Honeypot trap check
    if (website_url_trap && website_url_trap.trim() !== '') {
      console.warn(`[SPAM DETECTED] Honeypot triggered by IP: ${req.ip}`);
      // Pretend success so bot doesn't retry
      return res.json({ success: true, message: 'Thank you for your inquiry! Our engineering team will review it shortly.' });
    }

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Please provide your name, valid email address, and message.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Save to Database
    const inquiry = await prisma.inquiry.create({
      data: {
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 150),
        phone: phone ? phone.trim().slice(0, 30) : null,
        subject: (subject || 'General Engineering Inquiry').trim().slice(0, 200),
        serviceCategory: serviceCategory || 'General',
        message: message.trim().slice(0, 5000),
        ipAddress: req.ip
      }
    });

    // Layer 3: Send automated alert email to Admin
    mailer.sendInquiryNotification(inquiry).catch(err => {
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
});

// POST /api/newsletter/subscribe - Double Opt-in Newsletter Signup
router.post('/newsletter/subscribe', newsletterLimiter, async (req, res) => {
  try {
    const { email, source, honeypot } = req.body;

    // Honeypot trap
    if (honeypot && honeypot.trim() !== '') {
      return res.json({ success: true, message: 'Subscription request received.' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const emailClean = email.trim().toLowerCase();
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

    await prisma.subscriber.upsert({
      where: { email: emailClean },
      update: {
        verifyToken,
        status: 'pending',
        source: source || 'website'
      },
      create: {
        email: emailClean,
        verifyToken,
        status: 'pending',
        source: source || 'website'
      }
    });

    // Send verification email
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
});

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

    const subscriber = await prisma.subscriber.findUnique({
      where: { verifyToken: String(token) }
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
      await prisma.subscriber.updateMany({
        where: { email: String(email).toLowerCase() },
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
    res.status(500).send('Unsubscribe error');
  }
});

module.exports = router;
