import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/login_page";
import RegisterPage from "./pages/register_page";
import VerifyEmailPage from "./pages/verify_email";
import ForgotPasswordPage from "./pages/forgot_password";
import EventsPage from "./pages/events_page";
import EventDetailPage from "./pages/event_detail";
import CustomerLayout from "./pages/CustomerLayout";
import OrganizerLayout from "./pages/organizer/OrganizerLayout";
import OrganizerDashboard from "./pages/organizer/dashboard";
import CreateEventPage from "./pages/organizer/create_event";
import ManageEventsPage from "./pages/organizer/manage_events";
import OrganizerEventDetail from "./pages/organizer/event_detail";
import OrganizerAnalytics from "./pages/organizer/analytics";
import OrganizerSettings from "./pages/organizer/settings";
import OrganizerCategories from "./pages/organizer/categories";
import OrganizerScanner from "./pages/organizer/scanner";
import UserSettings from "./pages/user_settings";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/dashboard";
import PendingEventsPage from "./pages/admin/pending_events";
import ManageUsersPage from "./pages/admin/manage_users";
import TicketsByEventPage from "./pages/admin/tickets_by_event";
import "./App.css";

function CustomerEventsEntry() {
  const { user } = useAuth();
  return user ? <CustomerLayout /> : <Outlet />;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isWorkspace = user && (
    location.pathname.startsWith("/organizer") ||
    location.pathname.startsWith("/admin") ||
    location.pathname === "/events"
  );

  return (
    <>
      {!isWorkspace && <Navbar />}
      <main className={isWorkspace ? "app-main workspace-main" : "app-main container"}>
        <Routes>
          <Route path="/" element={<Navigate to="/events" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          <Route path="/events" element={<CustomerEventsEntry />}>
            <Route index element={<EventsPage />} />
          </Route>

          <Route path="/my-bookings" element={<Navigate to="/events?tab=my-events" replace />} />
          <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />

          <Route path="/organizer" element={<ProtectedRoute requireOrganizer><OrganizerLayout /></ProtectedRoute>}>
            <Route index element={<OrganizerDashboard />} />
            <Route path="browse" element={<EventsPage showBack />} />
            <Route path="create" element={<CreateEventPage />} />
            <Route path="events" element={<ManageEventsPage />} />
            <Route path="event/:id" element={<OrganizerEventDetail />} />
            <Route path="analytics" element={<OrganizerAnalytics />} />
            <Route path="organizer-settings" element={<OrganizerSettings />} />
            <Route path="categories" element={<OrganizerCategories />} />
            <Route path="scanner" element={<OrganizerScanner />} />
            <Route path="my-bookings" element={<EventsPage showBack initialTab="my-events" />} />
            <Route path="favorites" element={<EventsPage showBack initialTab="favorites" />} />
            <Route path="customer-settings" element={<UserSettings />} />
          </Route>

          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="pending" element={<PendingEventsPage />} />
            <Route path="users" element={<ManageUsersPage />} />
            <Route path="tickets" element={<TicketsByEventPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
