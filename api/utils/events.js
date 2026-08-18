const db = require("../database");

// The ticket TYPEs the system supports. "General" is kept only for legacy
// events/bookings that were created before the dedicated tickets table.
const VALID_TICKET_TYPES = ["Normal", "VIP", "VVIP", "General"];

// Case-insensitive alias map so "normal", "NORMAL", "Vip" etc. all normalize
// to the canonical spelling.
const TICKET_TYPE_ALIASES = { normal: "Normal", general: "General", vip: "VIP", vvip: "VVIP" };

function normalizeTicketType(value) {
  const key = String(value == null ? "" : value).trim().toLowerCase();
  if (TICKET_TYPE_ALIASES[key]) return TICKET_TYPE_ALIASES[key];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
}

function isValidTicketType(value) {
  return VALID_TICKET_TYPES.includes(normalizeTicketType(value));
}

function getEventAttendeeCount(eventId) {
  const row = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM booked_tickets WHERE eventId = ?").get(eventId);
  return row.total;
}

// Every ticket-TYPE row offered for an event, from the tickets table.
function getEventTickets(eventId) {
  return db.prepare("SELECT * FROM tickets WHERE eventId = ? ORDER BY id ASC").all(eventId);
}

// JSON shape the legacy events.ticketTiers column used, rebuilt from ticket
// rows so old readers still see tiers and nothing depends on both sources
// disagreeing.
function ticketsToJson(tickets) {
  return (tickets || []).map((t) => ({
    name: t.ticketType,
    price: Number(t.price) || 0,
    capacity: Number(t.quantity) || 0,
  }));
}

function parseTicketTiers(event) {
  if (!event) return [];
  try {
    const parsed = JSON.parse(event.ticketTiers || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function validateEventDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
    return "Invalid date. Use YYYY-MM-DD.";
  }
  if (endDate < startDate) {
    return "End date must be the same as or after the start date.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(startDate) < today) {
    return "Start date cannot be in the past.";
  }
  return null;
}

function decorateEvent(event) {
  if (!event) return event;
  let accounts = [];
  try {
    const parsed = JSON.parse(event.paymentAccounts || "[]");
    if (Array.isArray(parsed)) accounts = parsed;
  } catch {}
  return {
    ...event,
    visibility: event.visibility || "public",
    paymentAccount: accounts.length > 0 ? accounts[0].number : event.paymentAccount || null,
    paymentAccounts: accounts,
    ticketTiers: parseTicketTiers(event),
    tickets: getEventTickets(event.id),
  };
}

module.exports = {
  getEventAttendeeCount,
  parseTicketTiers,
  validateEventDates,
  decorateEvent,
  VALID_TICKET_TYPES,
  normalizeTicketType,
  isValidTicketType,
  getEventTickets,
  ticketsToJson,
};
