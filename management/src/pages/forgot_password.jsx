import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/api";

const EMAIL_RE = /\S+@\S+\.\S+/;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("email"); // email | code | password | done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: email.trim() });
      setMessage(res.message || "If an account exists for this email, a password reset code has been sent.");
      setStep("code");
    } catch (err) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  function handleSendCode(e) {
    e.preventDefault();
    sendCode();
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!code || code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-reset-code", { email: email.trim(), code });
      setResetToken(res.resetToken);
      setStep("password");
    } catch (err) {
      setError(err.message || "Invalid or expired reset code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!resetToken) {
      setError("Session expired. Please request a new reset code.");
      setStep("code");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { resetToken, newPassword });
      setStep("done");
    } catch (err) {
      if (err.message && /reset token/i.test(err.message)) {
        setResetToken("");
        setStep("code");
        setError("Your reset session expired. Please request a new reset code.");
      } else {
        setError(err.message || "Failed to reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reg2-page">
      <div className="reg2-card">
        <div className="reg2-left">
          <div className="reg2-left-content">
            <div className="reg2-brand-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.2)" />
                <path d="M14 34V18L24 12L34 18V34L24 28L14 34Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="24" cy="22" r="3" fill="white" />
              </svg>
            </div>
            <h1>EventManager</h1>
            <p className="reg2-tagline">Reset your password securely</p>
            <div className="reg2-features">
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Secure verification via email</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Set a new strong password</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Back to managing your events</span>
              </div>
            </div>
          </div>
          <div className="reg2-left-footer">
            <span>Ethiopia</span>
          </div>
        </div>

        <div className="reg2-right">
          <div className="reg2-form-wrap">
            {step === "email" && (
              <>
                <div className="reg2-step-head">
                  <h2>Forgot password</h2>
                  <p>Enter your account email to receive a reset code</p>
                </div>

                {error && <div className="reg2-error">{error}</div>}

                <form onSubmit={handleSendCode} noValidate>
                  <div className="reg2-field">
                    <label>Email</label>
                    <div className="reg2-input-box">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 4L9 10L16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <input
                        type="email"
                        placeholder=" "
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                      <label className="reg2-floating">yourname@example.com</label>
                    </div>
                  </div>

                  <button type="submit" className="reg2-btn-primary" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Send Reset Code"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Remember your password? <Link to="/login">Sign in</Link>
                </div>
              </>
            )}

            {step === "code" && (
              <>
                <div className="reg2-step-head">
                  <h2>Enter reset code</h2>
                  <p>A 6-digit code was sent to {email}</p>
                  {message && <p className="reg2-message">{message}</p>}
                </div>

                {error && <div className="reg2-error">{error}</div>}

                <form onSubmit={handleVerifyCode} noValidate>
                  <div className="reg2-field">
                    <label>Reset Code</label>
                    <div className="reg2-input-box">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="3" y="4" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 4V3C5 1.9 5.9 1 7 1H11C12.1 1 13 1.9 13 3V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <input
                        type="text"
                        placeholder=" "
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        maxLength={6}
                      />
                      <label className="reg2-floating">000000</label>
                    </div>
                  </div>

                  <button type="submit" className="reg2-btn-primary" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Verify Code"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Didn't receive the code?{" "}
                  <button type="button" className="login-forgot-btn" onClick={sendCode} disabled={loading} style={{ fontSize: "inherit", padding: 0 }}>
                    Resend
                  </button>
                </div>
              </>
            )}

            {step === "password" && (
              <>
                <div className="reg2-step-head">
                  <h2>Set new password</h2>
                  <p>Code verified for {email}</p>
                </div>

                {error && <div className="reg2-error">{error}</div>}

                <form onSubmit={handleReset} noValidate>
                  <div className="reg2-field">
                    <label>New Password</label>
                    <div className="reg2-input-box">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="2" y="8" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 8V5C5 2.79 6.79 1 9 1C11.21 1 13 2.79 13 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                      </svg>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder=" "
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={6}
                      />
                      <label className="reg2-floating">At least 6 characters</label>
                      <button
                        type="button"
                        className="reg2-eye"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M1.5 9C1.5 9 4 4 9 4C14 4 16.5 9 16.5 9C16.5 9 14 14 9 14C4 14 1.5 9 1.5 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M2 2L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M7.2 7.2C6.44 7.96 6 9 6 10C6 12 7.34 13.5 9 13.5C10 13.5 10.84 13 11.4 12.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M1.5 9C1.5 9 4 4 9 4C10.2 4 11.3 4.3 12.2 4.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M14.5 6.5C15.5 7.6 16.5 9 16.5 9C16.5 9 14 14 9 14C8.2 14 7.4 13.8 6.7 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="reg2-btn-primary" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Reset Password"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Remember your password? <Link to="/login">Sign in</Link>
                </div>
              </>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h2 style={{ margin: "0 0 8px" }}>Password reset!</h2>
                <p style={{ color: "#888", marginBottom: 24 }}>Your password has been updated successfully.</p>
                <Link to="/login" className="reg2-btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
                  Sign in with new password
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
