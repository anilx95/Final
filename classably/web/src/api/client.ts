import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('classably_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Endpoints
export const authApi = {
  login: (data: any) => api.post('/api/auth/login', data),
  register: (data: any) => api.post('/api/auth/register', data),
  sendOtp: (email: string, purpose: 'register' | 'login' | 'reset_password' = 'register') =>
    api.post('/api/auth/otp/send', { email, purpose }),
  verifyOtp: (email: string, otp: string, purpose: 'register' | 'login' | 'reset_password' = 'register') =>
    api.post('/api/auth/otp/verify', { email, otp, purpose }),
  loginWithOtp: (email: string, otp: string) =>
    api.post('/api/auth/login-with-otp', { email, otp }),
  resetPasswordWithOtp: (data: { email: string; otp: string; new_password: string; confirm_password?: string }) =>
    api.post('/api/auth/reset-password-with-otp', data),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data: any) => api.put('/api/auth/profile', data),
  forgotPassword: (data: any) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data: any) => api.post('/api/auth/reset-password', data),
};

// Admin Endpoints
export const adminApi = {
  getOverview: () => api.get('/admin/overview-stats'),
  getSystemHealth: () => api.get('/admin/system-health'),
  getDepartments: () => api.get('/admin/departments'),
  createDepartment: (data: any) => api.post('/admin/departments', data),
  getCourses: (departmentId?: number) => api.get('/admin/courses', { params: { department_id: departmentId } }),
  createCourse: (data: any) => api.post('/admin/courses', data),
  getAcademicYears: () => api.get('/admin/academic-years'),
  createAcademicYear: (data: any) => api.post('/admin/academic-years', data),
  getSubjects: (courseId?: number) => api.get('/admin/subjects', { params: { course_id: courseId } }),
  createSubject: (data: any) => api.post('/admin/subjects', data),
  getBuildings: () => api.get('/admin/buildings'),
  createBuilding: (data: any) => api.post('/admin/buildings', data),
  getClassrooms: () => api.get('/admin/classrooms'),
  createClassroom: (data: any) => api.post('/admin/classrooms', data),
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  updateUserStatus: (userId: number, isActive: boolean) => api.put(`/admin/users/${userId}/status`, { is_active: isActive }),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
  createAdmin: (data: any) => api.post('/admin/create-admin', data),
  getTeacherRecordings: () => api.get('/admin/teacher-recordings'),
  getAuditLogs: (limit = 50) => api.get('/admin/audit-logs', { params: { limit } }),
};

// Academic & Content Endpoints
export const academicsApi = {
  getTodayTimetable: () => api.get('/academics/timetable/today'),
  createTimetableSlot: (data: any) => api.post('/academics/timetable', data),
  updateTimetableSlot: (id: number, data: any) => api.put(`/academics/timetable/${id}`, data),
  deleteTimetableSlot: (id: number) => api.delete(`/academics/timetable/${id}`),
  getAssignments: (subjectId?: number) => api.get('/academics/assignments', { params: { subject_id: subjectId } }),
  createAssignment: (formData: FormData) => api.post('/academics/assignments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  submitAssignment: (assignmentId: number, formData: FormData) => api.post(`/academics/assignments/${assignmentId}/submit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getStudyMaterials: (subjectId?: number) => api.get('/academics/study-materials', { params: { subject_id: subjectId } }),
  uploadStudyMaterial: (formData: FormData) => api.post('/academics/study-materials', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Lecture Session & Studio Endpoints
export const lectureApi = {
  startSession: (data: { classroom_id: number; subject: string; topic?: string }) =>
    api.post('/api/lecture-session/start', null, { params: data }),
  getActiveSession: (classroomId: number) => api.get(`/api/lecture-session/active/${classroomId}`),
  getAllActiveSessions: () => api.get('/api/lecture-session/active-sessions'),
  getTeachers: () => api.get('/api/lecture-session/teachers'),
  endSession: (sessionId: number) => api.post(`/api/lecture-session/end/${sessionId}`),
  ingestSubtitle: (data: { session_id: number; text: string; speaker_name?: string; target_lang?: string; id?: number; broadcast?: boolean }) =>
    api.post('/api/lecture-session/subtitles/ingest', data),
  getSubtitles: (sessionId: number, targetLang = 'en') =>
    api.get(`/api/lecture-session/subtitles/${sessionId}`, { params: { target_lang: targetLang } }),
  translate: (data: { text: string; target_lang: string }) =>
    api.post('/api/lecture-session/translate', data),
  raiseHand: (data: { session_id: number; student_id?: number; question_text?: string }) =>
    api.post('/api/lecture-session/raise-hand', data),
  getRaiseHandQueue: (sessionId: number) => api.get(`/api/lecture-session/raise-hand/${sessionId}`),
  resolveRaiseHand: (eventId: number) => api.post(`/api/lecture-session/raise-hand/${eventId}/resolve`),
  generateQuiz: (sessionId: number) => api.post(`/api/lecture-session/generate-quiz/${sessionId}`),
  getQuiz: (sessionId: number) => api.get(`/api/lecture-session/quiz/${sessionId}`),
  uploadRecording: (sessionId: number, formData: FormData) => api.post(`/api/lecture-session/upload-recording/${sessionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getHistory: (classroomId?: number) => api.get('/api/lecture-session/history', { params: { classroom_id: classroomId } }),

  // Connected Students & Session Management
  connectStudent: (data: { session_id: number; peer_id?: string }) =>
    api.post('/api/lecture-session/connect', data),
  disconnectStudent: (data: { session_id: number }) =>
    api.post('/api/lecture-session/disconnect', data),
  getConnectedStudents: (sessionId: number) =>
    api.get(`/api/lecture-session/connected/${sessionId}`),
  kickStudent: (sessionId: number, studentId: number) =>
    api.post(`/api/lecture-session/kick/${sessionId}/${studentId}`),
  markAttendance: (sessionId: number, overrides?: Record<string, string>) =>
    api.post(`/api/lecture-session/mark-attendance/${sessionId}`, { overrides }),
};

// AI Q&A Endpoints
export const aiQaApi = {
  askQuestion: (data: { session_id: number; question: string }) =>
    api.post('/api/ai-qa/ask', data),
  getQAHistory: (sessionId: number) =>
    api.get(`/api/ai-qa/history/${sessionId}`),
  clearQAHistory: (sessionId: number) =>
    api.delete(`/api/ai-qa/history/${sessionId}`),
  summarizeLecture: (sessionId: number, style: string = 'detailed') =>
    api.post(`/api/ai-qa/summarize/${sessionId}`, { style }),
  getSummary: (sessionId: number) =>
    api.get(`/api/ai-qa/summary/${sessionId}`),
  visualizeDiagram: (data: { topic: string; transcript?: string; subject?: string; target_lang?: string }) =>
    api.post('/api/ai-qa/visualize', data),
};

// Smart Devices & Sensors
export const devicesApi = {
  getDevices: (classroomId = 1) => api.get('/api/devices', { params: { classroom_id: classroomId } }),
  getSensors: (classroomId: number) => api.get(`/api/devices/sensors/${classroomId}`),
  sendCommand: (deviceId: number, cmd: { action: string; value?: any }) =>
    api.post(`/api/devices/${deviceId}/command`, cmd),
  seedDevices: (classroomId: number) => api.post(`/api/devices/seed/${classroomId}`),
};

// Voice Assistant
export const voiceApi = {
  sendCommand: (data: { student_id: number; classroom_id: number; text: string }) =>
    api.post('/api/voice', data),
  getHistory: (studentId: number) => api.get(`/api/voice/history/${studentId}`),
};

// OCR & AI
export const ocrApi = {
  performOcr: (formData: FormData) => api.post('/api/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Camera Service
export const cameraApi = {
  getHealth: () => api.get('/camera/health'),
  uploadFrame: (formData: FormData) => api.post('/camera/frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Accessibility Requests & Events
export const accessibilityApi = {
  createEvent: (data: any) => api.post('/api/accessibility', data),
  getEvents: (studentId: number) => api.get(`/api/accessibility/${studentId}`),
};

// Notifications
export const notificationsApi = {
  getNotifications: () => api.get('/api/notifications'),
  markRead: (id: number) => api.patch(`/api/notifications/${id}/read`),
};

// Dashboard Overview
export const dashboardApi = {
  getOverview: () => api.get('/api/dashboard/overview'),
  getAttendance: () => api.get('/api/dashboard/attendance'),
  getVoice: () => api.get('/api/dashboard/voice'),
  getDevices: () => api.get('/api/dashboard/devices'),
  getAccessibility: () => api.get('/api/dashboard/accessibility'),
  getClassrooms: () => api.get('/api/dashboard/classrooms'),
  getAnalytics: () => api.get('/api/analytics'),
};

// Export & Downloads
export const exportApi = {
  downloadTranscriptUrl: (sessionId: number) => `${api.defaults.baseURL || ''}/api/export/transcript/${sessionId}/txt`,
  downloadSubtitlesUrl: (sessionId: number) => `${api.defaults.baseURL || ''}/api/export/subtitles/${sessionId}/vtt`,
  downloadSummaryUrl: (sessionId: number) => `${api.defaults.baseURL || ''}/api/export/summary/${sessionId}/pdf`,
  downloadRecordingUrl: (sessionId: number) => `${api.defaults.baseURL || ''}/api/export/recording/${sessionId}/download`,
  downloadAudioUrl: (sessionId: number) => `${api.defaults.baseURL || ''}/api/export/audio/${sessionId}/download`,
};

// Students Management
export const studentsApi = {
  getStudents: () => api.get('/api/students'),
  getStudentById: (id: number) => api.get(`/api/students/${id}`),
};

// Teachers Management
export const teachersApi = {
  getTeachers: () => api.get('/api/teachers'),
  getTeacherById: (id: number) => api.get(`/api/teachers/${id}`),
};

// Classrooms Management
export const classroomsApi = {
  getClassrooms: () => api.get('/api/classrooms'),
  getClassroomById: (id: number) => api.get(`/api/classrooms/${id}`),
};

// Attendance Service
export const attendanceApi = {
  markAttendance: (data: { student_id: number; classroom_id?: number; status: 'present' | 'absent' | 'late'; timestamp?: string }) =>
    api.post('/api/attendance', data),
  getAttendance: (classroomId?: number) =>
    api.get('/api/attendance', { params: { classroom_id: classroomId } }),
};

// General Student Assist Requests
export const assistApi = {
  createRequest: (data: { student_id: number; classroom_id: number; message: string; category?: string }) =>
    api.post('/api/assist', data),
  getRequests: (classroomId?: number) =>
    api.get('/api/assist', { params: { classroom_id: classroomId } }),
  resolveRequest: (id: number) => api.post(`/api/assist/${id}/resolve`),
};

// AI Notes Service
export const notesApi = {
  getNotes: () => api.get('/api/notes'),
  createNote: (data: { title: string; content: string; subject?: string; classroom_id?: number }) =>
    api.post('/api/notes', data),
  getClassroomNotes: (classroomId: number) => api.get(`/api/notes/classroom/${classroomId}`),
};

// Adaptive Profiles & Recommendations
export const profilesApi = {
  getRecommendation: (studentId: number) => api.get(`/api/profiles/recommendation/${studentId}`),
  createProfileEvent: (data: { student_id: number; event_type: string; details?: any }) =>
    api.post('/api/profiles/event', data),
};

// Offline Sync Service
export const syncApi = {
  batchSync: (data: { items: any[] }) => api.post('/api/sync/batch', data),
  getPendingSync: () => api.get('/api/sync/pending'),
};

// Campus Navigation & Wayfinding
export const navigationApi = {
  getRoute: (params: { origin: string; destination: string }) => api.get('/api/navigation/route', { params }),
  getMap: () => api.get('/api/navigation/map'),
};

// Teacher Dashboard Aggregate
export const teacherDashboardApi = {
  getTeacherDashboard: (teacherId: number) => api.get(`/api/teacher-dashboard/${teacherId}`),
};

// Live System Events Feed
export const eventsApi = {
  getLatestEvents: () => api.get('/events/latest'),
};

// Audit v2 Endpoint
export const auditV2Api = {
  getLogs: (limit = 50) => api.get('/api/audit', { params: { limit } }),
  logEvent: (data: { action: string; resource: string; details?: any }) => api.post('/api/audit', data),
};
