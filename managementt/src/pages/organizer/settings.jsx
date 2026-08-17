import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function OrganizerSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fullname, setFullname] = useState("");
  const [phonenumber, setPhonenumber] = useState("");
  const [email, setEmail] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.get("/organizer/profile");
      setProfile(data);
      setFullname(data.fullname || "");
      setPhonenumber(data.phonenumber || "");
      setEmail(data.email || "");
      setLicenceNumber(data.licenceNumber || "");
    } catch {
      setFullname(user.fullname || "");
      setPhonenumber(user.phonenumber || "");
      setEmail(user.email || "");
      setLicenceNumber(user.licenceNumber || "");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await api.put("/organizer/profile", { fullname, phonenumber, email, licenceNumber });
      setMessage(res.message);
    } catch (err) {
      setMessage(err.message);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <Link to="/organizer" className="admin-back">← Back to Dashboard</Link>
      <h1>Settings</h1>
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
          <input type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" value={phonenumber} onChange={(e) => setPhonenumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" />
        </div>
        <div className="form-group">
          <label>Licence Number</label>
          <input type="text" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} placeholder="Enter your business licence number" />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
