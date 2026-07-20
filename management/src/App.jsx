import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/login_page";
import RegisterPage from "./pages/register_page";
import EventsPage from "./pages/events_page";
import EventDetailPage from "./pages/event_detail";
import MyBookingsPage from "./pages/my_bookings";
import OrganizerDashboard from "./pages/organizer/dashboard";
import CreateEventPage from "./pages/organizer/create_event";
import ManageEventsPage from "./pages/organizer/manage_events";
import AdminDashboard from "./pages/admin/dashboard";
import PendingEventsPage from "./pages/admin/pending_events";
import ManageUsersPage from "./pages/admin/manage_users";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          <Route path="/my-bookings" element={
            <ProtectedRoute roles={["user"]}>
              <MyBookingsPage />
            </ProtectedRoute>
          } />

          <Route path="/organizer" element={
            <ProtectedRoute roles={["organizer"]}>
              <OrganizerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/organizer/create" element={
            <ProtectedRoute roles={["organizer"]}>
              <CreateEventPage />
            </ProtectedRoute>
          } />
          <Route path="/organizer/events" element={
            <ProtectedRoute roles={["organizer"]}>
              <ManageEventsPage />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/pending" element={
            <ProtectedRoute roles={["admin"]}>
              <PendingEventsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={["admin"]}>
              <ManageUsersPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
