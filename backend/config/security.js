const MIN_SECRET_LENGTH = 32;

function configuredOrigins(env = process.env) {
  return (env.CORS_ALLOWED_ORIGINS || env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function getJwtSecret(env = process.env) {
  const secret = env.JWT_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH || /^replace-with/i.test(secret)) {
    throw new Error(`JWT_SECRET must contain at least ${MIN_SECRET_LENGTH} non-placeholder characters.`);
  }
  return secret;
}

function assertSecurityConfiguration(env = process.env) {
  getJwtSecret(env);
  if (env.NODE_ENV === 'production' && configuredOrigins(env).length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS or FRONTEND_URL is required in production.');
  }
}

module.exports = { assertSecurityConfiguration, configuredOrigins, getJwtSecret };
