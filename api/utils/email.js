const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

// ── Configuration ──
// Secrets come ONLY from environment variables (api/.env). Never hard-code a
// credential, never log one, never return one through the API.
const isTestMode = process.env.NODE_ENV === "test";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = (process.env.SMTP_SECURE || "true").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "Event Management System";

if (!isTestMode) {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP_USER/SMTP_PASS are not set. Add SMTP_* variables to api/.env (see .env.example)."
    );
  }
}

// Nodemailer is only ever called outside test mode; in test mode the send is
// skipped entirely and the code is written to the test outbox instead.
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ── Test outbox ──
// When NODE_ENV=test we never touch SMTP. Instead the code that would have
// been emailed is written to a git-ignored JSON file so automated tests can
// read it back and exercise the full flow (verify/resend/reset) without
// sending any real email. The outbox is per-email and only ever holds the
// LATEST code, mirroring "only the latest code is valid".
const OUTBOX_FILE = path.join(__dirname, ".email-test-outbox.json");

function recordTestEmail(email, type, code) {
  let box = {};
  try {
    box = JSON.parse(fs.readFileSync(OUTBOX_FILE, "utf8"));
  } catch {
    box = {};
  }
  box[String(email).trim().toLowerCase()] = { type, code, at: new Date().toISOString() };
  fs.writeFileSync(OUTBOX_FILE, JSON.stringify(box, null, 2));
}

function getTestCode(email) {
  try {
    const box = JSON.parse(fs.readFileSync(OUTBOX_FILE, "utf8"));
    return box[String(email).trim().toLowerCase()]?.code;
  } catch {
    return undefined;
  }
}

function clearTestOutbox() {
  try {
    fs.unlinkSync(OUTBOX_FILE);
  } catch {
    // nothing to clear
  }
}

function sender() {
  return { name: SMTP_FROM_NAME, address: SMTP_USER };
}

async function sendEmail({ to, subject, html }) {
  if (isTestMode) {
    // Simulate a successful send; the code was recorded by the caller.
    return { id: "test-mode" };
  }
  // Safe diagnostics only: sender, recipient, subject and result. NEVER log
  // the password, app password, auth tokens or any transport internals.
  console.log(`[email] attempt to=${to} from=${SMTP_USER} subject="${subject}"`);
  try {
    const info = await transporter.sendMail({
      from: sender(),
      to,
      subject,
      html,
    });
    console.log(`[email] sent OK to=${to} messageId=${info.messageId || "(none)"}`);
    return info;
  } catch (err) {
    const safe = err && err.message ? err.message : String(err);
    console.error("[email] SMTP send failed:", safe);
    throw new Error("Failed to send email.");
  }
}

// Startup / diagnostic helper. Safe: never includes credentials in its output.
async function verifySmtpConnection() {
  if (isTestMode) {
    console.log("[email] SMTP skipped (NODE_ENV=test)");
    return { ok: true, message: "SMTP skipped (test mode)" };
  }
  try {
    await transporter.verify();
    console.log("[email] SMTP connection successful");
    return { ok: true, message: "SMTP connection successful" };
  } catch (err) {
    const safe = err && err.message ? err.message : String(err);
    console.error("[email] SMTP connection failed:", safe);
    return { ok: false, message: safe };
  }
}

function verificationHtml(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="margin: 0 0 12px;">Verify your email</h2>
      <p>Welcome to Event Management System.</p>
      <p>Your email verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 16px 0;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #777;">If you did not create this account, you can ignore this email.</p>
    </div>
  `;
}

function resetHtml(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="margin: 0 0 12px;">Reset your password</h2>
      <p>You requested a password reset.</p>
      <p>Your password reset code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 16px 0;">${code}</p>
      <p>This code expires in 10 minutes.</p>
      <p style="color: #777;">If you did not request this password reset, you can ignore this email.</p>
    </div>
  `;
}

async function sendEmailVerificationCode(email, code) {
  const to = String(email).trim();
  await sendEmail({
    to,
    subject: "Verify your Event Management System email",
    html: verificationHtml(code),
  });
  if (isTestMode) recordTestEmail(to, "verify", code);
}

async function sendPasswordResetCode(email, code) {
  const to = String(email).trim();
  await sendEmail({
    to,
    subject: "Reset your Event Management System password",
    html: resetHtml(code),
  });
  if (isTestMode) recordTestEmail(to, "reset", code);
}

module.exports = {
  sendEmailVerificationCode,
  sendPasswordResetCode,
  getTestCode,
  clearTestOutbox,
  verifySmtpConnection,
};
