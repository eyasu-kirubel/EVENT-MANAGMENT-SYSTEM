const db = require("../database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { runInTransaction } = require("../utils/transaction");
const { tokens, generateToken, toPublicUser } = require("../utils/token");

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
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(req.params.email).trim().toLowerCase());
  res.json({ exists: !!existing });
}

// ── Register ──
function register(req, res) {
  const { fullname, phonenumber, password, birthDate, licenceNumber, email } = req.body;

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
  if (!email) {
    return res.status(400).json({ error: "email is required." });
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
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).trim().toLowerCase());
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
      // isOrganizer is what carries the distinction.
      const result = db
        .prepare(
          "INSERT INTO users (fullname, phonenumber, password, birthDate, email, role, isOrganizer) VALUES (?, ?, ?, ?, ?, 'user', ?)"
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

    const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    const user = toPublicUser(userRow);
    const token = generateToken();
    tokens.set(token, user);

    // Include the organizer profile in the response when relevant, so the
    // frontend has licenceNumber/email right after signup without a second request.
    const responseBody = { token, user };
    if (isOrganizer) {
      responseBody.organizer = db
        .prepare("SELECT licenceNumber, email, createdAt FROM organizers WHERE userId = ?")
        .get(userId);
    }

    res.status(201).json(responseBody);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register." });
  }
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

  const user = toPublicUser(userRow);
  const token = generateToken();
  tokens.set(token, user);

  res.json({ token, user });
}

// ── Forgot Password ──
function forgotPassword(req, res) {
  const { phonenumber, email } = req.body;
  if (!phonenumber || !email) {
    return res.status(400).json({ error: "Phone number and email are required." });
  }

  const user = db.prepare("SELECT id, email FROM users WHERE phonenumber = ?").get(phonenumber);
  if (!user) {
    return res.status(404).json({ error: "No account found with this phone number." });
  }
  if (!user.email || user.email.toLowerCase() !== String(email).toLowerCase()) {
    return res.status(403).json({ error: "Email does not match this account." });
  }

  // Generate 6-digit code valid for 15 minutes
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Delete any existing codes for this phone, then insert new one
  db.prepare("DELETE FROM reset_codes WHERE phonenumber = ?").run(phonenumber);
  db.prepare("INSERT INTO reset_codes (phonenumber, code, expiresAt) VALUES (?, ?, ?)").run(phonenumber, code, expiresAt);

  res.json({ message: "Reset code sent.", code }); // code returned since we have no SMS
}

// ── Reset Password ──
function resetPassword(req, res) {
  const { phonenumber, code, newPassword } = req.body;

  if (!phonenumber || !code || !newPassword) {
    return res.status(400).json({ error: "phonenumber, code, and newPassword are required." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const reset = db.prepare("SELECT * FROM reset_codes WHERE phonenumber = ? AND code = ?").get(phonenumber, code);
  if (!reset) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  if (new Date(reset.expiresAt) < new Date()) {
    db.prepare("DELETE FROM reset_codes WHERE id = ?").run(reset.id);
    return res.status(400).json({ error: "Reset code has expired." });
  }

  const hashed = hashPassword(newPassword);
  db.prepare("UPDATE users SET password = ? WHERE phonenumber = ?").run(hashed, phonenumber);
  db.prepare("DELETE FROM reset_codes WHERE phonenumber = ?").run(phonenumber);

  res.json({ message: "Password reset successfully." });
}

module.exports = { checkPhone, checkLicence, checkEmail, register, login, forgotPassword, resetPassword };
