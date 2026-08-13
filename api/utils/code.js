const crypto = require("node:crypto");

const CODE_LIFETIME_MS = 10 * 60 * 1000;

// Cryptographically secure 6-digit code (100000 - 999999). Never Math.random().
function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

// We only ever store a hash of a code, so a leaked database cannot be used to
// guess codes or send emails. Same approach as the password hashing.
function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function verifyCode(code, storedHash) {
  if (!storedHash) return false;
  const hash = crypto.createHash("sha256").update(String(code)).digest("hex");
  // Constant-time comparison to avoid timing side channels.
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Single-use, short-lived authorization issued only after a reset code has
// been verified. Acts like a temporary bearer token for the reset flow.
function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { generateCode, hashCode, verifyCode, generateResetToken, CODE_LIFETIME_MS };
