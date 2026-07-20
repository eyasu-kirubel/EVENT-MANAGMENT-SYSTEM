import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/events" className="nav-brand">EventManager</Link>

      <div className="nav-links">
        <Link to="/events">Events</Link>

        {user && user.role === "user" && (
          <Link to="/my-bookings">My Bookings</Link>
        )}

        {user && user.role === "organizer" && (
          <>
            <Link to="/organizer">Dashboard</Link>
            <Link to="/organizer/create">Create Event</Link>
          </>
        )}

        {user && user.role === "admin" && (
          <>
            <Link to="/admin">Dashboard</Link>
            <Link to="/admin/pending">Pending Events</Link>
            <Link to="/admin/users">Users</Link>
          </>
        )}

        {user ? (
          <>
            <span className="nav-user">{user.fullname} ({user.role})</span>
            <button onClick={handleLogout} className="btn btn-sm">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
