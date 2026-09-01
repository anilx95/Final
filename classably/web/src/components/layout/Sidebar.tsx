import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Cpu,
  FileText,
  Activity,
  BarChart3,
  Settings,
  Clock,
  Video,
  CheckSquare,
  Sparkles,
  FolderDown,
  Mic,
  Calendar,
  FileCheck,
  UserCheck,
  Building,
  GraduationCap,
  User,
  LogOut,
  Film,
  MessageSquare,
  Brain,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'student';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNav = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/recordings', label: 'Faculty Recordings', icon: Video },
    { to: '/admin/academics', label: 'Academics & Infrastructure', icon: Building },
    { to: '/admin/devices', label: 'Smart Devices', icon: Cpu },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { to: '/admin/system-health', label: 'System Health', icon: Activity },
    { to: '/admin/analytics', label: 'Platform Analytics', icon: BarChart3 },
  ];

  const teacherNav = [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/teacher/lecture-studio', label: 'Live Classes', icon: Video },
    { to: '/teacher/assignments', label: 'Assignments', icon: FileCheck },
    { to: '/teacher/artifacts', label: 'Artifacts & Recordings', icon: FolderDown },
    { to: '/teacher/quizzes', label: 'AI Quizzes & Flashcards', icon: Sparkles },
    { to: '/profile', label: 'Profile', icon: User },
    { to: '/teacher/attendance', label: 'Today Attendance', icon: CheckSquare },
    { to: '/teacher/student-requests', label: 'Unresolved Questions', icon: Settings },
  ];

  const studentNav = [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/live-class', label: 'Live Class', icon: Video },
    { to: '/student/lecture-history', label: 'Lecture Downloads & Recordings', icon: GraduationCap },
    { to: '/student/live-class#questions', label: 'Questions', icon: MessageSquare },
    { to: '/student/lecture-summaries', label: 'AI Lecture Summary & Study Notes', icon: Sparkles },
    { to: '/student/classroom-assistant', label: 'AI Classroom Assistant', icon: Brain },
  ];

  const items = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-56 h-screen bg-white border-r border-slate-200/80 transition-transform duration-200 flex flex-col justify-between shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="p-4 pb-5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1d3bb5] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
              C
            </div>
            <div>
              <div className="text-base font-black text-[#0f172a] tracking-tight leading-none">
                ClassAbly
              </div>
              <div className="text-[10.5px] text-slate-500 font-normal mt-1">
                Smart Classroom
              </div>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="px-2.5 space-y-0.5 overflow-y-auto flex-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to + item.label}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-all duration-150 relative ${
                      isActive
                        ? 'bg-[#f0f4ff] text-[#1d3bb5]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#1d3bb5]' : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l bg-[#1d3bb5]" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Nav Section */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          {role !== 'teacher' && (
            <>
              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-colors ${
                    isActive
                      ? 'bg-[#f0f4ff] text-[#1d3bb5]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <User className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Profile</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-tight transition-colors ${
                    isActive
                      ? 'bg-[#f0f4ff] text-[#1d3bb5]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Settings</span>
              </NavLink>
            </>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold text-left mt-1"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};
