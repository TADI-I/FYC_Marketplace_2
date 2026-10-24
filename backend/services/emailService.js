const { Resend } = require('resend');
const { getEmailConfiguration } = require('../config/email');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailLayout({ heading, body, actionLabel, actionUrl }) {
  const button = actionLabel && actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="background:#10110f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;display:inline-block">${escapeHtml(actionLabel)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f2efe7;color:#10110f;font-family:Arial,sans-serif"><div style="max-width:600px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #dedbd2;padding:32px"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#5c5d58">Campus Cart</p><h1 style="font-size:26px;margin:12px 0 20px">${escapeHtml(heading)}</h1>${body}${button}<p style="font-size:13px;color:#666;margin-top:32px">If you did not request this action, you can ignore this email.</p></div></div></body></html>`;
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  if (process.env.EMAIL_DELIVERY_DISABLED === 'true') return { id: 'disabled-for-test' };
  const config = getEmailConfiguration();
  const resend = new Resend(config.apiKey);
  const safeSubject = String(subject || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  if (!safeSubject) throw new Error('Email subject is required.');
  const { data, error } = await resend.emails.send({
    from: config.from,
    to: [to],
    subject: safeSubject,
    html,
    text,
    replyTo: replyTo || config.replyTo
  });
  if (error) throw new Error(`Email delivery failed: ${error.message || 'Resend rejected the request'}`);
  return data;
}

async function sendVerificationEmail(user, token) {
  const { frontendUrl } = getEmailConfiguration();
  const url = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Verify your Campus Cart email address',
    text: `Verify your email address: ${url}\n\nThis link expires in 24 hours.`,
    html: emailLayout({
      heading: `Verify your email, ${user.name}`,
      body: '<p>Confirm that this email address belongs to you before signing in to Campus Cart. This link expires in 24 hours.</p>',
      actionLabel: 'Verify email address',
      actionUrl: url
    })
  });
}

async function sendPasswordResetEmail(user, token) {
  const { frontendUrl } = getEmailConfiguration();
  const url = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset your Campus Cart password',
    text: `Reset your password: ${url}\n\nThis single-use link expires in 1 hour.`,
    html: emailLayout({
      heading: 'Reset your password',
      body: '<p>Use the secure link below to choose a new password. The link can be used once and expires in one hour.</p>',
      actionLabel: 'Reset password',
      actionUrl: url
    })
  });
}

async function sendEmailChangeVerificationEmail(user, pendingEmail, token) {
  const { frontendUrl } = getEmailConfiguration();
  const url = `${frontendUrl}/confirm-email-change?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: pendingEmail,
    subject: 'Confirm your new Campus Cart email address',
    text: `Confirm your new email address: ${url}\n\nThis single-use link expires in 10 minutes. Your current email remains active until confirmation succeeds.`,
    html: emailLayout({
      heading: 'Confirm your new email address',
      body: `<p>${escapeHtml(user.name)}, confirm this address to finish updating your Campus Cart account.</p><p>This single-use link expires in <strong>10 minutes</strong>. Your current sign-in email will remain active until confirmation succeeds.</p>`,
      actionLabel: 'Confirm new email',
      actionUrl: url
    })
  });
}

async function sendVerificationDecisionEmail(user, action, adminNote) {
  const approved = action === 'approve';
  const { frontendUrl } = getEmailConfiguration();
  const note = adminNote ? `<p><strong>Administrator note:</strong> ${escapeHtml(adminNote)}</p>` : '';
  return sendEmail({
    to: user.email,
    subject: approved ? 'Your seller verification was approved' : 'Update on your seller verification',
    text: `${approved ? 'Your seller verification was approved.' : 'Your seller verification was not approved.'}${adminNote ? `\n\nAdministrator note: ${adminNote}` : ''}`,
    html: emailLayout({
      heading: approved ? 'Seller verification approved' : 'Seller verification update',
      body: `<p>${approved ? 'Your seller identity verification is complete. You can now continue using the verified seller features.' : 'We could not approve the documents submitted. You may submit a new request with corrected documents.'}</p>${note}`,
      actionLabel: 'Open Marketplace',
      actionUrl: frontendUrl
    })
  });
}

async function sendVerificationSubmittedEmail(user) {
  const { frontendUrl } = getEmailConfiguration();
  return sendEmail({
    to: user.email,
    subject: 'We received your seller verification request',
    text: 'Your seller verification request was received and is awaiting administrator review.',
    html: emailLayout({
      heading: 'Verification request received',
      body: '<p>Your seller verification request is safely queued for administrator review. We will email you when its status changes.</p>',
      actionLabel: 'View your profile',
      actionUrl: frontendUrl
    })
  });
}

async function sendSubscriptionActivatedEmail(user, expiresAt) {
  const { frontendUrl } = getEmailConfiguration();
  const date = new Date(expiresAt).toLocaleDateString('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' });
  return sendEmail({
    to: user.email,
    subject: 'Your Campus Cart seller subscription is active',
    text: `Your seller subscription is active until ${date}.`,
    html: emailLayout({
      heading: 'Seller subscription activated',
      body: `<p>Your verified payment has activated seller access through <strong>${escapeHtml(date)}</strong>.</p>`,
      actionLabel: 'Manage your listings',
      actionUrl: frontendUrl
    })
  });
}

async function sendSubscriptionReminderEmail(user, daysRemaining) {
  const { frontendUrl } = getEmailConfiguration();
  return sendEmail({
    to: user.email,
    subject: `Seller subscription expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    text: `Your Campus Cart seller subscription expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
    html: emailLayout({
      heading: 'Seller subscription reminder',
      body: `<p>Your seller access expires in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong>. Renew before expiry to keep your listings active.</p>`,
      actionLabel: 'Open subscription settings',
      actionUrl: frontendUrl
    })
  });
}

async function sendNewMessageEmail(recipient, sender, options = {}) {
  const { frontendUrl } = getEmailConfiguration();
  const unreadCount = Math.max(1, Number(options.unreadCount) || 1);
  const productTitle = options.productTitle ? ` about “${options.productTitle}”` : '';
  const actionUrl = options.threadPath ? `${frontendUrl}${options.threadPath}` : `${frontendUrl}/messages`;
  return sendEmail({
    to: recipient.email,
    subject: `Unread Marketplace message from ${sender.name}`,
    text: `${sender.name} sent you ${unreadCount === 1 ? 'a private message' : `${unreadCount} private messages`}${productTitle} on Campus Cart. Sign in to read ${unreadCount === 1 ? 'it' : 'them'}.`,
    html: emailLayout({
      heading: `You have ${unreadCount === 1 ? 'an unread message' : `${unreadCount} unread messages`}`,
      body: `<p>${escapeHtml(sender.name)} sent you ${unreadCount === 1 ? 'a message' : `${unreadCount} messages`}${productTitle ? ` about <strong>${escapeHtml(options.productTitle)}</strong>` : ''}. For privacy, message contents are available only after you sign in.</p>`,
      actionLabel: 'Read message',
      actionUrl
    })
  });
}

async function sendContactEmails({ name, email, subject, message }) {
  const config = getEmailConfiguration();
  if (!config.supportTo) throw new Error('SUPPORT_EMAIL or EMAIL_REPLY_TO is required for contact messages.');
  await sendEmail({
    to: config.supportTo,
    replyTo: email,
    subject: `[Marketplace support] ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: emailLayout({
      heading: `Marketplace support: ${subject}`,
      body: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`
    })
  });
  return sendEmail({
    to: email,
    subject: 'We received your Campus Cart message',
    text: 'Your support message was received. Our team will reply as soon as possible.',
    html: emailLayout({
      heading: 'Message received',
      body: '<p>Thanks for contacting Campus Cart. Our support team has received your message and will reply as soon as possible.</p>'
    })
  });
}

module.exports = {
  escapeHtml,
  sendContactEmails,
  sendEmailChangeVerificationEmail,
  sendNewMessageEmail,
  sendPasswordResetEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionReminderEmail,
  sendVerificationDecisionEmail,
  sendVerificationEmail,
  sendVerificationSubmittedEmail
};
