const { sendContactEmails } = require('../services/emailService');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.submitContact = async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').toLowerCase().trim();
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || name.length > 120 || !EMAIL_PATTERN.test(email) || !subject || subject.length > 120 || message.length < 10 || message.length > 5000) {
      return res.status(400).json({ success: false, error: 'Please provide valid contact details and a message between 10 and 5,000 characters.' });
    }

    await sendContactEmails({ name, email, subject, message });
    return res.status(202).json({ success: true, message: 'Your message was sent. A confirmation email is on its way.' });
  } catch (error) {
    console.error('Contact email delivery failed:', error.message);
    return res.status(503).json({ success: false, error: 'Your message could not be sent right now. Please try again later.' });
  }
};
