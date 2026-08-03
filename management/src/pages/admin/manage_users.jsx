import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";

import bg1 from "../../assets/images/bg1.jpg";

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(searchParams.get("role") || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullname: "", phonenumber: "", email: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.get("/admin/users");
      setUsers(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function displayRole(user) {
    if (user.role === "admin") return "Admin";
    return user.isOrganizer ? "Organizer" : "Customer";
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.fullname || "").toLowerCase().includes(q) ||
      (u.phonenumber || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || displayRole(u) === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  async function changeRole(id, role) {
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      setUsers(users.map((u) => (u.id === id ? { ...u, role: role === "organizer" ? "user" : role, isOrganizer: role === "organizer" } : u)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleStatus(user) {
    const next = user.status === "suspended" ? "active" : "suspended";
    const action = next === "suspended" ? "Suspend" : "Activate";
    if (!confirm(`${action} ${user.fullname}?`)) return;
    try {
      await api.put(`/admin/users/${user.id}/status`, { status: next });
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: next } : u)));
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteUser(user) {
    if (!confirm(`Delete ${user.fullname}? This removes their events and bookings too.`)) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err.message);
    }
  }

  function openEdit(user) {
    setEditError("");
    setEditUser(user);
    setEditForm({ fullname: user.fullname, phonenumber: user.phonenumber, email: user.email || "" });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      await api.put(`/admin/users/${editUser.id}`, editForm);
      setUsers(users.map((u) => (u.id === editUser.id ? { ...u, ...editForm } : u)));
      setEditUser(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="admin-wrap">
      <div className="admin-bg" style={{ backgroundImage: `url(${bg1})` }} />
      <div className="admin-bg-overlay" />

      <div className="admin-sub">
        <Link to="/admin" className="admin-back">← Back to Dashboard</Link>
        <h1>👥 Manage Users</h1>

        {/* Filters */}
        <div className="admin-toolbar">
          <input
            type="text"
            className="admin-search"
            placeholder="Search name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="admin-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            <option value="Customer">Customers</option>
            <option value="Organizer">Organizers</option>
            <option value="Admin">Admins</option>
          </select>
          <select className="admin-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="admin-user-count">
          Showing {filtered.length} of {users.length} users
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-empty">No users match.</td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className={user.status === "suspended" ? "admin-row-suspended" : ""}>
                    <td>
                      <div className="admin-user-name">
                        <span className="admin-user-avatar">{user.fullname.charAt(0).toUpperCase()}</span>
                        {user.fullname}
                      </div>
                    </td>
                    <td>{user.phonenumber}</td>
                    <td>
                      <span className={`admin-role-badge ${displayRole(user).toLowerCase()}`}>{displayRole(user)}</span>
                    </td>
                    <td>
                      <span className={`admin-status-badge ${user.status === "suspended" ? "suspended" : "active"}`}>
                        <span className="admin-status-dot" />
                        {user.status === "suspended" ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="admin-activity">
                      <span>Events: {user.eventsCreated ?? 0}</span>
                      <span>Tickets: {user.ticketsBooked ?? 0}</span>
                    </td>
                    <td className="admin-actions">
                      <button className="admin-act-btn act-view" onClick={() => setViewUser(user)}>View</button>
                      <button className="admin-act-btn act-edit" onClick={() => openEdit(user)}>Edit</button>
                      <select
                        className="admin-role-select"
                        value={displayRole(user)}
                        onChange={(e) => {
                          const roleMap = { Customer: "user", Organizer: "organizer", Admin: "admin" };
                          changeRole(user.id, roleMap[e.target.value]);
                        }}
                      >
                        <option value="Customer">Customer</option>
                        <option value="Organizer">Organizer</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button
                        className={`admin-act-btn ${user.status === "suspended" ? "act-activate" : "act-deactivate"}`}
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === "suspended" ? "Activate" : "Deactivate"}
                      </button>
                      <button className="admin-act-btn act-delete" onClick={() => deleteUser(user)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View modal */}
      {viewUser && (
        <div className="admin-modal-overlay" onClick={() => setViewUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-head">
                <div className="admin-modal-avatar">{viewUser.fullname.charAt(0).toUpperCase()}</div>
                <div>
                  <h3>{viewUser.fullname}</h3>
                  <span className={`admin-status-badge ${viewUser.status === "suspended" ? "suspended" : "active"}`}>
                    <span className="admin-status-dot" />
                    {viewUser.status === "suspended" ? "Suspended" : "Active"}
                  </span>
                </div>
                <button className="admin-modal-close" onClick={() => setViewUser(null)}>×</button>
              </div>
            <div className="admin-modal-body">
              <div className="admin-modal-row"><span>Phone</span><strong>{viewUser.phonenumber}</strong></div>
              <div className="admin-modal-row"><span>Email</span><strong>{viewUser.email || "—"}</strong></div>
              <div className="admin-modal-row"><span>Birth date</span><strong>{viewUser.birthDate || "—"}</strong></div>
              <div className="admin-modal-row"><span>Role</span><strong>{displayRole(viewUser)}</strong></div>
              <div className="admin-modal-row"><span>User ID</span><strong>#{viewUser.id}</strong></div>
            </div>
            <div className="admin-modal-stats">
              <div><span>📅</span><strong>{viewUser.eventsCreated ?? 0}</strong><small>Events created</small></div>
              <div><span>🎫</span><strong>{viewUser.ticketsBooked ?? 0}</strong><small>Tickets booked</small></div>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(viewUser); setEditForm({ fullname: viewUser.fullname, phonenumber: viewUser.phonenumber, email: viewUser.email || "" }); setViewUser(null); }}>✏️ Edit</button>
              <button className="btn btn-outline btn-sm" onClick={() => setViewUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="admin-modal-overlay" onClick={() => setEditUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div className="admin-modal-avatar">{editUser.fullname.charAt(0).toUpperCase()}</div>
              <h3>Edit User</h3>
              <button className="admin-modal-close" onClick={() => setEditUser(null)}>×</button>
            </div>
            <form onSubmit={saveEdit} className="admin-modal-body">
              <label className="admin-field-label">Full Name</label>
              <input className="admin-field" type="text" value={editForm.fullname} onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })} required />
              <label className="admin-field-label">Phone Number</label>
              <input className="admin-field" type="tel" value={editForm.phonenumber} onChange={(e) => setEditForm({ ...editForm, phonenumber: e.target.value })} required />
              <label className="admin-field-label">Email</label>
              <input className="admin-field" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              {editError && <div className="admin-edit-error">{editError}</div>}
              <div className="admin-modal-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditUser(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
