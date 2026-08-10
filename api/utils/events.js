const db = require("../database");

function getEventAttendeeCount(eventId) {
  const row = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS total FROM booked_tickets WHERE eventId = ?").get(eventId);
  return row.total;
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
    paymentAccount: accounts.length > 0 ? accounts[0].number : event.paymentAccount || null,
    paymentAccounts: accounts,
    ticketTiers: parseTicketTiers(event),
  };
}

module.exports = { getEventAttendeeCount, parseTicketTiers, validateEventDates, decorateEvent };
