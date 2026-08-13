import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, FileCheck } from 'lucide-react';
import { notificationsApi } from '../api/client';
import { NotificationItem } from '../types';
import { useToast } from '../context/ToastContext';

export const NotificationsPage: React.FC = () => {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      addToast({
        type: 'success',
        title: 'Marked Read',
        description: 'Notification status updated.',
      });
    } catch (err) {}
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <Bell className="w-6 h-6 text-sky-400" /> Notifications Inbox
        </h1>
        <p className="text-xs text-slate-400">Class schedule updates, OCR board scan alerts, and system notifications</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-8 text-slate-400 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-12 text-slate-400 text-xs">No notifications found.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`card p-4 flex items-start justify-between gap-4 border transition-all ${
                !n.is_read ? 'bg-sky-950/20 border-sky-500/40' : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                  <h3 className="font-bold text-slate-100 text-sm">{n.title}</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="btn-secondary text-xs shrink-0 py-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
