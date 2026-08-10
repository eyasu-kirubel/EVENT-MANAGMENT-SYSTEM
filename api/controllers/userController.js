const db = require("../database");

// ── User Profile ──

function updateProfile(req, res) {
  const { fullname, phonenumber, email } = req.body;

  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  const newFullname = fullname !== undefined && fullname !== null ? String(fullname).trim() : current.fullname;
  const newPhone = phonenumber !== undefined && phonenumber !== null ? String(phonenumber).trim() : current.phonenumber;
  const newEmail = email !== undefined && email !== null ? String(email).trim() : current.email;

  if (!newFullname) {
    return res.status(400).json({ error: "Full name cannot be empty." });
  }
  if (!newPhone) {
    return res.status(400).json({ error: "Phone number cannot be empty." });
  }
  if (newEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    const emailClash = db
      .prepare("SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(?) AND id != ?")
      .get(newEmail.toLowerCase(), req.user.id);
    if (emailClash) {
      return res.status(409).json({ error: "Email is already in use." });
    }
  }

  const phoneClash = db
    .prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?")
    .get(newPhone, req.user.id);
  if (phoneClash) {
    return res.status(409).json({ error: "Phone number is already in use." });
  }

  db.prepare("UPDATE users SET fullname = ?, phonenumber = ?, email = ? WHERE id = ?").run(
    newFullname,
    newPhone,
    newEmail,
    req.user.id
  );

  res.json({ message: "Profile updated." });
}

module.exports = { updateProfile };
