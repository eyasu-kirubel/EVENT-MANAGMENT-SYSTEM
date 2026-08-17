import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function UserSettings() {
  const { user } = useAuth();
  const [fullname, setFullname] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFullname(user.fullname || "");
    setPhonenumber(user.phonenumber || "");
    setEmail(user.email || "");
    setLoading(false);
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await api.put("/user/profile", { fullname, phonenumber, email });
      setMessage(res.message);
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h1>Account Settings</h1>
      {message && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.9rem",
          background: message === "Profile updated." ? "#e6f7e6" : "#ffe6e6",
          color: message === "Profile updated." ? "#2d6a2d" : "#cc3333"
        }}>
          {message}
        </div>
      )}
      <form className="form-card" onSubmit={handleSave} style={{ maxWidth: 500 }}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" value={phonenumber} onChange={(e) => setPhonenumber(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
