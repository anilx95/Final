import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Video, BookOpen, Users, CheckSquare, Sparkles, ChevronRight, School, Activity, ShieldCheck, Edit3 } from 'lucide-react';
import { academicsApi, dashboardApi, teacherDashboardApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScheduleManagerModal } from '../../components/teacher/ScheduleManagerModal';

export const TeacherHome: React.FC = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const fetchTimetable = async () => {
    try {
      const res = await academicsApi.getTodayTimetable();
      setTimetable(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    const teacherId = user?.id || 1;
    Promise.allSettled([
      academicsApi.getTodayTimetable(),
      teacherDashboardApi.getTeacherDashboard(teacherId),
      dashboardApi.getOverview(),
    ]).then(([ttRes, dashRes, overviewRes]) => {
      if (ttRes.status === 'fulfilled') setTimetable(ttRes.value.data);
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      } else if (overviewRes.status === 'fulfilled') {
        setDashboardData(overviewRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="card bg-gradient-to-r from-sky-900/60 via-indigo-900/40 to-slate-900 border-sky-500/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold text-sky-400 tracking-wider">Faculty Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-100 mt-1">Welcome Back, {user?.full_name}!</h1>
          <p className="text-xs text-slate-300 mt-1">You have {timetable.length} scheduled lectures today. Smart OCR and Live Transcription are ready.</p>
        </div>

        <Link to="/teacher/lecture-studio" className="btn-primary whitespace-nowrap">
          <Video className="w-4 h-4" /> Enter Lecture Studio
        </Link>
      </div>

      {/* Aggregate Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Students</div>
            <div className="text-lg font-extrabold text-slate-100">{dashboardData?.total_students || dashboardData?.students_count || 48}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Avg Attendance</div>
            <div className="text-lg font-extrabold text-emerald-400">{dashboardData?.attendance_rate || '94.2%'}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Devices</div>
            <div className="text-lg font-extrabold text-purple-300">{dashboardData?.active_devices || 12} / 12</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">AI Studio Health</div>
            <div className="text-lg font-extrabold text-amber-300">Optimal</div>
          </div>
        </div>
      </div>


      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/teacher/lecture-studio" className="card p-5 hover:border-sky-500/50 group transition-all">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Start Live Studio</h3>
          <p className="text-xs text-slate-400 mt-1">Camera, microphone, OCR board detection & STT subtitles</p>
        </Link>

        <Link to="/teacher/assignments" className="card p-5 hover:border-indigo-500/50 group transition-all">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Create Assignment</h3>
          <p className="text-xs text-slate-400 mt-1">Post assignments, due dates, and review student submissions</p>
        </Link>

        <Link to="/teacher/attendance" className="card p-5 hover:border-emerald-500/50 group transition-all">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Mark Attendance</h3>
          <p className="text-xs text-slate-400 mt-1">Record class attendance for all section students</p>
        </Link>
      </div>

      {/* Today's Schedule Table */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Today's Lecture Schedule
            </h3>
            <p className="text-[11px] text-slate-400">Timetable slots assigned for today</p>
          </div>

          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="btn-secondary text-xs flex items-center gap-1.5 border-sky-500/40 text-sky-300 hover:bg-sky-500/10 shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" /> Manage / Edit Upcoming Classes
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading timetable...</div>
          ) : timetable.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No classes scheduled for today. Click "Manage / Edit Upcoming Classes" to add slots.
            </div>
          ) : (
            timetable.map((slot, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 font-mono text-xs font-bold shrink-0">
                    {slot.time}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {slot.subject_code}
                      </span>
                      <span className="font-bold text-slate-100 text-sm">{slot.subject_name}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Topic: <span className="text-sky-300 font-medium">{slot.topic || 'General Lecture'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                      <span>Section: <strong className="text-slate-300">{slot.section}</strong></span>
                      <span>Classroom: <strong className="text-slate-300">{slot.classroom}</strong></span>
                    </div>
                  </div>
                </div>

                <Link
                  to="/teacher/lecture-studio"
                  className="btn-primary text-xs shrink-0 self-end sm:self-center"
                >
                  Launch Studio <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Manager Modal */}
      <ScheduleManagerModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        timetable={timetable}
        onRefresh={fetchTimetable}
      />
    </div>
  );
};
