import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Shield, GraduationCap, School, CheckCircle2, XCircle, Power, Trash2, UserPlus, X } from 'lucide-react';
import { adminApi } from '../../api/client';
import { User, UserRole } from '../../types';
import { useToast } from '../../context/ToastContext';

export const UserManagement: React.FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Create Admin Modal State
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const roleParam = selectedRoleFilter === 'all' ? undefined : selectedRoleFilter;
      const res = await adminApi.getUsers(roleParam);
      setUsers(res.data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading Users',
        description: 'Failed to fetch user directory from backend.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRoleFilter]);

  const toggleUserStatus = async (user: User) => {
    try {
      const newStatus = !user.is_active;
      await adminApi.updateUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
      );
      addToast({
        type: 'success',
        title: 'Status Updated',
        description: `${user.full_name} is now ${newStatus ? 'Active' : 'Deactivated'}.`,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: 'Could not change user status.',
      });
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete account for ${user.full_name}?`)) return;

    try {
      await adminApi.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      addToast({
        type: 'info',
        title: 'User Deleted',
        description: `Account for ${user.full_name} has been removed.`,
      });
      fetchUsers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.response?.data?.detail || 'Could not delete user account.',
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Fields',
        description: 'Full name, email, and password are required.',
      });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      await adminApi.createAdmin({
        full_name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
      });

      addToast({
        type: 'success',
        title: 'Admin Created',
        description: `New administrator account created for ${adminName}.`,
      });

      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminPhone('');
      setIsCreateAdminOpen(false);
      fetchUsers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        description: err.response?.data?.detail || 'Could not create admin account.',
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" /> User Management & Admin Directory
          </h1>
          <p className="text-xs text-slate-400">Manage all Teachers, Students, and System Administrators across the campus</p>
        </div>

        <button
          onClick={() => setIsCreateAdminOpen(true)}
          className="btn-primary text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
        >
          <UserPlus className="w-4 h-4" /> Create Admin Account
        </button>
      </div>

      {/* Controls Bar: Search & Role Filter */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Filter Role:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['all', 'admin', 'teacher', 'student'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1 rounded-md capitalize font-semibold transition-all ${
                  selectedRoleFilter === r
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Fetching user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-xs">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {u.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                      {u.role === 'teacher' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <School className="w-3 h-3" /> Teacher
                        </span>
                      )}
                      {u.role === 'student' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                          <GraduationCap className="w-3 h-3" /> Student
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {u.phone || 'N/A'}
                    </td>

                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            u.is_active
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                          title={u.is_active ? 'Disable Account' : 'Enable Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                          title="Delete User Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Account Modal */}
      {isCreateAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-slate-100">Create New Administrator</h2>
              </div>
              <button onClick={() => setIsCreateAdminOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Admin Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="admin@university.edu"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+1 555-0100"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateAdminOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="btn-primary text-xs bg-purple-600 hover:bg-purple-500 border-purple-500"
                >
                  {isCreatingAdmin ? 'Creating...' : 'Create Admin User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
