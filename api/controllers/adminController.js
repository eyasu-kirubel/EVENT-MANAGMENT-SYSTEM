const db = require("../database");
const { runInTransaction } = require("../utils/transaction");
const { getEventAttendeeCount, decorateEvent } = require("../utils/events");

// ── Admin: Organizer Management ──

function getOrganizers(req, res) {
  // organizers no longer carries identity fields itself, so we join to
  // users for fullname/phonenumber.
  const orgs = db
    .prepare(
      `SELECT o.id, o.userId, u.fullname, u.phonenumber, o.licenceNumber, o.email, o.createdAt
       FROM organizers o
       JOIN users u ON u.id = o.userId
       ORDER BY o.createdAt DESC`
    )
    .all();
  res.json(orgs);
}

function deleteOrganizer(req, res) {
  const organizer = db.prepare("SELECT * FROM organizers WHERE id = ?").get(req.params.id);
  if (!organizer) {
    return res.status(404).json({ error: "Organizer not found." });
  }

  runInTransaction(() => {
    db.prepare("DELETE FROM events WHERE organizerId = ?").run(organizer.userId);
    db.prepare("DELETE FROM organizers WHERE id = ?").run(organizer.id);
    db.prepare("UPDATE users SET isOrganizer = 0 WHERE id = ?").run(organizer.userId);
  });

  res.json({ message: "Organizer deleted." });
}

// ── Admin ──

function getStats(req, res) {
  // totalUsers now specifically means "plain users who are not organizers",
  // so it keeps meaning what it always meant, even though organizers also
  // technically have role = 'user' now. totalOrganizers is unaffected —
  // it's still just a row count of the organizers table.
  const totalUsers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'user' AND isOrganizer = 0").get().c;
  const totalOrganizers = db.prepare("SELECT COUNT(*) AS c FROM organizers").get().c;
  const totalEvents = db.prepare("SELECT COUNT(*) AS c FROM events").get().c;
  const pendingEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Pending'").get().c;
  const approvedEvents = db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'Approved'").get().c;
  const totalTickets = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS c FROM booked_tickets").get().c;

  res.json({ totalUsers, totalOrganizers, totalEvents, pendingEvents, approvedEvents, totalTickets });
}

// Tickets sold broken down per event, with the organizer's name, capacity and
// the revenue (quantity × price). Used by the admin "Tickets by Event" page.
function getTicketsPerEvent(req, res) {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.category, e.location, e.startDate, e.capacity, e.price,
              u.fullname AS organizerName,
              COALESCE(SUM(bt.quantity), 0) AS ticketsSold,
              ROUND(COALESCE(SUM(bt.quantity * bt.unitPrice), 0), 2) AS revenue
       FROM events e
       JOIN users u ON u.id = e.organizerId
       LEFT JOIN booked_tickets bt ON bt.eventId = e.id
       GROUP BY e.id
       ORDER BY ticketsSold DESC, e.startDate ASC`
    )
    .all();

  // Per-section breakdown for each event.
  const tierRows = db.prepare(
    `SELECT eventId, tier, COALESCE(SUM(quantity), 0) AS sold,
            ROUND(COALESCE(SUM(quantity * unitPrice), 0), 2) AS revenue
     FROM booked_tickets GROUP BY eventId, tier`
  ).all();
  const tierMap = {};
  for (const r of tierRows) {
    if (!tierMap[r.eventId]) tierMap[r.eventId] = [];
    tierMap[r.eventId].push({ name: r.tier, sold: r.sold, revenue: r.revenue });
  }

  res.json(rows.map((r) => ({ ...r, tiers: tierMap[r.id] || [] })));
}

function getUsers(req, res) {
  // isOrganizer added to the SELECT (additive, non-breaking) so the admin
  // panel can tell organizers apart from plain users in this same list.
  const users = db
    .prepare(
      `SELECT u.id, u.fullname, u.phonenumber, u.email, u.birthDate, u.role, u.isOrganizer, u.status,
              (SELECT COUNT(*) FROM events e WHERE e.organizerId = u.id) AS eventsCreated,
              (SELECT COALESCE(SUM(quantity), 0) FROM booked_tickets bt WHERE bt.userId = u.id) AS ticketsBooked
       FROM users u
       ORDER BY u.id ASC`
    )
    .all()
    .map((u) => ({ ...u, isOrganizer: !!u.isOrganizer }));

  res.json(users);
}

function updateUserRole(req, res) {
  const { role } = req.body; // "user" | "organizer" | "admin"
  if (!["user", "organizer", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }
  const target = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  // Demoting/removing the last admin (or self-demotion) could lock everyone
  // out of the panel, so block both.
  if (target.role === "admin" && role !== "admin") {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You cannot change your own role." });
    }
    const adminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
    if (adminCount <= 1) {
      return res.status(400).json({ error: "At least one admin must remain." });
    }
  }
  if (role === "organizer") {
    db.prepare("UPDATE users SET role = 'user', isOrganizer = 1 WHERE id = ?").run(req.params.id);
  } else if (role === "admin") {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(req.params.id);
  } else {
    db.prepare("UPDATE users SET role = 'user', isOrganizer = 0 WHERE id = ?").run(req.params.id);
  }
  res.json({ message: "Role updated." });
}

function updateUser(req, res) {
  const { fullname, phonenumber, email } = req.body;
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  if (!fullname || !fullname.trim()) {
    return res.status(400).json({ error: "Full name is required." });
  }
  if (!phonenumber || !phonenumber.trim()) {
    return res.status(400).json({ error: "Phone number is required." });
  }
  const phoneTaken = db.prepare("SELECT id FROM users WHERE phonenumber = ? AND id != ?").get(phonenumber.trim(), req.params.id);
  if (phoneTaken) {
    return res.status(409).json({ error: "This phone number is already in use." });
  }
  db.prepare("UPDATE users SET fullname = ?, phonenumber = ?, email = ? WHERE id = ?").run(
    fullname.trim(),
    phonenumber.trim(),
    (email || "").trim(),
    req.params.id
  );
  res.json({ message: "User updated." });
}

function updateUserStatus(req, res) {
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "You cannot suspend your own account." });
  }
  const target = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!target) {
    return res.status(404).json({ error: "User not found." });
  }
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ message: status === "suspended" ? "User suspended." : "User activated." });
}

function deleteUser(req, res) {
  // A single delete is now enough: PRAGMA foreign_keys = ON (set in
  // database.js) plus ON DELETE CASCADE on organizers.userId,
  // events.organizerId, and booked_tickets.userId/eventId means SQLite
  // automatically removes this user's organizer profile (if any), every
  // event they organized (and, transitively, everyone else's tickets to
  // those events), and every ticket they personally booked.
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ message: "User deleted." });
}

// Full list of every event (all statuses) for the admin dashboard.
function getEvents(req, res) {
  const events = db
    .prepare(
      `SELECT e.*, u.fullname AS organizerName
       FROM events e
       JOIN users u ON u.id = e.organizerId
       ORDER BY e.startDate DESC`
    )
    .all();
  res.json(events.map((e) => decorateEvent({
    ...e,
    ticketsSold: getEventAttendeeCount(e.id),
  })));
}

function getPendingEvents(req, res) {
  // Simplified: since events.organizerId is now a users.id directly, the
  // organizer's name comes straight from "users" — the old join through
  // "organizers" is no longer necessary at all.
  const events = db.prepare(
    `SELECT e.id, e.title, e.category, e.location, e.startDate, e.endDate, e.capacity,
            u.fullname AS organizerName
     FROM events e
     JOIN users u ON u.id = e.organizerId
     WHERE e.status = 'Pending'
     ORDER BY e.startDate ASC`
  ).all();
  res.json(events);
}

function approveEvent(req, res) {
  db.prepare("UPDATE events SET status = 'Approved' WHERE id = ?").run(req.params.id);
  res.json({ message: "Event approved." });
}

function rejectEvent(req, res) {
  db.prepare("UPDATE events SET status = 'Rejected' WHERE id = ?").run(req.params.id);
  res.json({ message: "Event rejected." });
}

module.exports = {
  getOrganizers,
  deleteOrganizer,
  getStats,
  getTicketsPerEvent,
  getUsers,
  updateUserRole,
  updateUser,
  updateUserStatus,
  deleteUser,
  getEvents,
  getPendingEvents,
  approveEvent,
  rejectEvent,
};
