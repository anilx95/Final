import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, Menu, Shield, GraduationCap, School, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AccessibilityToolbar } from '../accessibility/AccessibilityToolbar';
import { notificationsApi } from '../../api/client';
import { NotificationItem } from '../../types';
import { Badge } from '../ui/Badge';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      notificationsApi.getNotifications()
        .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'admin') {
      return (
        <Badge variant="ai" size="sm">
          <Shield className="w-3 h-3" /> Admin Suite
        </Badge>
      );
    }
    if (role === 'teacher') {
      return (
        <Badge variant="success" size="sm">
          <School className="w-3 h-3" /> Educator Studio
        </Badge>
      );
    }
    return (
      <Badge variant="brand" size="sm">
        <GraduationCap className="w-3 h-3" /> Student Workspace
      </Badge>
    );
  };

  return (
    <header className="h-15 bg-white/95 border-b border-slate-200 backdrop-blur-xl sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden hover:bg-slate-100 transition-colors shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 group min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
            C
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight leading-none flex items-center gap-1">
              ClassAbly <span className="text-[9px] uppercase font-mono font-bold tracking-wider px-1 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200">AI</span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-tight font-medium mt-0.5 hidden sm:block truncate">Smart classroom learning</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Offline sync status */}
        <div className="hidden lg:flex items-center">
          <Badge variant="neutral" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-slate-300">Live Sync</span>
          </Badge>
        </div>

        {/* Role Badge */}
        <div className="hidden md:block">
          {getRoleBadge(user?.role)}
        </div>

        {/* Accessibility Toolbar */}
        <AccessibilityToolbar />

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 bg-white border border-slate-200 rounded-lg shadow-xl p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h4 className="font-bold text-xs text-slate-900">Notifications</h4>
                <Link to="/notifications" onClick={() => setShowNotifications(false)} className="text-[11px] text-teal-700 hover:underline">
                  View All
                </Link>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No unread notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                      <div className="font-semibold text-slate-800">{n.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile & Logout */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
          <Link
            to="/profile"
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-bold text-teal-700">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-medium hidden sm:inline">{user?.full_name}</span>
          </Link>

          <Link
            to="/settings"
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors hidden sm:block"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
