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

function emailLayout({ heading, body, actionLabel, actionUrl, frontendUrl, preheader }) {
  const safeFrontendUrl = escapeHtml(String(frontendUrl || '').replace(/\/+$/, ''));
  const logoUrl = `${safeFrontendUrl}/campus-cart-logo.png`;
  const button = actionLabel && actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 8px"><tr><td style="border-radius:10px;background:#007aff"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:15px;font-weight:700;line-height:1;text-decoration:none">${escapeHtml(actionLabel)}</a></td></tr></table>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(heading)} | Campus Cart</title>
</head>
<body style="margin:0;padding:0;background:#f3f6fa;color:#10110f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader || heading)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f6fa">
    <tr>
      <td align="center" style="padding:32px 14px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;overflow:hidden;border:1px solid #dfe5ec;border-radius:16px;background:#ffffff;box-shadow:0 18px 50px rgba(16,17,15,.08)">
          <tr>
            <td style="padding:22px 32px 18px;border-bottom:4px solid #007aff;background:#ffffff">
              <a href="${safeFrontendUrl}" style="display:inline-block;text-decoration:none">
                <img src="${logoUrl}" width="210" alt="Campus Cart" style="display:block;width:210px;max-width:100%;height:auto;border:0">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:38px 32px 34px">
              <p style="margin:0 0 10px;color:#007aff;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Campus marketplace</p>
              <h1 style="margin:0 0 20px;color:#10110f;font-size:28px;line-height:1.2;letter-spacing:-.02em">${escapeHtml(heading)}</h1>
              <div style="color:#4f5965;font-size:16px;line-height:1.65">${body}</div>
              ${button}
              <div style="margin-top:32px;padding:16px 18px;border-radius:10px;background:#f5f8fc;color:#66717d;font-size:13px;line-height:1.55">
                For your security, never share passwords or verification codes. If you did not request this action, you can safely ignore this email.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px;background:#10110f;color:#ffffff">
              <p style="margin:0 0 5px;font-size:15px;font-weight:800">Campus Cart</p>
              <p style="margin:0;color:#bec5ce;font-size:13px;line-height:1.5">Buy, sell and connect on campus.</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#7a8490;font-size:12px;line-height:1.5">Sent by Campus Cart, supported by LBG Software.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    subject: 'Campus Cart: Verify your email address',
    text: `Campus Cart email verification\n\nVerify your email address: ${url}\n\nThis link expires in 24 hours.`,
    html: emailLayout({
      frontendUrl,
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
    subject: 'Campus Cart: Reset your password',
    text: `Campus Cart password reset\n\nReset your password: ${url}\n\nThis single-use link expires in 1 hour.`,
    html: emailLayout({
      frontendUrl,
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
    subject: 'Campus Cart: Confirm your new email address',
    text: `Campus Cart email update\n\nConfirm your new email address: ${url}\n\nThis single-use link expires in 10 minutes. Your current email remains active until confirmation succeeds.`,
    html: emailLayout({
      frontendUrl,
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
    subject: approved ? 'Campus Cart: Seller verification approved' : 'Campus Cart: Seller verification update',
    text: `Campus Cart\n\n${approved ? 'Your seller verification was approved.' : 'Your seller verification was not approved.'}${adminNote ? `\n\nAdministrator note: ${adminNote}` : ''}`,
    html: emailLayout({
      frontendUrl,
      heading: approved ? 'Seller verification approved' : 'Seller verification update',
      body: `<p>${approved ? 'Your seller identity verification is complete. You can now continue using the verified seller features.' : 'We could not approve the documents submitted. You may submit a new request with corrected documents.'}</p>${note}`,
      actionLabel: 'Open Campus Cart',
      actionUrl: frontendUrl
    })
  });
}

async function sendVerificationSubmittedEmail(user) {
  const { frontendUrl } = getEmailConfiguration();
  return sendEmail({
    to: user.email,
    subject: 'Campus Cart: Verification request received',
    text: 'Campus Cart\n\nYour seller verification request was received and is awaiting administrator review.',
    html: emailLayout({
      frontendUrl,
      heading: 'Verification request received',
      body: '<p>Your seller verification request is safely queued for administrator review. We will email you when its status changes.</p>',
      actionLabel: 'View your profile',
      actionUrl: frontendUrl
    })
  });
}

async function sendNewSellerVerificationEmail(admin, seller, requestId) {
  const { frontendUrl } = getEmailConfiguration();
  const reviewUrl = `${frontendUrl}/admin/reactivation?tab=verification`;
  const sellerName = seller.name || 'A seller';
  const sellerEmail = seller.email || 'Email unavailable';
  return sendEmail({
    to: admin.email,
    subject: `Campus Cart: New seller verification from ${sellerName}`,
    text: `Campus Cart administrator alert\n\n${sellerName} (${sellerEmail}) submitted a seller verification request.\n\nRequest ID: ${requestId}\nReview it here: ${reviewUrl}`,
    html: emailLayout({
      frontendUrl,
      heading: 'New seller verification request',
      body: `<p><strong>${escapeHtml(sellerName)}</strong> (${escapeHtml(sellerEmail)}) submitted identity documents for administrator review.</p><p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>`,
      actionLabel: 'Review verification',
      actionUrl: reviewUrl,
      preheader: `${sellerName} submitted a seller verification request.`
    })
  });
}

async function sendSubscriptionActivatedEmail(user, expiresAt) {
  const { frontendUrl } = getEmailConfiguration();
  const date = new Date(expiresAt).toLocaleDateString('en-ZA', { dateStyle: 'long', timeZone: 'Africa/Johannesburg' });
  return sendEmail({
    to: user.email,
    subject: 'Campus Cart: Seller subscription active',
    text: `Campus Cart\n\nYour seller subscription is active until ${date}.`,
    html: emailLayout({
      frontendUrl,
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
    subject: `Campus Cart: Seller subscription expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    text: `Your Campus Cart seller subscription expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
    html: emailLayout({
      frontendUrl,
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
    subject: `Campus Cart: Unread message from ${sender.name}`,
    text: `${sender.name} sent you ${unreadCount === 1 ? 'a private message' : `${unreadCount} private messages`}${productTitle} on Campus Cart. Sign in to read ${unreadCount === 1 ? 'it' : 'them'}.`,
    html: emailLayout({
      frontendUrl,
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
    subject: `[Campus Cart support] ${subject}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html: emailLayout({
      frontendUrl: config.frontendUrl,
      heading: `Campus Cart support: ${subject}`,
      body: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`
    })
  });
  return sendEmail({
    to: email,
    subject: 'Campus Cart: We received your message',
    text: 'Campus Cart support\n\nYour support message was received. Our team will reply as soon as possible.',
    html: emailLayout({
      frontendUrl: config.frontendUrl,
      heading: 'Message received',
      body: '<p>Thanks for contacting Campus Cart. Our support team has received your message and will reply as soon as possible.</p>'
    })
  });
}

module.exports = {
  emailLayout,
  escapeHtml,
  sendContactEmails,
  sendEmailChangeVerificationEmail,
  sendNewSellerVerificationEmail,
  sendNewMessageEmail,
  sendPasswordResetEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionReminderEmail,
  sendVerificationDecisionEmail,
  sendVerificationEmail,
  sendVerificationSubmittedEmail
};
