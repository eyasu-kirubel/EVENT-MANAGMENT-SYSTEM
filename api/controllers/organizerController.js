const db = require("../database");
const { getEventAttendeeCount, decorateEvent } = require("../utils/events");

// ── Organizer Dashboard ──

function getStats(req, res) {
  const totalEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE organizerId = ?").get(req.user.id).c;
  const pendingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE organizerId = ? AND status = 'Pending'").get(req.user.id).c;
  const totalBookings = db.prepare(
    "SELECT COUNT(*) AS c FROM booked_tickets bt JOIN events e ON e.id = bt.eventId WHERE e.organizerId = ?"
  ).get(req.user.id).c;
  const totalRevenue = db.prepare(
    "SELECT COALESCE(SUM(bt.unitPrice * bt.quantity), 0) AS c FROM booked_tickets bt JOIN events e ON e.id = bt.eventId WHERE e.organizerId = ?"
  ).get(req.user.id).c;

  res.json({ totalEvents, pendingEvents, totalBookings, totalRevenue });
}

function getRecentEvents(req, res) {
  const events = db.prepare("SELECT * FROM events WHERE organizerId = ? ORDER BY startDate DESC LIMIT 5").all(req.user.id);
  const result = events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  }));
  res.json(result);
}

// ── Organizer Profile ──
// organizers no longer stores fullname/phonenumber/orgName/description/logo
// — only id, userId, licenceNumber, email, createdAt. We join back to "users"
// to still return the person's name/phone alongside their organizer-specific
// fields, so the response stays as complete as before.

function getProfile(req, res) {
  const profile = db
    .prepare(
      `SELECT o.id, o.userId, o.licenceNumber, o.email, o.createdAt,
              u.fullname, u.phonenumber
       FROM organizers o
       JOIN users u ON u.id = o.userId
       WHERE o.userId = ?`
    )
    .get(req.user.id);

  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json(profile);
}

function updateProfile(req, res) {
  const { email, licenceNumber, fullname, phonenumber } = req.body;

  const current = db.prepare("SELECT * FROM organizers WHERE userId = ?").get(req.user.id);
  const currentUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  // Build updates
  const newEmail = email !== undefined && email !== null ? String(email).trim() : current.email;
  const newLicence = licenceNumber !== undefined && licenceNumber !== null ? String(licenceNumber).trim() : current.licenceNumber;
  const newName = fullname !== undefined && fullname !== null ? String(fullname).trim() : currentUser.fullname;
  const newPhone = phonenumber !== undefined && phonenumber !== null ? String(phonenumber).trim() : currentUser.phonenumber;

  if (!newName) {
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
    const orgEmailClash = db
      .prepare("SELECT id FROM organizers WHERE LOWER(TRIM(email)) = LOWER(?) AND userId != ?")
      .get(newEmail.toLowerCase(), req.user.id);
    if (orgEmailClash) {
      return res.status(409).json({ error: "Email is already in use." });
    }
  }

  if (newLicence) {
    const clash = db
      .prepare("SELECT id FROM organizers WHERE licenceNumber = ? AND userId != ?")
      .get(newLicence, req.user.id);
    if (clash) {
      return res.status(409).json({ error: "This licence number is already registered." });
    }
  }

  const phoneClash = db
    .prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?")
    .get(newPhone, req.user.id);
  if (phoneClash) {
    return res.status(409).json({ error: "Phone number is already in use." });
  }

  db.prepare("UPDATE organizers SET email = ?, licenceNumber = ? WHERE userId = ?").run(
    newEmail,
    newLicence,
    req.user.id
  );

  // Also update user's fullname and phonenumber if provided
  db.prepare("UPDATE users SET fullname = ?, phonenumber = ? WHERE id = ?").run(newName, newPhone, req.user.id);

  res.json({ message: "Profile updated." });
}

module.exports = { getStats, getRecentEvents, getProfile, updateProfile };
