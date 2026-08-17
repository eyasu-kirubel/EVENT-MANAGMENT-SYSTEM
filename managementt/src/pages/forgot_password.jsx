import { BsCheckCircle } from "react-icons/bs";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../utils/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("phone"); // phone | reset | done
  const [phonenumber, setPhonenumber] = useState("");
  const [email, setEmail] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { phonenumber, email });
      setSentCode(res.code);
      setStep("reset");
      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to send code.");
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phonenumber, code, newPassword });
      setStep("done");
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        /* PAGE-ONLY FIX: overrides the global reg2 disabled silver styling */
        .forgot-password-primary-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          min-height: 54px !important;
          padding: 15px 24px !important;
          border: 0 !important;
          border-radius: 13px !important;
          font-family: inherit !important;
          font-size: .92rem !important;
          font-weight: 700 !important;
          color: #ffffff !important;
          background: #4527A0 !important;
          background-image: none !important;
          opacity: 1 !important;
          box-shadow: 0 9px 24px rgba(69,39,160,.25) !important;
          cursor: pointer !important;
          text-decoration: none !important;
          transition: background .2s ease, transform .2s ease, box-shadow .2s ease !important;
        }
        .forgot-password-primary-btn:hover,
        .forgot-password-primary-btn:focus,
        .forgot-password-primary-btn:active {
          color: #ffffff !important;
          background: #351b87 !important;
          background-image: none !important;
          opacity: 1 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 13px 30px rgba(69,39,160,.32) !important;
        }
        .forgot-password-primary-btn:disabled {
          color: #ffffff !important;
          background: #4527A0 !important;
          background-image: none !important;
          opacity: 1 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: 0 9px 24px rgba(69,39,160,.25) !important;
        }
        .forgot-password-primary-btn .reg2-spinner {
          border-color: rgba(255,255,255,.35) !important;
          border-top-color: #ffffff !important;
        }
      `}</style>
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
                <span>Quick verification via SMS</span>
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
            {step === "phone" && (
              <>
                <div className="reg2-step-head">
                  <h2>Forgot password</h2>
                  <p>Enter your phone number and email to receive a reset code</p>
                </div>

                {error && <div className="reg2-error">{error}</div>}

                <form onSubmit={handleSendCode} noValidate>
                  <div className="reg2-field">
                    <label>Phone Number</label>
                    <div className="reg2-input-box">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="4" y="1" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <circle cx="9" cy="14" r="1" fill="currentColor" />
                      </svg>
                      <input
                        type="tel"
                        placeholder=" "
                        value={phonenumber}
                        onChange={(e) => setPhonenumber(e.target.value)}
                        required
                      />
                      <label className="reg2-floating">09XXXXXXXX</label>
                    </div>
                  </div>

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
                        required
                      />
                      <label className="reg2-floating">yourname@example.com</label>
                    </div>
                  </div>

                  <button type="submit" className="forgot-password-primary-btn" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Send Reset Code"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Remember your password? <Link to="/login">Sign in</Link>
                </div>
              </>
            )}

            {step === "reset" && (
              <>
                <div className="reg2-step-head">
                  <h2>Enter reset code</h2>
                  <p>A 6-digit code was sent to {phonenumber}</p>
                  {sentCode && (
                    <div style={{ background: "#f5f3ff", border: "1.5px dashed #6c5ce7", borderRadius: 12, padding: "12px 16px", marginTop: 12, textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Your reset code</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "8px", color: "#6c5ce7", fontFamily: "monospace" }}>{sentCode}</div>
                    </div>
                  )}
                </div>

                {error && <div className="reg2-error">{error}</div>}

                <form onSubmit={handleReset} noValidate>
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
                        required
                        maxLength={6}
                      />
                      <label className="reg2-floating">000000</label>
                    </div>
                  </div>

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

                  <button type="submit" className="forgot-password-primary-btn" disabled={loading}>
                    {loading ? <span className="reg2-spinner" /> : "Reset Password"}
                  </button>
                </form>

                <div className="reg2-footer" style={{ marginTop: 20 }}>
                  Didn't receive the code? <button type="button" className="login-forgot-btn" onClick={handleSendCode} style={{ fontSize: "inherit", padding: 0 }}>Resend</button>
                </div>
              </>
            )}

            {step === "done" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 16, color: "#2e7d32" }}><BsCheckCircle /></div>
                <h2 style={{ margin: "0 0 8px" }}>Password reset!</h2>
                <p style={{ color: "#888", marginBottom: 24 }}>Your password has been updated successfully.</p>
                <Link to="/login" className="forgot-password-primary-btn" style={{ display: "inline-flex", textDecoration: "none" }}>
                  Sign in with new password
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
