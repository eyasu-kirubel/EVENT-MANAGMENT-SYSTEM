import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
const strengthColors = ["", "#ff4757", "#ff6348", "#ffa502", "#2ed573", "#0be881"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullname: "",
    phonenumber: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
    role: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [focusedField, setFocusedField] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const pwStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function selectRole(role) {
    setForm((prev) => ({ ...prev, role }));
    if (errors.role) setErrors((prev) => ({ ...prev, role: "" }));
  }

  function validateStep(s) {
    const errs = {};
    if (s === 1) {
      if (!form.role) errs.role = "Please select a role";
    }
    if (s === 2) {
      if (!form.fullname.trim()) errs.fullname = "Full name is required";
      if (!form.phonenumber.trim()) errs.phonenumber = "Phone number is required";
      else if (!/^0[79]\d{8}$/.test(form.phonenumber.trim()))
        errs.phonenumber = "Enter a valid Ethiopian phone (09XXXXXXXX or 07XXXXXXXX)";
    }
    if (s === 3) {
      if (!form.password) errs.password = "Password is required";
      else if (form.password.length < 6) errs.password = "At least 6 characters";
      if (form.password !== form.confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    setStep((s) => s - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep(3)) return;
    setLoading(true);
    setGlobalError("");

    try {
      const user = await register(
        form.fullname.trim(),
        form.phonenumber.trim(),
        form.password,
        form.birthDate || undefined,
        form.role
      );
      if (user.role === "organizer") navigate("/organizer");
      else navigate("/events");
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isFocused = (name) => focusedField === name || form[name];
  const hasError = (name) => !!errors[name];

  return (
    <div className="reg2-page">
      <div className="reg2-card">
        {/* Left Panel — Branded */}
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
            <p className="reg2-tagline">Where great events begin</p>

            <div className="reg2-features">
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Discover and book events near you</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Digital QR tickets — no paper needed</span>
              </div>
              <div className="reg2-feature">
                <span className="reg2-feature-dot" />
                <span>Trusted by thousands of organizers</span>
              </div>
            </div>
          </div>

          <div className="reg2-left-footer">
            <span>Addis Ababa, Ethiopia</span>
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="reg2-right">
          <div className="reg2-form-wrap">
            {/* Progress */}
            <div className="reg2-progress">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`reg2-pstep ${step >= s ? "active" : ""} ${step > s ? "done" : ""}`}>
                  <div className="reg2-pstep-circle">
                    {step > s ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      s
                    )}
                  </div>
                  <span className="reg2-pstep-label">
                    {s === 1 ? "Role" : s === 2 ? "Info" : "Security"}
                  </span>
                </div>
              ))}
              <div className="reg2-pstep-track">
                <div className="reg2-pstep-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
              </div>
            </div>

            {globalError && <div className="reg2-error">{globalError}</div>}

            <form onSubmit={handleSubmit} noValidate>
              {/* STEP 1 — Role */}
              <div className={`reg2-step ${step === 1 ? "active" : ""}`}>
                <div className="reg2-step-head">
                  <h2>Choose your role</h2>
                  <p>Pick how you want to use EventManager</p>
                </div>

                <div className="reg2-role-grid">
                  <button
                    type="button"
                    className={`reg2-role-card ${form.role === "user" ? "selected" : ""}`}
                    onClick={() => selectRole("user")}
                  >
                    <div className="reg2-role-ring">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                        <path d="M6 28C6 22.477 10.477 18 16 18C21.523 18 26 22.477 26 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="reg2-role-title">Customer</span>
                    <span className="reg2-role-desc">Browse events & book tickets</span>
                  </button>

                  <button
                    type="button"
                    className={`reg2-role-card ${form.role === "organizer" ? "selected" : ""}`}
                    onClick={() => selectRole("organizer")}
                  >
                    <div className="reg2-role-ring">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
                        <path d="M4 13H28" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 6V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M20 6V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="16" cy="20" r="2" fill="currentColor" />
                      </svg>
                    </div>
                    <span className="reg2-role-title">Organizer</span>
                    <span className="reg2-role-desc">Create & manage events</span>
                  </button>
                </div>
                {errors.role && <div className="reg2-field-err">{errors.role}</div>}

                <button type="button" className="reg2-btn-primary" onClick={goNext}>
                  Continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* STEP 2 — Info */}
              <div className={`reg2-step ${step === 2 ? "active" : ""}`}>
                <div className="reg2-step-head">
                  <h2>Your information</h2>
                  <p>Tell us a bit about yourself</p>
                </div>

                <div className={`reg2-field ${hasError("fullname") ? "err" : ""} ${isFocused("fullname") ? "focused" : ""}`}>
                  <label>Full Name</label>
                  <div className="reg2-input-box">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M2 17C2 13.134 5.134 10 9 10C12.866 10 16 13.134 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      name="fullname"
                      placeholder=" "
                      value={form.fullname}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("fullname")}
                      onBlur={() => setFocusedField("")}
                    />
                    <label className="reg2-floating">e.g. Hana Tesfaye</label>
                  </div>
                  {errors.fullname && <span className="reg2-field-err">{errors.fullname}</span>}
                </div>

                <div className={`reg2-field ${hasError("phonenumber") ? "err" : ""} ${isFocused("phonenumber") ? "focused" : ""}`}>
                  <label>Phone Number</label>
                  <div className="reg2-input-box">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="4" y="1" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="9" cy="14" r="1" fill="currentColor" />
                    </svg>
                    <input
                      type="tel"
                      name="phonenumber"
                      placeholder=" "
                      value={form.phonenumber}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("phonenumber")}
                      onBlur={() => setFocusedField("")}
                    />
                    <label className="reg2-floating">09XXXXXXXX</label>
                  </div>
                  {errors.phonenumber && <span className="reg2-field-err">{errors.phonenumber}</span>}
                </div>

                <div className={`reg2-field ${hasError("birthDate") ? "err" : ""} ${isFocused("birthDate") ? "focused" : ""}`}>
                  <label>Date of Birth <span className="reg2-optional">optional</span></label>
                  <div className="reg2-input-box">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="1" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M1 7H17" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M13 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                      type="date"
                      name="birthDate"
                      placeholder=" "
                      value={form.birthDate}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("birthDate")}
                      onBlur={() => setFocusedField("")}
                    />
                  </div>
                </div>

                <div className="reg2-btn-row">
                  <button type="button" className="reg2-btn-ghost" onClick={goBack}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                  </button>
                  <button type="button" className="reg2-btn-primary" onClick={goNext}>
                    Continue
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* STEP 3 — Password */}
              <div className={`reg2-step ${step === 3 ? "active" : ""}`}>
                <div className="reg2-step-head">
                  <h2>Secure your account</h2>
                  <p>Create a strong, unique password</p>
                </div>

                <div className={`reg2-field ${hasError("password") ? "err" : ""} ${isFocused("password") ? "focused" : ""}`}>
                  <label>Password</label>
                  <div className="reg2-input-box">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="2" y="8" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5 8V5C5 2.79 6.79 1 9 1C11.21 1 13 2.79 13 5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder=" "
                      value={form.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField("")}
                    />
                    <label className="reg2-floating">Min 6 characters</label>
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
                  {errors.password && <span className="reg2-field-err">{errors.password}</span>}

                  {form.password && (
                    <div className="reg2-strength">
                      <div className="reg2-strength-track">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`reg2-strength-seg ${i <= pwStrength ? "on" : ""}`}
                            style={i <= pwStrength ? { background: strengthColors[pwStrength] } : {}}
                          />
                        ))}
                      </div>
                      <span className="reg2-strength-text" style={{ color: strengthColors[pwStrength] }}>
                        {strengthLabels[pwStrength]}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`reg2-field ${hasError("confirmPassword") ? "err" : ""} ${isFocused("confirmPassword") ? "focused" : ""}`}>
                  <label>Confirm Password</label>
                  <div className="reg2-input-box">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M5 9L8 12L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder=" "
                      value={form.confirmPassword}
                      onChange={handleChange}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => setFocusedField("")}
                    />
                    <label className="reg2-floating">Re-enter password</label>
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <span className="reg2-check">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {errors.confirmPassword && <span className="reg2-field-err">{errors.confirmPassword}</span>}
                </div>

                <div className="reg2-btn-row">
                  <button type="button" className="reg2-btn-ghost" onClick={goBack}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13 8H3M3 8L7 4M3 8L7 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                  </button>
                  <button type="submit" className="reg2-btn-primary" disabled={loading}>
                    {loading ? (
                      <span className="reg2-spinner" />
                    ) : (
                      <>
                        Create Account
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="reg2-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
