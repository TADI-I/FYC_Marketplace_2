const crypto = require('crypto');

function createAccountToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return {
    token,
    hash: hashAccountToken(token)
  };
}

function hashAccountToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { createAccountToken, hashAccountToken };
