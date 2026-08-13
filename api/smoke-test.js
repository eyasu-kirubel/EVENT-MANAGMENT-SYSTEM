// Smoke test — runs against a live server on :3000.
// NODE_ENV=test puts utils/email.js in test mode: no real Resend emails are
// sent, and codes are recorded to a git-ignored outbox file this test reads.
process.env.NODE_ENV = "test";

const BASE = "http://localhost:3000";
const { getTestCode, clearTestOutbox } = require("./utils/email");
const { hashCode } = require("./utils/code");
const db = require("./database");

let failures = 0;
let passed = 0;

function check(name, ok, extra) {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${extra !== undefined ? "  -> " + JSON.stringify(extra) : ""}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, res };
}

const register = (body) => req("POST", "/auth/register", { body });
const login = (phonenumber, password) => req("POST", "/auth/login", { body: { phonenumber, password } });
const verifyEmail = (email, code) => req("POST", "/auth/verify-email", { body: { email, code } });

(async () => {
  clearTestOutbox();

  const stamp = Date.now().toString().slice(-8);
  const userPhone = "091" + stamp;
  const orgPhone = "092" + stamp;
  const org2Phone = "093" + stamp;
  const unverPhone = "094" + stamp;
  const expPhone = "095" + stamp;
  const resendPhone = "096" + stamp;
  const coolPhone = "097" + stamp;
  const resPhone = "098" + stamp;
  const licence = "LIC" + stamp;
  const emailOf = (k) => `${k}${stamp}@example.com`;
  const userEmail = emailOf("user");
  const orgEmail = emailOf("org");
  const org2Email = emailOf("org2");
  const unverEmail = emailOf("unver");
  const expEmail = emailOf("exp");
  const resendEmail = emailOf("resend");
  const coolEmail = emailOf("cool");
  const resEmail = emailOf("res");

  const testUsers = [];
  const trackUser = (phonenumber) => {
    const id = db.prepare("SELECT id FROM users WHERE phonenumber = ?").get(phonenumber).id;
    testUsers.push({ id, phonenumber });
    return id;
  };

  // Baseline snapshots captured at the start; at the end we assert nothing was
  // left behind, without assuming anything about the current real data.
  const before = {
    users: db.prepare("SELECT COUNT(*) c FROM users").get().c,
    events: db.prepare("SELECT COUNT(*) c FROM events").get().c,
    tickets: db.prepare("SELECT COUNT(*) c FROM booked_tickets").get().c,
    ticketTypes: db.prepare("SELECT COUNT(*) c FROM tickets").get().c,
  };
  const testEvents = [];
  const existingPhone = db.prepare("SELECT phonenumber FROM users ORDER BY id LIMIT 1").get()?.phonenumber;
  const existingEventId = db.prepare("SELECT id FROM events ORDER BY id LIMIT 1").get()?.id ?? 1;

  // ---- AUTH ----
  let r = await req("GET", `/auth/check-phone/${userPhone}`);
  check("GET /auth/check-phone/:phonenumber (new -> exists:false)", r.status === 200 && r.data.exists === false, r);

  r = await req("GET", `/auth/check-phone/${existingPhone}`);
  check("GET /auth/check-phone/:phonenumber (existing -> exists:true)", r.status === 200 && r.data.exists === true, r);

  r = await req("GET", `/auth/check-licence/${licence}`);
  check("GET /auth/check-licence/:licenceNumber (new)", r.status === 200 && r.data.exists === false, r);

  r = await req("GET", `/auth/check-email/test${stamp}@example.com`);
  check("GET /auth/check-email/:email (new)", r.status === 200 && r.data.exists === false, r);

  // ---- EMAIL VERIFICATION: plain user ----
  r = await register({ fullname: "Smoke User", phonenumber: userPhone, password: "secret123", birthDate: "2000-01-01", email: userEmail });
  check("POST /auth/register (user)", r.status === 201 && r.data.emailVerificationRequired === true && !r.data.token && !r.data.code, r.data);

  // Unverified user must NOT be able to log in
  r = await login(userPhone, "secret123");
  check("POST /auth/login (unverified -> 403)", r.status === 403 && /verify your email/i.test(r.data.error), r.data);

  const userCode = getTestCode(userEmail);
  check("verification code recorded for test outbox", !!userCode, userCode);

  // Wrong code -> rejected
  r = await verifyEmail(userEmail, userCode === "000000" ? "111111" : "000000");
  check("POST /auth/verify-email (wrong code -> 400)", r.status === 400, r.data);

  // Correct code -> verified
  r = await verifyEmail(userEmail, userCode);
  check("POST /auth/verify-email (correct code)", r.status === 200 && r.data.message, r.data);

  // Reuse -> rejected
  r = await verifyEmail(userEmail, userCode);
  check("POST /auth/verify-email (reuse -> 400)", r.status === 400, r.data);

  // Unknown email -> rejected
  r = await verifyEmail(`nobody${stamp}@example.com`, "123456");
  check("POST /auth/verify-email (unknown email -> 400)", r.status === 400, r.data);

  // Now login works
  r = await login(userPhone, "secret123");
  check("POST /auth/login (user)", r.status === 200 && r.data.token && r.data.user.isOrganizer === false, r.data);
  const userToken = r.data.token;
  const userId = r.data.user.id;
  trackUser(userPhone);

  r = await login(userPhone, "wrong");
  check("POST /auth/login bad password", r.status === 401, r.data);

  // ---- UNVERIFIED ACCOUNT: login stays blocked ----
  r = await register({ fullname: "Unver", phonenumber: unverPhone, password: "secret123", birthDate: "2000-01-01", email: unverEmail });
  check("POST /auth/register (unver user -> 201)", r.status === 201, r.data);
  trackUser(unverPhone);
  r = await login(unverPhone, "secret123");
  check("POST /auth/login (still unverified -> 403)", r.status === 403, r.data);

  // ---- EXPIRED VERIFICATION CODE ----
  r = await register({ fullname: "Exp User", phonenumber: expPhone, password: "secret123", birthDate: "2000-01-01", email: expEmail });
  const expId = trackUser(expPhone);
  db.prepare("INSERT INTO email_verifications (userId, codeHash, expiresAt, used, createdAt) VALUES (?, ?, ?, 0, ?)").run(
    expId,
    hashCode("123456"),
    new Date(Date.now() - 1000).toISOString(),
    new Date(Date.now() - 5 * 60 * 1000).toISOString()
  );
  r = await verifyEmail(expEmail, "123456");
  check("POST /auth/verify-email (expired code -> 400)", r.status === 400 && /expired/i.test(r.data.error), r.data);

  // ---- RESEND VERIFICATION ----
  r = await register({ fullname: "Resend User", phonenumber: resendPhone, password: "secret123", birthDate: "2000-01-01", email: resendEmail });
  const resendId = trackUser(resendPhone);
  const code1 = getTestCode(resendEmail);
  check("first verification code recorded", !!code1, code1);
  // Drop the registration code so the resend is not blocked by the 60s cooldown
  db.prepare("DELETE FROM email_verifications WHERE userId = ?").run(resendId);

  r = await req("POST", "/auth/resend-verification", { body: { email: resendEmail } });
  check("POST /auth/resend-verification", r.status === 200, r.data);
  const code2 = getTestCode(resendEmail);
  check("resend issued a NEW code", !!code2 && code2 !== code1, { code1, code2 });

  // Old code must no longer work, new code must work
  r = await verifyEmail(resendEmail, code1);
  check("POST /auth/verify-email (old code after resend -> 400)", r.status === 400, r.data);
  r = await verifyEmail(resendEmail, code2);
  check("POST /auth/verify-email (new code after resend)", r.status === 200, r.data);

  // Resend on an already-verified account -> rejected
  r = await req("POST", "/auth/resend-verification", { body: { email: resendEmail } });
  check("POST /auth/resend-verification (already verified -> 400)", r.status === 400, r.data);

  // Resend on unknown email -> 404
  r = await req("POST", "/auth/resend-verification", { body: { email: `ghost${stamp}@example.com` } });
  check("POST /auth/resend-verification (unknown email -> 404)", r.status === 404, r.data);

  // ---- COOLDOWN ----
  r = await register({ fullname: "Cool User", phonenumber: coolPhone, password: "secret123", birthDate: "2000-01-01", email: coolEmail });
  const coolId = trackUser(coolPhone);
  db.prepare("DELETE FROM email_verifications WHERE userId = ?").run(coolId);
  await req("POST", "/auth/resend-verification", { body: { email: coolEmail } });
  r = await req("POST", "/auth/resend-verification", { body: { email: coolEmail } });
  check("POST /auth/resend-verification (cooldown -> 429)", r.status === 429, r.data);

  // ---- REGISTER ORGANIZER ----
  r = await register({ fullname: "Smoke Org", phonenumber: orgPhone, password: "secret123", birthDate: "1990-01-01", email: orgEmail, isOrganizer: true, licenceNumber: licence });
  check("POST /auth/register (organizer)", r.status === 201 && r.data.emailVerificationRequired === true, r.data);
  r = await req("GET", `/auth/check-licence/${licence}`);
  check("GET /auth/check-licence/:licenceNumber (existing)", r.status === 200 && r.data.exists === true, r);
  r = await verifyEmail(orgEmail, getTestCode(orgEmail));
  check("POST /auth/verify-email (organizer)", r.status === 200, r.data);
  r = await login(orgPhone, "secret123");
  check("POST /auth/login (organizer)", r.status === 200 && r.data.token && r.data.user.isOrganizer === true, r.data);
  const orgToken = r.data.token;
  const orgUserId = r.data.user.id;
  trackUser(orgPhone);

  // ---- REGISTER ORGANIZER VIA LEGACY role:"organizer" ----
  r = await register({ fullname: "Smoke Org2", phonenumber: org2Phone, password: "secret123", birthDate: "1991-01-01", email: org2Email, role: "organizer", licenceNumber: "LIC2" + stamp });
  check("POST /auth/register (organizer via role field)", r.status === 201 && r.data.emailVerificationRequired === true, r.data);
  r = await verifyEmail(org2Email, getTestCode(org2Email));
  check("POST /auth/verify-email (legacy organizer)", r.status === 200, r.data);
  r = await login(org2Phone, "secret123");
  check("POST /auth/login (legacy organizer)", r.status === 200 && r.data.user.isOrganizer === true, r.data);
  const org2Token = r.data.token;
  const org2UserId = r.data.user.id;
  trackUser(org2Phone);

  // ---- ADMIN LOGIN (existing admin was backfilled to verified) ----
  r = await login("0900000000", "admin123");
  check("POST /auth/login (admin)", r.status === 200 && r.data.token && r.data.user.role === "admin", r.data);
  const adminToken = r.data.token;

  // ---- FORGOT / RESET PASSWORD ----
  r = await req("POST", "/auth/forgot-password", { body: { email: userEmail } });
  check("POST /auth/forgot-password (registered email)", r.status === 200 && r.data.message && !r.data.code, r.data);

  r = await req("POST", "/auth/forgot-password", { body: { email: `ghost${stamp}@example.com` } });
  check("POST /auth/forgot-password (unregistered email, generic response)", r.status === 200 && r.data.message && !r.data.code, r.data);

  const resetCode = getTestCode(userEmail);
  check("password reset code recorded for test outbox", !!resetCode, resetCode);

  // Wrong reset code -> rejected
  r = await req("POST", "/auth/verify-reset-code", { body: { email: userEmail, code: resetCode === "000000" ? "111111" : "000000" } });
  check("POST /auth/verify-reset-code (wrong code -> 400)", r.status === 400, r.data);

  // Correct reset code -> short-lived reset token
  r = await req("POST", "/auth/verify-reset-code", { body: { email: userEmail, code: resetCode } });
  check("POST /auth/verify-reset-code (correct -> resetToken)", r.status === 200 && r.data.resetToken, r.data);
  const resetToken = r.data.resetToken;

  // Reset the password
  r = await req("POST", "/auth/reset-password", { body: { resetToken, newPassword: "newsecret123" } });
  check("POST /auth/reset-password", r.status === 200, r.data);

  // Old password rejected, new password works
  r = await login(userPhone, "secret123");
  check("POST /auth/login (old password -> 401)", r.status === 401, r.data);
  r = await login(userPhone, "newsecret123");
  check("POST /auth/login (new password)", r.status === 200 && r.data.token, r.data);

  // Reset code can't be reused
  r = await req("POST", "/auth/verify-reset-code", { body: { email: userEmail, code: resetCode } });
  check("POST /auth/verify-reset-code (reuse -> 400)", r.status === 400, r.data);

  // Bogus reset token rejected
  r = await req("POST", "/auth/reset-password", { body: { resetToken: "bogus-token", newPassword: "whatever123" } });
  check("POST /auth/reset-password (bad token -> 400)", r.status === 400, r.data);

  // ---- EXPIRED RESET CODE ----
  r = await register({ fullname: "Res User", phonenumber: resPhone, password: "secret123", birthDate: "2000-01-01", email: resEmail });
  const resId = trackUser(resPhone);
  await req("POST", "/auth/forgot-password", { body: { email: resEmail } });
  db.prepare("INSERT INTO password_resets (userId, codeHash, expiresAt, used, createdAt) VALUES (?, ?, ?, 0, ?)").run(
    resId,
    hashCode("654321"),
    new Date(Date.now() - 1000).toISOString(),
    new Date(Date.now() - 5 * 60 * 1000).toISOString()
  );
  r = await req("POST", "/auth/verify-reset-code", { body: { email: resEmail, code: "654321" } });
  check("POST /auth/verify-reset-code (expired code -> 400)", r.status === 400 && /expired/i.test(r.data.error), r.data);

  // ---- EVENTS (public) ----
  r = await req("GET", "/events");
  check("GET /events", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", `/events/${existingEventId}`);
  check("GET /events/:id", r.status === 200 && r.data.id === existingEventId && r.data.tierSales !== undefined, r.data);

  r = await req("GET", "/events/999999");
  check("GET /events/:id (missing -> 404)", r.status === 404, r.data);

  // my-events authz: plain user must get 403
  r = await req("GET", "/events/organizer/my-events", { token: userToken });
  check("GET /events/organizer/my-events (user -> 403)", r.status === 403, r.data);

  // ---- EVENT CREATION / UPDATE / DELETE (organizer) ----
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const later = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  r = await req("POST", "/events", {
    token: orgToken,
    body: {
      title: "Smoke Event " + stamp, description: "desc", category: "Music", location: "Addis",
      price: 500, capacity: 100, startDate: future, endDate: later,
      paymentAccounts: [{ method: "Telebirr", number: "0911223344" }],
      ticketTiers: [{ name: "VIP", price: 1000, capacity: 20 }],
    },
  });
  check("POST /events", r.status === 201 && r.data.status === "Pending", r.data);
  const newEventId = r.data.id;
  testEvents.push(newEventId);

  r = await req("POST", "/events", { token: userToken, body: { title: "x", location: "y", capacity: 5, startDate: future, endDate: later } });
  check("POST /events (non-organizer -> 403)", r.status === 403, r.data);

  // Admin approve BEFORE editing so tiers stay intact for booking tests
  r = await req("PUT", `/admin/events/${newEventId}/approve`, { token: adminToken });
  check("PUT /admin/events/:id/approve", r.status === 200, r.data);

  r = await req("GET", `/events/${newEventId}`);
  check("GET /events/:id (newly approved)", r.status === 200 && r.data.status === "Approved", r.data);

  // ---- TICKETS ----
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: newEventId, quantity: 1, tier: "VIP" } });
  check("POST /tickets/book (VIP tier)", r.status === 201 && r.data.unitPrice === 1000, r.data);
  const bookingId = r.data.bookingId;

  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: newEventId, quantity: 1, tier: "NoSuchTier" } });
  check("POST /tickets/book (unknown tier -> 400)", r.status === 400 && r.data.error === "Unknown ticket section.", r.data);

  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: 999999, quantity: 1 } });
  check("POST /tickets/book (missing event -> 404)", r.status === 404, r.data);

  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: newEventId, quantity: 1, tier: "VIP" } });
  check("POST /tickets/book (VIP #2)", r.status === 201 && r.data.unitPrice === 1000, r.data);

  r = await req("GET", "/tickets/my", { token: userToken });
  check("GET /tickets/my", r.status === 200 && Array.isArray(r.data) && r.data.length >= 2, r.data);

  r = await req("GET", `/tickets/${bookingId}/qr`, { token: userToken });
  check("GET /tickets/:id/qr (svg)", r.status === 200, { status: r.status, type: r.res.headers.get("content-type") });

  r = await req("DELETE", `/tickets/${bookingId}`, { token: userToken });
  check("DELETE /tickets/:id", r.status === 200, r.data);

  // Now update the event (keeps the VIP type so the edit path is tested
  // without trying to remove a ticket type that already has sales).
  r = await req("PUT", `/events/${newEventId}`, {
    token: orgToken,
    body: { title: "Smoke Event UPD " + stamp, description: "desc2", category: "Tech", location: "Bole", price: 600, capacity: 120, startDate: future, endDate: later, paymentAccounts: [{ method: "CBE", number: "100020003000" }], ticketTiers: [{ name: "VIP", price: 1200, capacity: 120 }] },
  });
  check("PUT /events/:id", r.status === 200 && r.data.message, r.data);

  // Removing a ticket type that already has sales must be rejected.
  r = await req("PUT", `/events/${newEventId}`, {
    token: orgToken,
    body: { title: "Smoke Event UPD " + stamp, description: "desc2", category: "Tech", location: "Bole", price: 600, capacity: 120, startDate: future, endDate: later, paymentAccounts: [{ method: "CBE", number: "100020003000" }], ticketTiers: [] },
  });
  check("PUT /events/:id (removing sold ticket type -> 400)", r.status === 400 && /cannot be removed/i.test(r.data.error), r.data);

  // ---- TICKET TYPE ARCHITECTURE (tickets table) ----
  const tArch = async (body) => req("POST", "/events", { token: orgToken, body });

  // 1) Create an event with all three ticket types.
  r = await tArch({
    title: "Ticket Arch Event " + stamp, description: "tiers", category: "Tech", location: "Bole",
    price: 0, capacity: 650, startDate: future, endDate: later,
    paymentAccounts: [{ method: "Telebirr", number: "0911223344" }],
    tickets: [
      { ticketType: "Normal", price: 100, quantity: 500, description: "Standard entry" },
      { ticketType: "VIP", price: 300, quantity: 100, description: "VIP access" },
      { ticketType: "VVIP", price: 500, quantity: 50, description: "Premium access" },
    ],
  });
  check("POST /events (all three ticket types)", r.status === 201 && r.data.status === "Pending", r.data);
  const archEventId = r.data.id;
  testEvents.push(archEventId);

  // 2) Duplicate ticket type in one create -> rejected.
  r = await tArch({ title: "Dup Event " + stamp, location: "Addis", capacity: 10, startDate: future, endDate: later, tickets: [{ ticketType: "Normal", price: 1, quantity: 5 }, { ticketType: "Normal", price: 2, quantity: 5 }] });
  check("POST /events (duplicate ticket type -> 400)", r.status === 400 && /duplicate/i.test(r.data.error), r.data);

  // 3) Invalid price / quantity / type -> rejected.
  r = await tArch({ title: "Neg Event " + stamp, location: "Addis", capacity: 10, startDate: future, endDate: later, tickets: [{ ticketType: "Normal", price: -1, quantity: 5 }] });
  check("POST /events (negative price -> 400)", r.status === 400, r.data);
  r = await tArch({ title: "Neg Qty " + stamp, location: "Addis", capacity: 10, startDate: future, endDate: later, tickets: [{ ticketType: "Normal", price: 1, quantity: -5 }] });
  check("POST /events (negative quantity -> 400)", r.status === 400, r.data);
  r = await tArch({ title: "Bad Type " + stamp, location: "Addis", capacity: 10, startDate: future, endDate: later, tickets: [{ ticketType: "Platinum", price: 1, quantity: 5 }] });
  check("POST /events (invalid ticket type -> 400)", r.status === 400, r.data);

  // 4) Single-type events: Normal, VIP, VVIP each.
  r = await tArch({ title: "Normal-Only " + stamp, location: "Addis", capacity: 30, startDate: future, endDate: later, tickets: [{ ticketType: "Normal", price: 50, quantity: 20 }] });
  check("POST /events (Normal-only)", r.status === 201, r.data);
  const normalOnlyId = r.data.id;
  testEvents.push(normalOnlyId);
  r = await tArch({ title: "VIP-Only " + stamp, location: "Addis", capacity: 30, startDate: future, endDate: later, tickets: [{ ticketType: "VIP", price: 80, quantity: 20 }] });
  check("POST /events (VIP-only)", r.status === 201, r.data);
  testEvents.push(r.data.id);
  r = await tArch({ title: "VVIP-Only " + stamp, location: "Addis", capacity: 30, startDate: future, endDate: later, tickets: [{ ticketType: "VVIP", price: 120, quantity: 20 }] });
  check("POST /events (VVIP-only)", r.status === 201, r.data);
  testEvents.push(r.data.id);

  // Approve the two events used for booking tests.
  r = await req("PUT", `/admin/events/${archEventId}/approve`, { token: adminToken });
  check("PUT /admin/events/:id/approve (ticket-arch event)", r.status === 200, r.data);
  r = await req("PUT", `/admin/events/${normalOnlyId}/approve`, { token: adminToken });
  check("PUT /admin/events/:id/approve (normal-only event)", r.status === 200, r.data);

  // Approved event now exposes its tickets rows via GET /events/:id.
  r = await req("GET", `/events/${archEventId}`);
  const archTickets = r.data.tickets || [];
  const normalT = archTickets.find((t) => t.ticketType === "Normal");
  const vipT = archTickets.find((t) => t.ticketType === "VIP");
  const vvipT = archTickets.find((t) => t.ticketType === "VVIP");
  check("GET /events/:id exposes tickets rows", archTickets.length === 3 && normalT && vipT && vvipT, archTickets);
  check("ticket type prices from DB", normalT && normalT.price === 100 && vipT && vipT.price === 300 && vvipT && vvipT.price === 500, archTickets);
  check("ticket type quantities from DB", normalT && normalT.quantity === 500 && vvipT && vvipT.quantity === 50, archTickets);

  // 5) Book Normal by ticketId; server price is authoritative.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: archEventId, quantity: 1, ticketId: normalT.id, paymentMethod: "Telebirr", paidTo: "0911223344" } });
  check("POST /tickets/book (Normal by ticketId)", r.status === 201 && r.data.unitPrice === 100, r.data);
  const normalBookingId = r.data.bookingId;

  // 6) Frontend cannot manipulate the price: a fake price in the body is ignored.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: archEventId, quantity: 1, ticketId: normalT.id, price: 1 } });
  check("POST /tickets/book (client price ignored)", r.status === 201 && r.data.unitPrice === 100, r.data);

  // 7) Book VIP and VVIP by ticketId.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: archEventId, quantity: 1, ticketId: vipT.id } });
  check("POST /tickets/book (VIP by ticketId)", r.status === 201 && r.data.unitPrice === 300, r.data);
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: archEventId, quantity: 1, ticketId: vvipT.id } });
  check("POST /tickets/book (VVIP by ticketId)", r.status === 201 && r.data.unitPrice === 500, r.data);
  const vvipBookingId = r.data.bookingId;

  // 8) Book with ticketId from another event -> rejected.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: normalOnlyId, quantity: 1, ticketId: normalT.id } });
  check("POST /tickets/book (ticket of another event -> 400)", r.status === 400, r.data);

  // 9) Overselling prevented.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: archEventId, quantity: 1000, ticketId: normalT.id } });
  check("POST /tickets/book (oversell -> 400)", r.status === 400 && /left/i.test(r.data.error), r.data);

  // 10) soldQuantity incremented / remaining correct.
  r = await req("GET", `/events/${archEventId}`);
  const archTickets2 = r.data.tickets || [];
  const normalT2 = archTickets2.find((t) => t.ticketType === "Normal");
  const vvipT2 = archTickets2.find((t) => t.ticketType === "VVIP");
  check("soldQuantity incremented (Normal=2)", normalT2 && normalT2.soldQuantity === 2, normalT2);
  check("remaining quantity correct (Normal=498)", normalT2 && (normalT2.quantity - normalT2.soldQuantity) === 498, normalT2);
  check("soldQuantity incremented (VVIP=1)", vvipT2 && vvipT2.soldQuantity === 1, vvipT2);

  // 11) Cancel a booking returns the capacity (soldQuantity decremented).
  r = await req("DELETE", `/tickets/${vvipBookingId}`, { token: userToken });
  check("DELETE /tickets/:id (ticket-arch booking)", r.status === 200, r.data);
  r = await req("GET", `/events/${archEventId}`);
  const vvipT3 = (r.data.tickets || []).find((t) => t.ticketType === "VVIP");
  check("cancel decremented soldQuantity (VVIP=0)", vvipT3 && vvipT3.soldQuantity === 0, vvipT3);

  // 12) QR + attendance on a tickets-table booking (unique per purchase).
  r = await req("GET", `/tickets/${normalBookingId}/qr`, { token: userToken });
  check("GET /tickets/:id/qr (ticket-arch svg)", r.status === 200 && r.res.headers.get("content-type").includes("svg"), { status: r.status });
  const scanPayload2 = JSON.stringify({ ticketId: normalBookingId, eventId: archEventId, userId, event: "Ticket Arch Event", attendee: "y", phone: "z", date: "2026-01-01", qty: 1, tier: "Normal", ts: "2026-01-01T00:00:00Z" });
  r = await req("POST", "/attendance/scan", { token: orgToken, body: { qrData: scanPayload2 } });
  check("POST /attendance/scan (ticket-arch success)", r.status === 200 && r.data.status === "success", r.data);
  r = await req("POST", "/attendance/scan", { token: orgToken, body: { qrData: scanPayload2 } });
  check("POST /attendance/scan (ticket-arch duplicate rejected)", r.status === 200 && r.data.status === "duplicate", r.data);

  // 13) Ticket management endpoints.
  // Add a VIP type to the Normal-only event.
  r = await req("POST", `/events/${normalOnlyId}/tickets`, { token: orgToken, body: { ticketType: "VIP", price: 150, quantity: 10, description: "VIP seat" } });
  check("POST /events/:id/tickets (add VIP)", r.status === 201 && r.data.ticketType === "VIP", r.data);
  const normalOnlyVip = r.data;
  // Duplicate add -> 409.
  r = await req("POST", `/events/${normalOnlyId}/tickets`, { token: orgToken, body: { ticketType: "VIP", price: 150, quantity: 10 } });
  check("POST /events/:id/tickets (duplicate -> 409)", r.status === 409, r.data);
  // Invalid price on add -> 400.
  r = await req("POST", `/events/${normalOnlyId}/tickets`, { token: orgToken, body: { ticketType: "VVIP", price: -5, quantity: 10 } });
  check("POST /events/:id/tickets (negative price -> 400)", r.status === 400, r.data);
  // Update the VIP type (capacity 30 = 20 Normal + 10 VIP max).
  r = await req("PUT", `/events/${normalOnlyId}/tickets/${normalOnlyVip.id}`, { token: orgToken, body: { price: 200, quantity: 5 } });
  check("PUT /events/:id/tickets/:ticketId (update VIP)", r.status === 200 && r.data.price === 200 && r.data.quantity === 5, r.data);
  // Book that VIP so the type has a sale, then deletion must be rejected.
  r = await req("POST", "/tickets/book", { token: userToken, body: { eventId: normalOnlyId, quantity: 1, ticketId: normalOnlyVip.id } });
  check("POST /tickets/book (VIP on normal-only event)", r.status === 201 && r.data.unitPrice === 200, r.data);
  const normalOnlyVipBooking = r.data.bookingId;
  r = await req("DELETE", `/events/${normalOnlyId}/tickets/${normalOnlyVip.id}`, { token: orgToken });
  check("DELETE /events/:id/tickets/:ticketId (sold type -> 400)", r.status === 400 && /already sold/i.test(r.data.error), r.data);
  // Cancel the booking, then the type can be deleted.
  r = await req("DELETE", `/tickets/${normalOnlyVipBooking}`, { token: userToken });
  check("DELETE /tickets/:id (normal-only VIP booking)", r.status === 200, r.data);
  r = await req("DELETE", `/events/${normalOnlyId}/tickets/${normalOnlyVip.id}`, { token: orgToken });
  check("DELETE /events/:id/tickets/:ticketId (after cancel -> 200)", r.status === 200, r.data);
  // Legacy JSON stays in sync after ticket management.
  r = await req("GET", `/events/${normalOnlyId}`);
  check("ticketTiers JSON kept in sync", Array.isArray(r.data.ticketTiers) && r.data.ticketTiers.every((t) => t.name !== "VIP"), r.data);

  // 14) Authorization: plain user cannot manage tickets; another organizer's
  // event is not touchable.
  r = await req("POST", `/events/${archEventId}/tickets`, { token: userToken, body: { ticketType: "Normal", price: 1, quantity: 1 } });
  check("POST /events/:id/tickets (user -> 403)", r.status === 403, r.data);
  r = await req("POST", `/events/${archEventId}/tickets`, { token: org2Token, body: { ticketType: "Normal", price: 1, quantity: 1 } });
  check("POST /events/:id/tickets (other organizer -> 404)", r.status === 404, r.data);

  // ---- ATTENDANCE (organizer only) ----
  r = await req("GET", `/attendance/event/${newEventId}`, { token: orgToken });
  check("GET /attendance/event/:eventId", r.status === 200 && Array.isArray(r.data.attendees), r.data);

  r = await req("GET", `/attendance/event/${newEventId}`, { token: userToken });
  check("GET /attendance/event/:eventId (user -> 403)", r.status === 403, r.data);

  r = await req("GET", `/attendance/stats/${newEventId}`, { token: orgToken });
  check("GET /attendance/stats/:eventId", r.status === 200 && r.data.capacity !== undefined, r.data);

  // scan the remaining VIP ticket
  const myTickets = (await req("GET", "/tickets/my", { token: userToken })).data;
  const vipTicket = myTickets.find((t) => String(t.eventTitle || "").startsWith("Smoke Event"));
  const scanPayload = JSON.stringify({ ticketId: vipTicket.id, eventId: newEventId, userId, event: "x", attendee: "y", phone: "z", date: "2026-01-01", qty: 1, tier: "VIP", ts: "2026-01-01T00:00:00Z" });
  r = await req("POST", "/attendance/scan", { token: orgToken, body: { qrData: scanPayload } });
  check("POST /attendance/scan (success)", r.status === 200 && r.data.status === "success", r.data);

  r = await req("POST", "/attendance/scan", { token: orgToken, body: { qrData: scanPayload } });
  check("POST /attendance/scan (duplicate)", r.status === 200 && r.data.status === "duplicate", r.data);

  r = await req("POST", "/attendance/scan", { token: orgToken, body: { qrData: "not-json" } });
  check("POST /attendance/scan (bad qr -> 400)", r.status === 400, r.data);

  // ---- ORGANIZER ----
  r = await req("GET", "/organizer/stats", { token: orgToken });
  check("GET /organizer/stats", r.status === 200 && r.data.totalEvents !== undefined, r.data);

  r = await req("GET", "/organizer/events/recent", { token: orgToken });
  check("GET /organizer/events/recent", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/organizer/profile", { token: orgToken });
  check("GET /organizer/profile", r.status === 200 && r.data.licenceNumber === licence, r.data);

  r = await req("PUT", "/organizer/profile", { token: orgToken, body: { fullname: "Smoke Org Updated", email: orgEmail, licenceNumber: licence } });
  check("PUT /organizer/profile", r.status === 200, r.data);

  // ---- USER PROFILE ----
  r = await req("PUT", "/user/profile", { token: userToken, body: { fullname: "Smoke User Updated", phonenumber: userPhone, email: userEmail } });
  check("PUT /user/profile", r.status === 200, r.data);

  // ---- ADMIN ----
  r = await req("GET", "/admin/organizers", { token: adminToken });
  check("GET /admin/organizers", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/admin/stats", { token: adminToken });
  check("GET /admin/stats", r.status === 200 && r.data.totalUsers !== undefined, r.data);

  r = await req("GET", "/admin/tickets-per-event", { token: adminToken });
  check("GET /admin/tickets-per-event", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/admin/users", { token: adminToken });
  check("GET /admin/users", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/admin/events", { token: adminToken });
  check("GET /admin/events", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/admin/events/pending", { token: adminToken });
  check("GET /admin/events/pending", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("PUT", `/admin/events/${newEventId}/reject`, { token: adminToken });
  check("PUT /admin/events/:id/reject", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${org2UserId}/role`, { token: adminToken, body: { role: "organizer" } });
  check("PUT /admin/users/:id/role", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${userId}`, { token: adminToken, body: { fullname: "Smoke User Edited", phonenumber: userPhone, email: userEmail } });
  check("PUT /admin/users/:id", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${userId}/status`, { token: adminToken, body: { status: "suspended" } });
  check("PUT /admin/users/:id/status (suspended)", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${userId}/status`, { token: adminToken, body: { status: "active" } });
  check("PUT /admin/users/:id/status (active)", r.status === 200, r.data);

  // admin authz: non-admin must get 403
  r = await req("GET", "/admin/users", { token: userToken });
  check("GET /admin/users (user -> 403)", r.status === 403, r.data);

  // ---- CLEANUP: remove every record this test created ----
  for (const eid of testEvents) {
    await req("DELETE", `/events/${eid}`, { token: orgToken });
  }
  for (const u of testUsers) {
    db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
  }

  // Verify cleanup worked and original data is intact
  r = await req("GET", `/events/${newEventId}`);
  check("CLEANUP: deleted event gone", r.status === 404, r.data);

  const userCount = db.prepare("SELECT COUNT(*) c FROM users").get().c;
  check("DB intact: user count unchanged", userCount === before.users, { before: before.users, after: userCount });
  const eventCount = db.prepare("SELECT COUNT(*) c FROM events").get().c;
  check("DB intact: event count unchanged", eventCount === before.events, { before: before.events, after: eventCount });
  const ticketCount = db.prepare("SELECT COUNT(*) c FROM booked_tickets").get().c;
  check("DB intact: ticket count unchanged", ticketCount === before.tickets, { before: before.tickets, after: ticketCount });
  const ticketTypeCount = db.prepare("SELECT COUNT(*) c FROM tickets").get().c;
  check("DB intact: ticket type count unchanged", ticketTypeCount === before.ticketTypes, { before: before.ticketTypes, after: ticketTypeCount });

  console.log(`\n==== ${passed} passed, ${failures} failed ====`);
  process.exit(failures === 0 ? 0 : 1);
})();
