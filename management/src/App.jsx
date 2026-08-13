import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/login_page";
import RegisterPage from "./pages/register_page";
import VerifyEmailPage from "./pages/verify_email";
import ForgotPasswordPage from "./pages/forgot_password";
import EventsPage from "./pages/events_page";
import EventDetailPage from "./pages/event_detail";
import MyBookingsPage from "./pages/my_bookings";
import OrganizerLayout from "./pages/organizer/OrganizerLayout";
import OrganizerDashboard from "./pages/organizer/dashboard";
import CreateEventPage from "./pages/organizer/create_event";
import ManageEventsPage from "./pages/organizer/manage_events";
import OrganizerEventDetail from "./pages/organizer/event_detail";
import OrganizerAnalytics from "./pages/organizer/analytics";
import OrganizerSettings from "./pages/organizer/settings";
import UserSettings from "./pages/user_settings";
import AdminDashboard from "./pages/admin/dashboard";
import PendingEventsPage from "./pages/admin/pending_events";
import ManageUsersPage from "./pages/admin/manage_users";
import TicketsByEventPage from "./pages/admin/tickets_by_event";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <div className="app-bg-video-wrap">
        <video className="app-bg-video" autoPlay muted loop playsInline src="/bg-video.mp4" />
        <div className="app-bg-overlay" />
      </div>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          <Route path="/my-bookings" element={
            <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute><UserSettings /></ProtectedRoute>
          } />

          <Route path="/organizer" element={
            <ProtectedRoute requireOrganizer><OrganizerLayout /></ProtectedRoute>
          }>
            <Route index element={<OrganizerDashboard />} />
            <Route path="browse" element={<EventsPage showBack />} />
            <Route path="create" element={<CreateEventPage />} />
            <Route path="events" element={<ManageEventsPage />} />
            <Route path="event/:id" element={<OrganizerEventDetail />} />
            <Route path="analytics" element={<OrganizerAnalytics />} />
            <Route path="settings" element={<OrganizerSettings />} />
          </Route>

          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/pending" element={
            <ProtectedRoute roles={["admin"]}><PendingEventsPage /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={["admin"]}><ManageUsersPage /></ProtectedRoute>
          } />
          <Route path="/admin/tickets" element={
            <ProtectedRoute roles={["admin"]}><TicketsByEventPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}

export default App;
