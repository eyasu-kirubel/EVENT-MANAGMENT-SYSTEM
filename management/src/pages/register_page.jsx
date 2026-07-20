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

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const strengthColors = ["", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#00b894"];

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

  return (
    <div className="reg-page">
      <div className="reg-card">
        <div className="reg-header">
          <div className="reg-logo">&#127914;</div>
          <h2>Create Account</h2>
          <p>Join EventManager today</p>
        </div>

        {/* Progress bar */}
        <div className="reg-progress">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`reg-progress-step ${step >= s ? "active" : ""}`}>
              <div className={`reg-progress-dot ${step >= s ? "filled" : ""}`}>
                {step > s ? "\u2713" : s}
              </div>
              <span>{s === 1 ? "Role" : s === 2 ? "Details" : "Security"}</span>
            </div>
          ))}
          <div className="reg-progress-line">
            <div className="reg-progress-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
          </div>
        </div>

        {globalError && <div className="reg-error">{globalError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* STEP 1 — Role Selection */}
          <div className={`reg-step ${step === 1 ? "visible" : "hidden-left"}`}>
            <h3>Who are you?</h3>
            <p className="reg-step-sub">Choose how you want to use the platform</p>

            <div className="reg-role-grid">
              <button
                type="button"
                className={`reg-role-card ${form.role === "user" ? "selected" : ""}`}
                onClick={() => selectRole("user")}
              >
                <div className="reg-role-icon">&#128100;</div>
                <div className="reg-role-title">Customer</div>
                <div className="reg-role-desc">Browse events, book tickets, and track your attendance</div>
              </button>

              <button
                type="button"
                className={`reg-role-card ${form.role === "organizer" ? "selected" : ""}`}
                onClick={() => selectRole("organizer")}
              >
                <div className="reg-role-icon">&#127919;</div>
                <div className="reg-role-title">Organizer</div>
                <div className="reg-role-desc">Create events, manage bookings, and check in attendees</div>
              </button>
            </div>
            {errors.role && <div className="reg-field-error">{errors.role}</div>}

            <button type="button" className="reg-btn reg-btn-primary" onClick={goNext}>
              Continue &rarr;
            </button>
          </div>

          {/* STEP 2 — Personal Info */}
          {step === 2 && (
            <div className="reg-step visible">
              <h3>Personal Information</h3>
              <p className="reg-step-sub">Tell us about yourself</p>

              <div className="reg-field">
                <label>Full Name</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">&#128100;</span>
                  <input
                    type="text"
                    name="fullname"
                    placeholder="e.g. Hana Tesfaye"
                    value={form.fullname}
                    onChange={handleChange}
                    className={errors.fullname ? "input-error" : ""}
                  />
                </div>
                {errors.fullname && <div className="reg-field-error">{errors.fullname}</div>}
              </div>

              <div className="reg-field">
                <label>Phone Number</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">&#128222;</span>
                  <input
                    type="tel"
                    name="phonenumber"
                    placeholder="09XXXXXXXX"
                    value={form.phonenumber}
                    onChange={handleChange}
                    className={errors.phonenumber ? "input-error" : ""}
                  />
                </div>
                {errors.phonenumber && <div className="reg-field-error">{errors.phonenumber}</div>}
              </div>

              <div className="reg-field">
                <label>Date of Birth <span className="reg-optional">(optional)</span></label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">&#128197;</span>
                  <input
                    type="date"
                    name="birthDate"
                    value={form.birthDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="reg-btn-row">
                <button type="button" className="reg-btn reg-btn-ghost" onClick={goBack}>
                  &larr; Back
                </button>
                <button type="button" className="reg-btn reg-btn-primary" onClick={goNext}>
                  Continue &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Password */}
          {step === 3 && (
            <div className="reg-step visible">
              <h3>Secure Your Account</h3>
              <p className="reg-step-sub">Create a strong password</p>

              <div className="reg-field">
                <label>Password</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">&#128274;</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    className={errors.password ? "input-error" : ""}
                  />
                  <button
                    type="button"
                    className="reg-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? "&#128065;" : "&#128064;"}
                  </button>
                </div>
                {errors.password && <div className="reg-field-error">{errors.password}</div>}

                {form.password && (
                  <div className="reg-strength">
                    <div className="reg-strength-bars">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`reg-strength-bar ${i <= pwStrength ? "filled" : ""}`}
                          style={i <= pwStrength ? { background: strengthColors[pwStrength] } : {}}
                        />
                      ))}
                    </div>
                    <span
                      className="reg-strength-label"
                      style={{ color: strengthColors[pwStrength] }}
                    >
                      {strengthLabels[pwStrength]}
                    </span>
                  </div>
                )}
              </div>

              <div className="reg-field">
                <label>Confirm Password</label>
                <div className="reg-input-wrap">
                  <span className="reg-input-icon">&#128273;</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? "input-error" : ""}
                  />
                  {form.confirmPassword && form.password === form.confirmPassword && (
                    <span className="reg-check-ok">&#10003;</span>
                  )}
                </div>
                {errors.confirmPassword && <div className="reg-field-error">{errors.confirmPassword}</div>}
              </div>

              <div className="reg-btn-row">
                <button type="button" className="reg-btn reg-btn-ghost" onClick={goBack}>
                  &larr; Back
                </button>
                <button
                  type="submit"
                  className="reg-btn reg-btn-primary reg-btn-full"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="reg-spinner" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="reg-footer-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
