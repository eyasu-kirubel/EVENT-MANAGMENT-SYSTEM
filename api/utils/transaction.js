const db = require("../database");

// ── Transaction helper ──
// node:sqlite has no built-in db.transaction(fn) like better-sqlite3 does,
// so multi-step writes that must succeed or fail together (e.g. "insert a
// user, then insert their organizer profile") are wrapped in BEGIN/COMMIT,
// rolling back automatically if anything inside throws.
function runInTransaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

module.exports = { runInTransaction };
