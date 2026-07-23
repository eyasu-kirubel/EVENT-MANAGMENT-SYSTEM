import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/login_page";
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import EventsPage from "./pages/EventsPage";
import AdminPanel from "./pages/AdminPanel";
import OrganizerPanel from "./pages/OrganizerPanel";
import ScanPage from "./pages/ScanPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/organizer" element={<OrganizerPanel />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
