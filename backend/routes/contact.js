const express = require('express');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ||
  'VIMS System <noreply@casimiro-westville-homes-vims.online>';
const CONTACT_RECEIVER_EMAIL = process.env.CONTACT_RECEIVER_EMAIL ||
  process.env.RESEND_CONTACT_TO_EMAIL ||
  process.env.ADMIN_EMAIL;

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many contact messages. Please try again later.'
  }
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

router.post('/', contactLimiter, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, subject, and message are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address' });
    }

    if (name.length > 120 || email.length > 160 || subject.length > 180 || message.length > 5000) {
      return res.status(400).json({ success: false, error: 'Message details are too long' });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ success: false, error: 'Email service is not configured' });
    }

    if (!CONTACT_RECEIVER_EMAIL) {
      return res.status(503).json({ success: false, error: 'Contact receiver email is not configured' });
    }

    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: CONTACT_RECEIVER_EMAIL,
      reply_to: email,
      subject: `VIMS Contact Message: ${subject}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1e293b">
        <h2 style="color:#0f5a2a">New Contact Us Message</h2>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:16px 0">
          <tbody>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold;width:140px">Name</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Email</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:bold">Subject</td><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(subject)}</td></tr>
          </tbody>
        </table>
        <div style="white-space:pre-wrap;line-height:1.6;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:14px">${escapeHtml(message)}</div>
        <p style="color:#64748b;font-size:13px;margin-top:16px">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
      </div>`,
      text: `New Contact Us Message\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}\n\nReply directly to this email to respond to ${name}.`
    });

    if (result?.error) {
      throw new Error(result.error.message || 'Resend rejected the email');
    }

    return res.json({ success: true, message: 'Message sent', id: result?.data?.id });
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message || 'Failed to send message' });
  }
});

module.exports = router;
