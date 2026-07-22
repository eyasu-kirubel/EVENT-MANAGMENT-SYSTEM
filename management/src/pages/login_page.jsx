import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [phonenumber, setPhonenumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="auth-page page-enter">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #6c5ce7, #a855f7)",
            color: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            boxShadow: "0 4px 16px rgba(108, 92, 231, 0.4)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M7 10L12 7L17 10V17L12 14L7 17V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="12" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <h2>Welcome back</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="Phone Number"
          value={phonenumber}
          onChange={(e) => setPhonenumber(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "14px", borderRadius: 14, fontSize: "0.95rem" }}>
          {loading ? "Logging in..." : "Sign In"}
        </button>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}
