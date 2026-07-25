const crypto = require("node:crypto");

const SALT_LEN = 16;
const HASH_LEN = 64;
const ITERATIONS = 10000;
const DIGEST = "sha512";

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LEN).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, HASH_LEN, DIGEST).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const verify = crypto.pbkdf2Sync(password, salt, ITERATIONS, HASH_LEN, DIGEST).toString("hex");
  return hash === verify;
}

module.exports = { hashPassword, verifyPassword };
