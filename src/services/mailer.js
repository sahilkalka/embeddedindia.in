// src/services/mailer.js
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const prisma = require('./db');

let transporter = null;
let lastSmtpConfigHash = '';

async function getTransporter() {
  try {
    const settings = await prisma.setting.findMany();
    const map = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const host = map.smtp_host || process.env.SMTP_HOST;
    const port = parseInt(map.smtp_port || process.env.SMTP_PORT || '587');
    const secure = (map.smtp_secure === 'true') || (process.env.SMTP_SECURE === 'true');
    const user = map.smtp_user || process.env.SMTP_USER;
    const pass = map.smtp_pass || process.env.SMTP_PASS;

    const currentHash = `${host}:${port}:${secure}:${user}:${pass}`;

    if (!transporter || currentHash !== lastSmtpConfigHash) {
      lastSmtpConfigHash = currentHash;
      if (user && pass && user !== 'test@ethereal.email') {
        transporter = nodemailer.createTransport({
          host: host || 'smtp.gmail.com',
          port: port,
          secure: secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false }
        });
      } else {
        // Mock development transporter that logs to console
        transporter = {
          sendMail: async (mailOptions) => {
            console.log('\n================== [LOCAL EMAIL DISPATCH] ==================');
            console.log(`To: ${mailOptions.to}`);
            console.log(`Subject: ${mailOptions.subject}`);
            console.log(`Preview: ${mailOptions.text ? mailOptions.text.slice(0, 160) : 'HTML Email'}`);
            console.log('============================================================\n');
            return { messageId: 'local-mock-id-' + Date.now() };
          }
        };
      }
    }
  } catch (err) {
    console.error('[MAILER] Error loading SMTP configuration:', err.message);
  }

  return transporter;
}

/**
 * Test live SMTP server connection and send a test message
 */
async function testSmtpConnection({ host, port, secure, user, pass, toEmail }) {
  const isMock = !host || !user || !pass || 
    host === 'mock' || host === 'localhost' || 
    user === 'mock' || user === 'test@ethereal.email' ||
    user === 'test' || pass === 'test';

  if (isMock) {
    await new Promise(r => setTimeout(r, 250));
    const recipient = toEmail || 'admin@embeddedindia.in';
    console.log(`\n[SMTP TEST] Simulated email dispatched to: ${recipient}`);
    return {
      success: true,
      simulated: true,
      messageId: `simulated-smtp-${Date.now()}`,
      message: `Simulated SMTP handshake & delivery verified to ${recipient} (Local Dev Mode). To send real external emails, enter your production SMTP host and credentials.`
    };
  }

  const testTransporter = nodemailer.createTransport({
    host,
    port: parseInt(port) || 587,
    secure: secure === true || secure === 'true',
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false }
  });

  try {
    // 1. Verify connection credentials
    await testTransporter.verify();

    // 2. Send test email
    const recipient = toEmail || user;
    const info = await testTransporter.sendMail({
      from: `Embedded India System <${user}>`,
      to: recipient,
      subject: 'SMTP Configuration Verified - Embedded India',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #007f5f; margin-top: 0;">✅ Outgoing SMTP Verified</h2>
          <p style="font-size: 14px; color: #334155;">This email confirms that your outgoing mail server configuration for <strong>Embedded India</strong> is working properly.</p>
          <div style="padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 12px; color: #475569;">
            Host: ${host}<br>
            Port: ${port}<br>
            Timestamp: ${new Date().toISOString()}
          </div>
        </div>
      `,
      text: `SMTP Configuration Verified for Embedded India on ${host}:${port}.`
    });

    return { success: true, messageId: info.messageId, message: `Live test email delivered to ${recipient} (Message ID: ${info.messageId})` };
  } catch (err) {
    let friendlyError = err.message;
    if (err.code === 'EAUTH') {
      friendlyError = 'SMTP Authentication failed: Invalid username or password. (If using Gmail, please use an App Password).';
    } else if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
      friendlyError = `Connection to ${host}:${port} timed out or was refused. Check your host and port.`;
    }
    return { success: false, error: friendlyError };
  }
}

async function getMailerConfig() {
  try {
    const settings = await prisma.setting.findMany();
    const map = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const fromName = map.smtp_from_name || map.site_name || 'Embedded India';
    const fromEmail = map.smtp_from_email || map.contact_email || process.env.SMTP_USER || 'info@embeddedindia.in';
    const adminEmail = map.contact_email || process.env.ADMIN_DEFAULT_EMAIL || 'admin@embeddedindia.in';

    return {
      map,
      from: `"${fromName}" <${fromEmail}>`,
      adminEmail
    };
  } catch (e) {
    return {
      map: {},
      from: process.env.SMTP_FROM || '"Embedded India" <info@embeddedindia.in>',
      adminEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@embeddedindia.in'
    };
  }
}

const mailer = {
  // Send notification to admin when inquiry is submitted
  async sendInquiryNotification(inquiry) {
    const config = await getMailerConfig();
    const mailOptions = {
      from: config.from,
      to: config.adminEmail,
      subject: `[New Inquiry] ${inquiry.subject} (${inquiry.serviceCategory})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #007f5f; padding: 20px; color: white;">
            <h2 style="margin: 0;">New Engineering Consultation Inquiry</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">Embedded India Customer Portal</p>
          </div>
          <div style="padding: 24px; color: #192c27;">
            <p><strong>Name:</strong> ${inquiry.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${inquiry.email}">${inquiry.email}</a></p>
            <p><strong>Phone:</strong> ${inquiry.phone || 'Not provided'}</p>
            <p><strong>Service Category:</strong> ${inquiry.serviceCategory}</p>
            <p><strong>Subject:</strong> ${inquiry.subject}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <p style="background: #f8fafc; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${inquiry.message}</p>
            <div style="margin-top: 25px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin/inquiries" style="background: #007f5f; color: white; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: bold;">View in Admin Dashboard</a>
            </div>
          </div>
        </div>
      `,
      text: `New Inquiry from ${inquiry.name} (${inquiry.email}): ${inquiry.message}`
    };

    const t = await getTransporter();
    return t.sendMail(mailOptions);
  },

  // Send double-opt-in verification link
  async sendVerificationEmail(email, token) {
    const config = await getMailerConfig();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verifyUrl = `${appUrl}/api/newsletter/verify?token=${token}`;

    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'Please Confirm Your Subscription - Embedded India',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #007f5f; padding: 20px; color: white;">
            <h2 style="margin: 0;">Embedded India Newsletter</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">One step away from your free PCB Design Checklist</p>
          </div>
          <div style="padding: 24px; color: #192c27;">
            <p>Hello,</p>
            <p>Thank you for subscribing to Embedded India's weekly technical digest. Please confirm your email address to unlock your free copy of <strong>The 2026 Embedded Hardware & Firmware Design Checklist</strong>.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verifyUrl}" style="background: #007f5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirm My Subscription & Download PDF</a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser: <br><a href="${verifyUrl}">${verifyUrl}</a></p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">If you did not request this subscription, you can safely ignore this email.</p>
          </div>
        </div>
      `,
      text: `Please confirm your subscription to Embedded India by visiting: ${verifyUrl}`
    };

    const t = await getTransporter();
    return t.sendMail(mailOptions);
  },

  // Send Lead Magnet PDF directly
  async sendLeadMagnetEmail(email) {
    const config = await getMailerConfig();
    const pdfPath = path.join(__dirname, '../../public/downloads/embedded-design-checklist.pdf');
    const attachments = [];
    if (fs.existsSync(pdfPath)) {
      attachments.push({
        filename: 'Embedded-Design-Checklist-2026.pdf',
        path: pdfPath
      });
    }

    const mailOptions = {
      from: config.from,
      to: email,
      subject: 'Your Free PDF: Embedded Hardware & Firmware Design Checklist',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #007f5f; padding: 20px; color: white;">
            <h2 style="margin: 0;">Welcome to Embedded India!</h2>
          </div>
          <div style="padding: 24px; color: #192c27;">
            <p>Your subscription has been confirmed! As promised, your copy of <strong>The 2026 Embedded Hardware & Firmware Design Checklist</strong> is attached to this email.</p>
            <p>You will now receive our curated weekly engineering roundups featuring:</p>
            <ul>
              <li>High-speed PCB layout techniques (DDR, USB 3.0, Differential Pairs)</li>
              <li>Firmware architecture, RTOS, and TinyML on microcontrollers</li>
              <li>Free access to interactive engineering calculators</li>
            </ul>
            <div style="margin: 25px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/tools" style="background: #55a630; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Explore Engineering Tools</a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">To unsubscribe at any time, click <a href="${process.env.APP_URL || 'http://localhost:3000'}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}">here</a>.</p>
          </div>
        </div>
      `,
      text: `Your checklist is ready. Download it from the attachment or visit ${process.env.APP_URL || 'http://localhost:3000'}`,
      attachments
    };

    const t = await getTransporter();
    return t.sendMail(mailOptions);
  },

  testSmtpConnection
};

module.exports = mailer;
