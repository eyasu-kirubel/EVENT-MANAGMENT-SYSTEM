const db = require("../database");
const { tokens, toPublicUser } = require("../utils/token");

// Reads the Authorization Bearer token, looks up the logged-in user, and
// attaches a safe, public-shaped copy of them to req.user.
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const data = tokens.get(auth.slice(7));
  if (!data) {
    return res.status(401).json({ error: "Invalid token" });
  }
  // Re-read the user from the DB on every request so role/status changes
  // (e.g. an admin suspending someone or editing their role) take effect
  // immediately instead of waiting for the token to expire.
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(data.id);
  if (!row) {
    return res.status(401).json({ error: "Account no longer exists" });
  }
  if (row.status === "suspended") {
    return res.status(403).json({ error: "Your account has been suspended." });
  }
  req.user = toPublicUser(row);
  next();
}

// Unchanged — still checks req.user.role. Now only ever "user" or "admin",
// since organizers also carry role = "user" under the new schema.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// Organizer permissions are driven by the isOrganizer flag on the user's own
// account, not by a separate organizer role/login. req.user always comes from
// toPublicUser(), which guarantees isOrganizer is a real boolean — so this
// checks `!== true` rather than a truthy/falsy or `!== 1` comparison.
function requireOrganizer(req, res, next) {
  if (req.user.isOrganizer !== true) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Reads the Authorization Bearer token if present and attaches req.user.
// Unlike authenticate, this does NOT return 401 when the token is missing —
// it simply leaves req.user undefined so the caller can decide what to do.
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return next();
  const data = tokens.get(auth.slice(7));
  if (!data) return next();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(data.id);
  if (!row || row.status === "suspended") return next();
  req.user = toPublicUser(row);
  next();
}

module.exports = { authenticate, optionalAuth, requireRole, requireOrganizer };
