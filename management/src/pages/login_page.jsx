// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function LoginPage() {
  const [phonenumber, setPhonenumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(phonenumber, password);
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.isOrganizer || user.role === "organizer") {
        navigate("/organizer");
      } else {
        navigate("/events");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isFocused = (f) => focusedField === f;

  return (
    <div style={styles.container}>
      <div style={styles.background} />
      <div style={styles.overlay} />

      <div style={styles.card}>
        {/* Left Side - Purple Gradient */}
        <div style={styles.left}>
          <div style={styles.leftContent}>
            <div style={styles.brandIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="#6C5CE7" />
                <path d="M14 34V18L24 12L34 18V34L24 28L14 34Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="24" cy="22" r="3" fill="white" />
              </svg>
            </div>
            <h1 style={styles.leftTitle}>EventManager</h1>
            <p style={styles.leftTagline}>Welcome back! Sign in to continue</p>

            <div style={styles.features}>
              <div style={styles.feature}>
                <span style={styles.featureDot} />
                <span style={styles.featureText}>Manage your events and bookings</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureDot} />
                <span style={styles.featureText}>Track attendance in real-time</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureDot} />
                <span style={styles.featureText}>Digital QR tickets at your fingertips</span>
              </div>
            </div>
          </div>
          <div style={styles.leftFooter}>
            <span style={styles.footerText}>Ethiopia</span>
          </div>
        </div>

        {/* Right Side - White Form */}
        <div style={styles.right}>
          <div style={styles.formWrap}>
            <div style={styles.stepHead}>
              <h2 style={styles.stepTitle}>Sign in</h2>
              <p style={styles.stepSubtitle}>Enter your phone number and password</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Phone Number</label>
                <div style={styles.inputBox}>
                  <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 18 18" fill="none">
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
                    style={styles.input}
                    required
                  />
                  <label style={styles.floatingLabel}>09XXXXXXXX</label>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.fieldLabel}>Password</label>
                <div style={styles.inputBox}>
                  <svg style={styles.inputIcon} width="18" height="18" viewBox="0 0 18 18" fill="none">
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
                    style={styles.input}
                    required
                  />
                  <label style={styles.floatingLabel}>Enter your password</label>
                  <button
                    type="button"
                    style={styles.eyeBtn}
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

              <div style={styles.forgotRow}>
                <button type="button" style={styles.forgotBtn} onClick={() => navigate("/forgot-password")}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="login-submit-btn" style={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <span style={styles.spinner} />
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

            <div style={styles.footer}>
              Don't have an account? <Link to="/register" style={styles.footerLink}>Create one</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Segoe UI, sans-serif',
    padding: '20px',
    overflow: 'hidden',
    zIndex: 0,
  },
  background: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f7ff 55%, #f1edff 100%)',
    zIndex: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 12% 20%, rgba(108,92,231,0.10), transparent 24%), radial-gradient(circle at 88% 80%, rgba(108,92,231,0.08), transparent 28%)',
    zIndex: 1,
  },
  card: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    maxWidth: '900px',
    width: '100%',
    height: '520px',
    maxHeight: '90vh',
    background: 'white',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(54, 39, 105, 0.14)',
    flexShrink: 0,
  },
  left: {
    flex: '1',
    padding: '40px 32px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    overflow: 'hidden',
  },
  leftContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  brandIcon: {
    marginBottom: '8px',
  },
  leftTitle: {
    color: 'white',
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
  },
  leftTagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    margin: '0 0 16px 0',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '16px',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  featureDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#6C5CE7',
    flexShrink: 0,
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
  },
  leftFooter: {
    marginTop: 'auto',
    paddingTop: '20px',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
  },
  right: {
    flex: '1.2',
    padding: '40px 36px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'white',
  },
  formWrap: {
    width: '100%',
    maxWidth: '380px',
    margin: '0 auto',
  },
  stepHead: {
    marginBottom: '24px',
  },
  stepTitle: {
    color: '#1a1a2e',
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  stepSubtitle: {
    color: '#888',
    fontSize: '14px',
    margin: 0,
  },
  error: {
    background: 'rgba(255, 68, 68, 0.1)',
    color: '#dc3545',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(220, 53, 69, 0.2)',
  },
  field: {
    marginBottom: '18px',
  },
  fieldLabel: {
    display: 'block',
    color: '#555',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
  },
  inputBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#999',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 38px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '10px',
    color: '#333',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
  },
  floatingLabel: {
    position: 'absolute',
    left: '38px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999',
    fontSize: '14px',
    pointerEvents: 'none',
    transition: 'all 0.2s ease',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotRow: {
    textAlign: 'right',
    marginBottom: '20px',
  },
  forgotBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'color 0.2s ease',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #6C5CE7 0%, #5135B8 100%)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px',
  },
  footerLink: {
    color: '#6C5CE7',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

// Hover styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  input:focus {
    border-color: #6C5CE7 !important;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  }
  input:focus + label,
  input:not(:placeholder-shown) + label {
    opacity: 0 !important;
    visibility: hidden !important;
  }
  .eye-btn:hover {
    color: #555 !important;
  }
  .forgot-btn:hover {
    color: #6C5CE7 !important;
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(108, 92, 231, 0.3);
  }
  .login-submit-btn {
    background: #4527A0 !important;
    color: #FFFFFF !important;
    opacity: 1 !important;
    border: none !important;
    box-shadow: 0 6px 18px rgba(69, 39, 160, 0.25) !important;
  }

  .login-submit-btn:hover:not(:disabled) {
    background: #311B92 !important;
    color: #FFFFFF !important;
  }

  .login-submit-btn:disabled {
    background: #4527A0 !important;
    color: #FFFFFF !important;
    opacity: 1 !important;
    cursor: not-allowed;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);