import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Shield, GraduationCap, School, CheckCircle2, XCircle, Power, Trash2, UserPlus, X } from 'lucide-react';
import { adminApi } from '../../api/client';
import { User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

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
      setUsers(Array.isArray(res.data) ? res.data : []);
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
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] flex items-center gap-2.5 tracking-tight">
            <Users className="w-5 h-5 text-[#1d43d9]" /> User Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage all Teachers, Students, and System Administrators across the campus</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateAdminOpen(true)}
          className="px-4 py-2 bg-[#1d43d9] hover:bg-[#1534b0] text-white text-xs sm:text-sm font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Admin Account</span>
        </button>
      </div>

      {/* Controls Bar: Search & Role Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9] focus:bg-white placeholder-slate-400 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/60 text-xs">
            {['all', 'admin', 'teacher', 'student'].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1 rounded-md capitalize font-semibold transition-all duration-150 ${
                  selectedRoleFilter === r
                    ? 'bg-white text-[#1d43d9] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10.5px] tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">USER</th>
                <th className="py-3.5 px-4 sm:px-6">ROLE</th>
                <th className="py-3.5 px-4 sm:px-6">PHONE</th>
                <th className="py-3.5 px-4 sm:px-6">STATUS</th>
                <th className="py-3.5 px-4 sm:px-6">REGISTERED</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Fetching user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-[13px]">{u.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      {u.role === 'admin' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ede9fe] text-[#7c3aed]">
                          Admin
                        </span>
                      )}
                      {u.role === 'teacher' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#cffafe] text-[#0891b2]">
                          Teacher
                        </span>
                      )}
                      {u.role === 'student' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f1f5f9] text-[#475569]">
                          Student
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono text-[11px]">
                      {u.phone || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      {u.is_active ? (
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-slate-500 text-xs">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Recent'}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            u.is_active
                              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={u.is_active ? 'Disable Account' : 'Enable Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
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
        <Modal
          isOpen={isCreateAdminOpen}
          onClose={() => setIsCreateAdminOpen(false)}
          title="Create New Administrator"
          description="Add a system administrator with full access to campus infrastructure."
          size="md"
        >
          <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs pt-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Admin Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                placeholder="admin@university.edu"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
              <input
                type="text"
                placeholder="+1 555-0100"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => setIsCreateAdminOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="px-4 py-2 bg-[#1d43d9] hover:bg-[#1534b0] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
              >
                Create Admin User
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
