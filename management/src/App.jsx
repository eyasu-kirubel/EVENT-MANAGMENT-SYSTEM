import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/login_page";
import AdminPanel from "./pages/AdminPanel";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<h1>REGISTER PAGE</h1>} />
      <Route path="/events" element={<h1>EVENTS PAGE</h1>} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default App;