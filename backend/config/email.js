function getEmailConfiguration(env = process.env) {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  const replyTo = env.EMAIL_REPLY_TO?.trim() || undefined;
  const supportTo = env.SUPPORT_EMAIL?.trim() || replyTo;
  const frontendUrl = env.FRONTEND_URL?.trim().replace(/\/+$/, '');

  if (!apiKey || !apiKey.startsWith('re_') || /replace/i.test(apiKey)) {
    throw new Error('RESEND_API_KEY is required and must be a Resend API key.');
  }
  if (!from || !from.includes('@')) {
    throw new Error('EMAIL_FROM is required and must contain a verified sender address.');
  }
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is required for email action links.');
  }

  return { apiKey, from, replyTo, supportTo, frontendUrl };
}

function assertEmailConfiguration(env = process.env) {
  if (env.EMAIL_DELIVERY_DISABLED === 'true') return;
  getEmailConfiguration(env);
}

module.exports = { assertEmailConfiguration, getEmailConfiguration };
