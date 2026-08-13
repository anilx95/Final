import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User as UserIcon, Settings, Menu, Shield, GraduationCap, School } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccessibilityToolbar } from '../accessibility/AccessibilityToolbar';
import { notificationsApi } from '../../api/client';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      notificationsApi.getNotifications()
        .then((res) => setNotifications(res.data))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
          <Shield className="w-3 h-3" /> Admin Portal
        </span>
      );
    }
    if (role === 'teacher') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <School className="w-3 h-3" /> Educator Portal
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
        <GraduationCap className="w-3 h-3" /> Student Portal
      </span>
    );
  };

  return (
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-white rounded-lg lg:hidden hover:bg-slate-800"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            C
          </div>
          <div>
            <div className="font-extrabold text-lg text-slate-100 tracking-tight leading-none flex items-center gap-2">
              ClassAbly <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">Enterprise</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-medium">Smart Classroom Accessibility</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Sync Status & Navigation Actions */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-emerald-400 font-bold" title="Sync Status">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Offline Sync Ready
          </span>
        </div>

        {/* Role Badge */}
        <div className="hidden md:block">
          {getRoleBadge(user?.role)}
        </div>


        {/* Accessibility Toolbar */}
        <AccessibilityToolbar />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="font-semibold text-sm text-slate-100">Notifications</h4>
                <Link to="/notifications" onClick={() => setShowNotifications(false)} className="text-xs text-sky-400 hover:underline">
                  View All
                </Link>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No unread notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                      <div className="font-semibold text-slate-200">{n.title}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <Link
            to="/profile"
            className="flex items-center gap-2 text-slate-200 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{user?.full_name}</span>
          </Link>

          <Link
            to="/settings"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors hidden sm:block"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
