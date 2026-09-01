import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu, User, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/client';
import { NotificationItem } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
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

  return (
    <header className="h-16 bg-white px-4 sm:px-8 flex items-center justify-between border-b border-slate-200/80 sticky top-0 z-30">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-black text-sm text-[#1d3bb5]">ClassAbly</span>
      </div>

      {/* Center/Left Search Bar (Exact Reference Match) */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search users, classes..."
          className="w-full bg-[#f8fafc] border border-slate-200/90 rounded-full pl-10 pr-4 py-1.5 text-xs sm:text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1d3bb5] focus:bg-white transition-all shadow-2xs"
        />
      </div>

      {/* Top Right Actions (Bell + Profile) */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-50 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="font-bold text-xs text-slate-900">Notifications</h4>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] text-[#1d3bb5] hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No unread notifications</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div className="font-semibold text-slate-800">{n.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Circle Icon / Avatar */}
        <Link
          to="/profile"
          className="p-1 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
          title={user?.full_name || 'Profile'}
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200/90 flex items-center justify-center text-slate-700 font-bold text-xs overflow-hidden shadow-2xs">
            {user?.full_name ? (
              <span className="text-[11px] font-bold text-slate-700">{user.full_name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};
