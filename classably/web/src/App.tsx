import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { ToastProvider } from './context/ToastContext';

import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Profile } from './pages/auth/Profile';
import { Settings } from './pages/auth/Settings';

// Admin Portal Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { AcademicsManagement } from './pages/admin/AcademicsManagement';
import { DeviceManagement } from './pages/admin/DeviceManagement';
import { AuditLogs } from './pages/admin/AuditLogs';
import { SystemHealth } from './pages/admin/SystemHealth';
import { AnalyticsDashboard } from './pages/admin/AnalyticsDashboard';

// Teacher Portal Pages
import { TeacherHome } from './pages/teacher/TeacherHome';
import { LectureStudio } from './pages/teacher/LectureStudio';
import { TeacherAssignments } from './pages/teacher/TeacherAssignments';
import { TeacherAttendance } from './pages/teacher/TeacherAttendance';
import { StudentRequests } from './pages/teacher/StudentRequests';

// Student Portal Pages
import { StudentHome } from './pages/student/StudentHome';
import { AccessibilityHub } from './pages/student/AccessibilityHub';
import { StudentLiveLecture } from './pages/student/StudentLiveLecture';
import { VoiceAssistantStudio } from './pages/student/VoiceAssistantStudio';
import { StudentStudyMaterials } from './pages/student/StudentStudyMaterials';
import { LectureHistory } from './pages/student/LectureHistory';

// Common Pages
import { NotificationsPage } from './pages/NotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RoleRootRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
};

const router = createBrowserRouter([
  // Public Auth Routes
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },

  // Protected Enterprise Portals (nested)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <RoleRootRedirect /> },
          { path: '/profile', element: <Profile /> },
          { path: '/settings', element: <Settings /> },
          { path: '/notifications', element: <NotificationsPage /> },

          // Admin routes
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { path: '/admin', element: <AdminDashboard /> },
              { path: '/admin/users', element: <UserManagement /> },
              { path: '/admin/academics', element: <AcademicsManagement /> },
              { path: '/admin/devices', element: <DeviceManagement /> },
              { path: '/admin/audit-logs', element: <AuditLogs /> },
              { path: '/admin/system-health', element: <SystemHealth /> },
              { path: '/admin/analytics', element: <AnalyticsDashboard /> },
            ],
          },

          // Teacher routes
          {
            element: <ProtectedRoute allowedRoles={['teacher']} />,
            children: [
              { path: '/teacher', element: <TeacherHome /> },
              { path: '/teacher/timetable', element: <TeacherHome /> },
              { path: '/teacher/lecture-studio', element: <LectureStudio /> },
              { path: '/teacher/assignments', element: <TeacherAssignments /> },
              { path: '/teacher/attendance', element: <TeacherAttendance /> },
              { path: '/teacher/student-requests', element: <StudentRequests /> },
            ],
          },

          // Student routes
          {
            element: <ProtectedRoute allowedRoles={['student']} />,
            children: [
              { path: '/student', element: <StudentHome /> },
              { path: '/student/live-class', element: <StudentLiveLecture /> },
              { path: '/student/accessibility', element: <AccessibilityHub /> },
              { path: '/student/voice-assistant', element: <VoiceAssistantStudio /> },
              { path: '/student/assignments', element: <TeacherAssignments /> },
              { path: '/student/study-materials', element: <StudentStudyMaterials /> },
              { path: '/student/lecture-history', element: <LectureHistory /> },
            ],
          },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccessibilityProvider>
          <ToastProvider>
            <RouterProvider router={router} future={{ v7_startTransition: true, v7_relativeSplatPath: true }} />
          </ToastProvider>
        </AccessibilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
export default App;
