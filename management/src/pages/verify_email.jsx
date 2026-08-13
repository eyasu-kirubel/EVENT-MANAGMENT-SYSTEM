import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/verify-email", { email: email.trim(), code });
      setDone(true);
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(e) {
    if (e) e.preventDefault();
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/resend-verification", { email: email.trim() });
      setMessage("A new verification code has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to resend the code.");
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
            <p className="reg2-tagline">Verify your email to get started</p>
            <div className="reg2-features">
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Secure your account with email confirmation</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Receive event updates and tickets</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Unlock organizer tools right away</span>
              </div>
            </div>
          </div>
          <div className="reg2-left-footer">
            <span>Ethiopia</span>
          </div>
        </div>

        <div className="reg2-right">
          <div className="reg2-form-wrap">
            {!done ? (
              <>
                <div className="reg2-step-head">
                  <h2>Verify your email</h2>
                  <p>Enter the 6-digit code sent to your email address</p>
                </div>

                {error && <div className="reg2-error">{error}</div>}
                {message && <div className="reg2-success">{message}</div>}

                <form onSubmit={handleVerify} noValidate>
                  <div className="reg2-field">
                    <label>Email</label>
                    <div className="reg2-input-box">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M1 5L9 10L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <input
                        type="email"
                        placeholder=" "
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <label className="reg2-floating">name@example.com</label>
                    </div>
                  </div>

                  <div className="reg2-field">
                    <label>Verification Code</label>
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
                        autoFocus
                        required
                        maxLength={6}
                      />
                      <label className="reg2-floating">000000</label>
                    </div>
                  </div>

                  <button type="submit" className="reg2-btn-primary" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Verify Email"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Didn't receive the code?{" "}
                  <button type="button" className="login-forgot-btn" onClick={handleResend} disabled={loading}>
                    Resend
                  </button>
                </div>

                <div className="reg2-footer" style={{ marginTop: 8 }}>
                  Already verified? <Link to="/login">Sign in</Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h2 style={{ margin: "0 0 8px" }}>Email verified!</h2>
                <p style={{ color: "#888", marginBottom: 24 }}>Your account is now active. You can sign in.</p>
                <button
                  className="reg2-btn-primary"
                  style={{ display: "inline-flex", textDecoration: "none" }}
                  onClick={() => navigate("/login")}
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
