const crypto = require("node:crypto");

// In-memory token store. Preserved as-is from the original single-file
// backend so existing issued tokens keep working unchanged.
const tokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Shapes a "users" row into the safe object we hand back to the client and
// store against a token. Centralized here so every place that issues a
// token (register, login) stays in sync automatically.
function toPublicUser(userRow) {
  return {
    id: userRow.id,
    fullname: userRow.fullname,
    phonenumber: userRow.phonenumber,
    email: userRow.email,
    role: userRow.role,
    isOrganizer: !!userRow.isOrganizer, // stored as 0/1 in SQLite, exposed as true/false over the API
  };
}

module.exports = { tokens, generateToken, toPublicUser };
