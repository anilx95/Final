export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  college_name?: string;
  phone?: string;
  avatar_url?: string;
  classroom_id?: number;
  created_at?: string;
  student?: StudentProfile;
  teacher?: TeacherProfile;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  name: string;
  college_name?: string;
  roll_number: string;
  course_id?: number;
  classroom_id?: number;
  disability_profiles?: string[];
  preferred_language?: string;
}

export interface TeacherProfile {
  id: number;
  user_id: number;
  name: string;
  email: string;
  employee_id: string;
  college_name?: string;
  department_id?: number;
  phone?: string;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  description?: string;
  head_of_department?: string;
  total_courses?: number;
  total_teachers?: number;
}

export interface Course {
  id: number;
  department_id: number;
  code: string;
  name: string;
  duration_years: number;
  department_name?: string;
}

export interface AcademicYear {
  id: number;
  year_label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Subject {
  id: number;
  course_id: number;
  semester_id?: number;
  code: string;
  name: string;
  credits: number;
  description?: string;
}

export interface Building {
  id: number;
  code: string;
  name: string;
  total_floors: number;
  has_elevator: boolean;
  has_wheelchair_ramps: boolean;
  floors_count?: number;
}

export interface Classroom {
  id: number;
  name: string;
  code?: string;
  building?: string;
  floor?: number;
  room_number?: string;
  capacity?: number;
  has_wheelchair_ramp?: boolean;
  has_smart_board?: boolean;
  has_audio_system?: boolean;
  devices_count?: number;
  cameras_count?: number;
  students_count?: number;
}

export interface SmartDevice {
  id: number;
  classroom_id: number;
  device_type: string;
  name: string;
  state: Record<string, any>;
  status: string;
  last_updated?: string;
}

export interface SensorMetric {
  id: number;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface LectureSession {
  id: number;
  classroom_id: number;
  teacher_id: number;
  subject: string;
  topic?: string;
  status: 'ACTIVE' | 'ENDED';
  started_at: string;
  ended_at?: string;
}

export interface LiveSubtitle {
  id: number;
  speaker: string;
  text: string;
  original_text?: string;
  translated_text?: string;
  language?: string;
  translations?: Record<string, string>;
  timestamp: string;
}

export interface RaiseHandItem {
  id: number;
  student_id: number;
  student_name: string;
  question_text: string;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'flashcard';
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  action: string;
  module: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface TimetableItem {
  id: number;
  time: string;
  subject_code: string;
  subject_name: string;
  topic?: string;
  section: string;
  teacher_name?: string;
  classroom: string;
  classroom_id?: number;
  day?: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  subject_id: number;
  due_date: string;
  max_marks: number;
  file_path?: string;
  teacher_name?: string;
  submissions_count?: number;
}

export interface StudyMaterial {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  language: string;
  teacher_name?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface SystemHealth {
  database: { status: string; engine: string };
  ai_pipeline: { status: string; models: string[] };
  devices: { total: number; online: number; health_pct: number };
  cameras: { total: number; active: number };
  system_version: string;
  uptime: string;
}

export interface OverviewStats {
  departments: number;
  courses: number;
  classrooms: number;
  teachers: number;
  students: number;
  active_sessions: number;
  total_recordings: number;
  accessibility_requests: number;
  smart_devices: number;
  board_ocr_captures: number;
}

export interface AIQAMessage {
  id: number;
  student_id: number;
  student_name?: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface AILectureSummary {
  id: number;
  session_id: number;
  summary_text: string;
  key_points: string[];
  definitions: string[];
  formulas: string[];
  style: string;
  created_at: string;
}

export interface ConnectedStudentItem {
  id: number;
  student_id: number;
  student_name: string;
  peer_id?: string;
  joined_at: string;
}
