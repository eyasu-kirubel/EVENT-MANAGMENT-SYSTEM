import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMO_ACCOUNTS = [
  { role: "user", label: "Customer", phone: "0911111111", desc: "Browse & book events" },
  { role: "organizer", label: "Organizer", phone: "0922222222", desc: "Create & manage events" },
];

export default function LoginPage() {
  const [phonenumber, setPhonenumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [selectedDemo, setSelectedDemo] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function fillDemo(account) {
    setPhonenumber(account.phone);
    setPassword("password123");
    setSelectedDemo(account.role);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(phonenumber, password);
      if (user.role === "organizer") navigate("/organizer");
      else if (user.role === "admin") navigate("/admin");
      else navigate("/events");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isFocused = (f) => focusedField === f;

  return (
    <div className="reg2-page">
      <div className="reg2-card">
        {/* Left Panel */}
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
            <p className="reg2-tagline">Welcome back! Sign in to continue</p>

            <div className="reg2-features">
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Manage your events and bookings</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Track attendance in real-time</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Digital QR tickets at your fingertips</span>
              </div>
            </div>
          </div>

          <div className="reg2-left-footer">
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </div>

        {/* Right Panel */}
        <div className="reg2-right">
          <div className="reg2-form-wrap">
            <div className="reg2-step-head">
              <h2>Sign in to your account</h2>
              <p>Enter your credentials or use a demo account</p>
            </div>

            {error && <div className="reg2-error">{error}</div>}

            {/* Demo Accounts */}
            <div className="login-demo-section">
              <span className="login-demo-label">Quick demo access</span>
              <div className="login-demo-grid">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    className={`login-demo-card ${selectedDemo === acc.role ? "active" : ""}`}
                    onClick={() => fillDemo(acc)}
                  >
                    <span className="login-demo-role">{acc.label}</span>
                    <span className="login-demo-desc">{acc.desc}</span>
                    <span className="login-demo-phone">{acc.phone}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="login-divider">
              <span>or sign in manually</span>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className={`reg2-field ${isFocused("phone") ? "focused" : ""}`}>
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
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField("")}
                    required
                  />
                  <label className="reg2-floating">09XXXXXXXX</label>
                </div>
              </div>

              <div className={`reg2-field ${isFocused("pw") ? "focused" : ""}`}>
                <label>Password</label>
                <div className="reg2-input-box">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="8" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 8V5C5 2.79 6.79 1 9 1C11.21 1 13 2.79 13 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                  </svg>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("pw")}
                    onBlur={() => setFocusedField("")}
                    required
                  />
                  <label className="reg2-floating">Enter your password</label>
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

              <button type="submit" className="reg2-btn-primary login-submit" disabled={loading}>
                {loading ? (
                  <span className="reg2-spinner" />
                ) : (
                  <>
                    Sign In
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="reg2-footer">
              Don't have an account? <Link to="/register">Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
