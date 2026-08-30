import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { notificationsApi } from '../api/client';
import { NotificationItem } from '../types';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const NotificationsPage: React.FC = () => {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getNotifications();
      setNotifications(Array.isArray(res.data) ? res.data : []);
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
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
          <Bell className="w-5 h-5 text-sky-400" /> Notifications Inbox
        </h1>
        <p className="text-xs text-slate-400 mt-1">Class schedule updates, OCR board scan alerts, and system notifications</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-6 h-6 text-slate-400" />}
            title="All Caught Up"
            description="You don't have any unread notifications or announcements right now."
          />
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              variant={!n.is_read ? 'ai' : 'default'}
              className="p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
                  <h3 className="font-bold text-slate-100 text-sm tracking-tight">{n.title}</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">{n.message}</p>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>

              {!n.is_read && (
                <Button
                  onClick={() => handleMarkRead(n.id)}
                  variant="secondary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Mark Read
                </Button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
