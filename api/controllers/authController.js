const db = require("../database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { runInTransaction } = require("../utils/transaction");
const { tokens, generateToken, toPublicUser } = require("../utils/token");
const {
  generateCode,
  hashCode,
  verifyCode,
  generateResetToken,
  CODE_LIFETIME_MS,
} = require("../utils/code");
const {
  sendEmailVerificationCode,
  sendPasswordResetCode,
} = require("../utils/email");

const RESEND_COOLDOWN_MS = 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Email helpers ──
function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

// Case-insensitive lookup so "User@Example.com" still matches the stored
// (normalized, lowercase) address.
function findUserByEmail(email) {
  if (typeof email !== "string") return null;
  return db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email.trim());
}

// ── Code issuance ──
// Codes are generated securely, stored ONLY as a hash, expire after 10
// minutes, and are single-use. Only the latest code for a user is valid.
function issueEmailVerificationCode(userId) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS).toISOString();
  db.prepare(
    "INSERT INTO email_verifications (userId, codeHash, expiresAt, used, createdAt) VALUES (?, ?, ?, 0, ?)"
  ).run(userId, hashCode(code), expiresAt, new Date().toISOString());
  return { code, expiresAt };
}

function issuePasswordResetCode(userId) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_LIFETIME_MS).toISOString();
  db.prepare(
    "INSERT INTO password_resets (userId, codeHash, expiresAt, used, createdAt) VALUES (?, ?, ?, 0, ?)"
  ).run(userId, hashCode(code), expiresAt, new Date().toISOString());
  return { code, expiresAt };
}

// Invalidate all outstanding (unused) codes for a user so that only a newly
// issued code can ever be redeemed.
function invalidateEmailVerificationCodes(userId) {
  db.prepare("UPDATE email_verifications SET used = 1 WHERE userId = ? AND used = 0").run(userId);
}

function invalidatePasswordResets(userId) {
  db.prepare("UPDATE password_resets SET used = 1 WHERE userId = ? AND used = 0").run(userId);
}

function latestEmailVerification(userId) {
  return db.prepare("SELECT * FROM email_verifications WHERE userId = ? ORDER BY id DESC LIMIT 1").get(userId);
}

function latestPasswordReset(userId) {
  return db.prepare("SELECT * FROM password_resets WHERE userId = ? ORDER BY id DESC LIMIT 1").get(userId);
}

// Basic rate protection: don't allow a flood of code emails to the same user.
function withinCooldown(row) {
  if (!row || !row.createdAt) return false;
  const created = new Date(row.createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < RESEND_COOLDOWN_MS;
}

// ── Check Phone ──
// Only "users" holds phone numbers now — organizers no longer have their
// own phonenumber column, so there's only ever one table to check.
function checkPhone(req, res) {
  const existing = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(req.params.phonenumber);
  res.json({ exists: !!existing });
}

// ── Check Licence ──
function checkLicence(req, res) {
  const existing = db.prepare("SELECT id FROM organizers WHERE licenceNumber = ?").get(req.params.licenceNumber);
  res.json({ exists: !!existing });
}

// ── Check Email ──
function checkEmail(req, res) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").get(String(req.params.email).trim());
  res.json({ exists: !!existing });
}

// ── Register ──
async function register(req, res) {
  const { fullname, phonenumber, password, birthDate, licenceNumber } = req.body;
  const email = normalizeEmail(req.body.email);

  // Accept either the new `isOrganizer: true` flag or the old
  // `role: "organizer"` shape, so an existing frontend that still sends
  // role:"organizer" keeps working without changes, while internally we only
  // ever use the isOrganizer flag from here on.
  const isOrganizer = req.body.isOrganizer === true || req.body.role === "organizer";

  // 1. Fields required for EVERYONE.
  if (!fullname || !phonenumber || !password) {
    return res.status(400).json({ error: "fullname, phonenumber and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "password must be at least 6 characters." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  // 2. Fields required ONLY for organizers.
  if (isOrganizer && !licenceNumber) {
    return res.status(400).json({ error: "licenceNumber is required to register as an organizer." });
  }

  // 3. Single uniqueness source: the users table's phonenumber column.
  const existingUser = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(phonenumber);
  if (existingUser) {
    return res.status(409).json({ error: "Phone number is already registered." });
  }

  // Email must also be unique — checked ahead of time so we return a clean
  // 409 instead of letting the same email register twice.
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").get(email);
  if (existingEmail) {
    return res.status(409).json({ error: "Email is already registered." });
  }

  // 4. For organizers, licenceNumber must also be unique — checked ahead of
  // time so we can return a clean 409 instead of a raw SQLite error.
  if (isOrganizer) {
    const existingLicence = db.prepare("SELECT id FROM organizers WHERE licenceNumber = ?").get(licenceNumber);
    if (existingLicence) {
      return res.status(409).json({ error: "This licence number is already registered." });
    }
  }

  const hashed = hashPassword(password);

  try {
    // 5. Insert into users, then (only if isOrganizer) insert into
    // organizers using the id we just generated. Wrapped in a transaction
    // so that if the organizers insert fails for any reason (e.g. a
    // licenceNumber collision from a simultaneous request), the users
    // insert is rolled back too — we never want a "ghost" user row with
    // isOrganizer = 1 but no matching organizer profile.
    const userId = runInTransaction(() => {
      // role is ALWAYS "user" here — organizers are not a separate role.
      // isOrganizer is what carries the distinction. New accounts start
      // unverified (emailVerified = 0).
      const result = db
        .prepare(
          "INSERT INTO users (fullname, phonenumber, password, birthDate, email, role, isOrganizer, emailVerified) VALUES (?, ?, ?, ?, ?, 'user', ?, 0)"
        )
        .run(fullname, phonenumber, hashed, birthDate || null, email || null, isOrganizer ? 1 : 0);

      const newUserId = result.lastInsertRowid;

      if (isOrganizer) {
        db.prepare("INSERT INTO organizers (userId, licenceNumber, email) VALUES (?, ?, ?)").run(
          newUserId,
          licenceNumber,
          email
        );
      }

      return newUserId;
    });

    // 6. Issue a verification code for the account's email and email it.
    // The code itself is NEVER returned in the API response.
    const { code } = issueEmailVerificationCode(userId);
    let sendFailed = false;
    try {
      await sendEmailVerificationCode(email, code);
    } catch (err) {
      sendFailed = true;
      console.error("Failed to send verification email:", err.message);
    }

    if (sendFailed) {
      return res.status(201).json({
        message: "Account created, but the verification email could not be sent. Please use resend-verification.",
        emailVerificationRequired: true,
      });
    }

    res.status(201).json({
      message: "Registration successful. Please check your email for the verification code.",
      emailVerificationRequired: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register." });
  }
}

// ── Verify Email ──
function verifyEmail(req, res) {
  const { email, code } = req.body;
  if (!isValidEmail(email) || !code) {
    return res.status(400).json({ error: "email and code are required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  const row = db
    .prepare("SELECT * FROM email_verifications WHERE userId = ? AND used = 0 ORDER BY id DESC LIMIT 1")
    .get(user.id);
  if (!row) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("UPDATE email_verifications SET used = 1 WHERE id = ?").run(row.id);
    return res.status(400).json({ error: "Verification code has expired." });
  }
  if (!verifyCode(code, row.codeHash)) {
    return res.status(400).json({ error: "Invalid or expired verification code." });
  }

  db.prepare("UPDATE users SET emailVerified = 1 WHERE id = ?").run(user.id);
  db.prepare("UPDATE email_verifications SET used = 1 WHERE id = ?").run(row.id);

  res.json({ message: "Email verified successfully." });
}

// ── Resend Verification ──
async function resendVerification(req, res) {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: "No account found with this email." });
  }
  if (user.emailVerified === 1) {
    return res.status(400).json({ error: "Email is already verified." });
  }

  const latest = latestEmailVerification(user.id);
  if (withinCooldown(latest)) {
    return res.status(429).json({ error: "Please wait a minute before requesting another code." });
  }

  // Only the latest code is valid — invalidate every previous one.
  invalidateEmailVerificationCodes(user.id);
  const { code } = issueEmailVerificationCode(user.id);

  try {
    await sendEmailVerificationCode(user.email, code);
  } catch (err) {
    console.error("Failed to resend verification email:", err.message);
    return res.status(500).json({ error: "Failed to send the verification email. Please try again." });
  }

  res.json({ message: "A new verification code has been sent to your email." });
}

// ── Login ──
// ONE query, against ONE table. Organizers are users, so there's no second
// lookup to fall back to anymore.
function login(req, res) {
  const { phonenumber, password } = req.body;

  if (!phonenumber || !password) {
    return res.status(400).json({ error: "phonenumber and password are required." });
  }

  const userRow = db.prepare("SELECT * FROM users WHERE phonenumber = ?").get(phonenumber);

  if (!userRow || !verifyPassword(password, userRow.password)) {
    return res.status(401).json({ error: "Invalid phone number or password." });
  }

  if (userRow.status === "suspended") {
    return res.status(403).json({ error: "Your account has been suspended. Contact support." });
  }

  if (userRow.emailVerified !== 1) {
    return res.status(403).json({ error: "Please verify your email before logging in." });
  }

  const user = toPublicUser(userRow);
  const token = generateToken();
  tokens.set(token, user);

  res.json({ token, user });
}

// ── Forgot Password ──
// Email-only, so a caller can't probe which phone numbers exist. Whether the
// account exists or not we return the same generic message.
async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);
  const generic = { message: "If an account exists for this email, a password reset code has been sent." };

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.json(generic);
  }

  const latest = latestPasswordReset(user.id);
  if (withinCooldown(latest)) {
    return res.status(429).json({ error: "Please wait a minute before requesting another code." });
  }

  // Only the latest code is valid — invalidate every previous one.
  invalidatePasswordResets(user.id);
  const { code } = issuePasswordResetCode(user.id);

  try {
    await sendPasswordResetCode(user.email, code);
  } catch (err) {
    console.error("Failed to send password reset email:", err.message);
    // Keep the generic response; never confirm/deny account existence.
    return res.json(generic);
  }

  res.json(generic);
}

// ── Verify Reset Code ──
// On success we issue a short-lived reset token. The frontend never decides
// "the code was right" on its own — the backend enforces it.
function verifyResetCode(req, res) {
  const { email, code } = req.body;
  if (!isValidEmail(email) || !code) {
    return res.status(400).json({ error: "email and code are required." });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  const row = db
    .prepare("SELECT * FROM password_resets WHERE userId = ? AND used = 0 ORDER BY id DESC LIMIT 1")
    .get(user.id);
  if (!row) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(row.id);
    return res.status(400).json({ error: "Reset code has expired." });
  }
  if (!verifyCode(code, row.codeHash)) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  const resetToken = generateResetToken();
  const tokenExpiresAt = new Date(Date.now() + CODE_LIFETIME_MS).toISOString();
  db.prepare("UPDATE password_resets SET used = 1, resetToken = ?, resetTokenExpiresAt = ? WHERE id = ?").run(
    resetToken,
    tokenExpiresAt,
    row.id
  );

  res.json({ message: "Code verified.", resetToken });
}

// ── Reset Password ──
function resetPassword(req, res) {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: "resetToken and newPassword are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const row = db.prepare("SELECT * FROM password_resets WHERE resetToken = ?").get(resetToken);
  if (!row) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }
  if (!row.resetTokenExpiresAt || new Date(row.resetTokenExpiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }

  const hashed = hashPassword(newPassword);
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, row.userId);

  // Single-use: delete the reset record so the token/code can never be
  // reused, even if someone captured it mid-flow.
  db.prepare("DELETE FROM password_resets WHERE id = ?").run(row.id);

  res.json({ message: "Password reset successfully." });
}

module.exports = {
  checkPhone,
  checkLicence,
  checkEmail,
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
