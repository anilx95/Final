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
  Mic,
  Calendar,
  FileCheck,
  UserCheck,
  Building,
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
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-15 left-0 z-40 w-60 h-[calc(100vh-3.75rem)] bg-white border-r border-slate-200 transition-transform duration-200 flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-3 space-y-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2.5 mb-2">
              {role === 'admin' ? 'Administrative Suite' : role === 'teacher' ? 'Faculty Studio' : 'Student Portal'}
            </p>
            <nav className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-teal-50 text-teal-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-teal-600" />
                        )}
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Info Footer Card */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-white border border-slate-200">
            <div className="w-7 h-7 rounded-md bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-100 truncate">{user?.full_name}</div>
              <div className="text-[10px] text-slate-400 capitalize font-medium">{role}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
