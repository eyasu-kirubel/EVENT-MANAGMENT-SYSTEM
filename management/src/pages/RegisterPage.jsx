import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullname: "", phonenumber: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullname || !form.phonenumber || !form.password) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/events");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.videoBg}>
        <video autoPlay loop muted playsInline style={styles.video}
          poster="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80">
          <source src="https://cdn.pixabay.com/video/2020/07/30/45675-444601765_large.mp4" type="video/mp4" />
        </video>
        <div style={styles.overlay} />
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join EventHub and discover amazing events</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={form.fullname}
              onChange={(e) => setForm({ ...form, fullname: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="text"
              placeholder="09XXXXXXXX"
              value={form.phonenumber}
              onChange={(e) => setForm({ ...form, phonenumber: e.target.value })}
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={styles.input}
            />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Log In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  videoBg: { position: 'fixed', inset: 0, zIndex: 0 },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,10,26,0.92) 0%, rgba(91,33,182,0.5) 100%)' },
  card: { position: 'relative', zIndex: 1, background: 'rgba(20, 15, 35, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
  cardHeader: { textAlign: 'center', marginBottom: 32 },
  title: { fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)' },
  error: { background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', color: 'white', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' },
  btn: { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: 8, transition: 'opacity 0.2s' },
  footer: { textAlign: 'center', marginTop: 24, fontSize: '14px', color: 'var(--text-muted)' },
  link: { color: 'var(--primary-light)', fontWeight: 500 },
};
