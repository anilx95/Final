import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Cpu,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Clock,
  Video,
  CheckSquare,
  Sparkles,
  HelpCircle,
  FolderDown,
  Volume2,
  Mic,
  Calendar,
  FileCheck,
  UserCheck,
  Building,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const adminNav = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/recordings', label: 'Faculty Recordings', icon: Video },
    { to: '/admin/academics', label: 'Academics & Infrastructure', icon: Building },
    { to: '/admin/devices', label: 'Smart Devices', icon: Cpu },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/admin/system-health', label: 'System Health', icon: Activity },
    { to: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
    { to: '/settings', label: 'System Settings', icon: Settings },
  ];

  const teacherNav = [
    { to: '/teacher', label: 'Educator Home', icon: LayoutDashboard, end: true },
    { to: '/teacher/timetable', label: 'Today Schedule', icon: Clock },
    { to: '/teacher/lecture-studio', label: 'Lecture Studio', icon: Video },
    { to: '/teacher/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/teacher/attendance', label: 'Attendance Marker', icon: CheckSquare },
    { to: '/teacher/student-requests', label: 'Student Requests', icon: HelpCircle },
    { to: '/notifications', label: 'Notifications', icon: FileCheck },
    { to: '/settings', label: 'Account Settings', icon: Settings },
  ];

  const studentNav = [
    { to: '/student', label: 'Student Home', icon: LayoutDashboard, end: true },
    { to: '/student/live-class', label: 'Active Lecture', icon: Video },
    { to: '/student/accessibility', label: 'Accessibility Hub', icon: Sparkles },
    { to: '/student/voice-assistant', label: 'Voice Assistant', icon: Mic },
    { to: '/student/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/student/study-materials', label: 'Study Materials', icon: FolderDown },
    { to: '/student/lecture-history', label: 'Lecture History', icon: Calendar },
    { to: '/notifications', label: 'Notifications', icon: FileCheck },
    { to: '/profile', label: 'My Profile', icon: UserCheck },
  ];

  const items = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-slate-900/95 border-r border-slate-800 transition-transform duration-300 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              {role === 'admin' ? 'Administrative Suite' : role === 'teacher' ? 'Faculty Studio' : 'Student Portal'}
            </p>
            <nav className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Info Footer Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-100 truncate">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 capitalize">{role} Account</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
