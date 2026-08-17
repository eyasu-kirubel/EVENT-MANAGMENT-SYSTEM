import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BsCalendar3, BsBoxArrowRight } from "react-icons/bs";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="public-nav">
      <Link to="/events" className="public-brand">
        <span className="public-brand-icon"><BsCalendar3 /></span>
        <span>EventManager</span>
      </Link>
      <div className="public-nav-actions">
        {user ? (
          <button className="public-logout" onClick={handleLogout}><BsBoxArrowRight /> Log out</button>
        ) : (
          <>
            <Link to="/login" className="public-link">Sign in</Link>
            <Link to="/register" className="public-primary">Create account</Link>
          </>
        )}
      </div>
    </nav>
  );
}
