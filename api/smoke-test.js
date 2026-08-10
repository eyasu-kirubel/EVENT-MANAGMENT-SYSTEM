const BASE = "http://localhost:3000";

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

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const userPhone = "091" + stamp;
  const orgPhone = "092" + stamp;
  const licence = "LIC" + stamp;

  // ---- AUTH ----
  let r = await req("GET", `/auth/check-phone/${userPhone}`);
  check("GET /auth/check-phone/:phonenumber (new -> exists:false)", r.status === 200 && r.data.exists === false, r);

  r = await req("GET", "/auth/check-phone/0983254043");
  check("GET /auth/check-phone/:phonenumber (existing -> exists:true)", r.status === 200 && r.data.exists === true, r);

  r = await req("GET", `/auth/check-licence/${licence}`);
  check("GET /auth/check-licence/:licenceNumber (new)", r.status === 200 && r.data.exists === false, r);

  r = await req("GET", "/auth/check-licence/1234567");
  check("GET /auth/check-licence/:licenceNumber (existing)", r.status === 200 && r.data.exists === true, r);

  r = await req("GET", `/auth/check-email/test${stamp}@example.com`);
  check("GET /auth/check-email/:email (new)", r.status === 200 && r.data.exists === false, r);

  // Register plain user
  r = await req("POST", "/auth/register", {
    body: { fullname: "Smoke User", phonenumber: userPhone, password: "secret123", birthDate: "2000-01-01", email: `user${stamp}@example.com` },
  });
  check("POST /auth/register (user)", r.status === 201 && r.data.token && r.data.user.isOrganizer === false, r.data);
  const userToken = r.data.token;
  const userId = r.data.user.id;

  // Register organizer (isOrganizer flag)
  r = await req("POST", "/auth/register", {
    body: { fullname: "Smoke Org", phonenumber: orgPhone, password: "secret123", birthDate: "1990-01-01", email: `org${stamp}@example.com`, isOrganizer: true, licenceNumber: licence },
  });
  check("POST /auth/register (organizer)", r.status === 201 && r.data.token && r.data.user.isOrganizer === true && r.data.organizer && r.data.organizer.licenceNumber === licence, r.data);
  const orgToken = r.data.token;
  const orgUserId = r.data.user.id;

  // Register organizer via legacy role:"organizer"
  r = await req("POST", "/auth/register", {
    body: { fullname: "Smoke Org2", phonenumber: "093" + stamp, password: "secret123", birthDate: "1991-01-01", email: `org2${stamp}@example.com`, role: "organizer", licenceNumber: "LIC2" + stamp },
  });
  check("POST /auth/register (organizer via role field)", r.status === 201 && r.data.user.isOrganizer === true, r.data);
  const org2Token = r.data.token;
  const org2UserId = r.data.user.id;

  // Login
  r = await req("POST", "/auth/login", { body: { phonenumber: userPhone, password: "secret123" } });
  check("POST /auth/login (user)", r.status === 200 && r.data.token, r.data);
  check("POST /auth/login bad password", (await req("POST", "/auth/login", { body: { phonenumber: userPhone, password: "wrong" } })).status === 401);

  // Admin login
  r = await req("POST", "/auth/login", { body: { phonenumber: "0900000000", password: "admin123" } });
  check("POST /auth/login (admin)", r.status === 200 && r.data.token && r.data.user.role === "admin", r.data);
  const adminToken = r.data.token;

  // Forgot / reset password
  r = await req("POST", "/auth/forgot-password", { body: { phonenumber: userPhone, email: `user${stamp}@example.com` } });
  check("POST /auth/forgot-password", r.status === 200 && r.data.code, r.data);
  const code = r.data.code;
  r = await req("POST", "/auth/reset-password", { body: { phonenumber: userPhone, code, newPassword: "newsecret123" } });
  check("POST /auth/reset-password", r.status === 200, r.data);

  // ---- EVENTS (public) ----
  r = await req("GET", "/events");
  check("GET /events", r.status === 200 && Array.isArray(r.data), r.data);

  r = await req("GET", "/events/1");
  check("GET /events/:id", r.status === 200 && r.data.id === 1 && r.data.tierSales !== undefined, r.data);

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

  // Now update the event (wipes tiers, tests the edit path)
  r = await req("PUT", `/events/${newEventId}`, {
    token: orgToken,
    body: { title: "Smoke Event UPD " + stamp, description: "desc2", category: "Tech", location: "Bole", price: 600, capacity: 120, startDate: future, endDate: later, paymentAccounts: [{ method: "CBE", number: "100020003000" }], ticketTiers: [] },
  });
  check("PUT /events/:id", r.status === 200 && r.data.message, r.data);

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

  r = await req("PUT", "/organizer/profile", { token: orgToken, body: { fullname: "Smoke Org Updated", email: `org${stamp}@example.com`, licenceNumber: licence } });
  check("PUT /organizer/profile", r.status === 200, r.data);

  // ---- USER PROFILE ----
  r = await req("PUT", "/user/profile", { token: userToken, body: { fullname: "Smoke User Updated", phonenumber: userPhone, email: `user${stamp}@example.com` } });
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

  r = await req("PUT", `/admin/users/${userId}`, { token: adminToken, body: { fullname: "Smoke User Edited", phonenumber: userPhone, email: `user${stamp}@example.com` } });
  check("PUT /admin/users/:id", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${userId}/status`, { token: adminToken, body: { status: "suspended" } });
  check("PUT /admin/users/:id/status (suspended)", r.status === 200, r.data);

  r = await req("PUT", `/admin/users/${userId}/status`, { token: adminToken, body: { status: "active" } });
  check("PUT /admin/users/:id/status (active)", r.status === 200, r.data);

  // admin authz: non-admin must get 403
  r = await req("GET", "/admin/users", { token: userToken });
  check("GET /admin/users (user -> 403)", r.status === 403, r.data);

  // ---- CLEANUP: delete test records (events, tickets, users) ----
  await req("DELETE", `/events/${newEventId}`, { token: orgToken });
  await req("DELETE", `/admin/users/${userId}`, { token: adminToken });
  await req("DELETE", `/admin/users/${orgUserId}`, { token: adminToken });
  await req("DELETE", `/admin/users/${org2UserId}`, { token: adminToken });

  // Verify cleanup worked and DB is intact
  r = await req("GET", `/events/${newEventId}`);
  check("CLEANUP: deleted event gone", r.status === 404, r.data);

  console.log(`\n==== ${passed} passed, ${failures} failed ====`);
  process.exit(failures === 0 ? 0 : 1);
})();
