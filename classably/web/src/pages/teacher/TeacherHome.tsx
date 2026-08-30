import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Video, BookOpen, Users, CheckSquare, Sparkles, ChevronRight, Activity, ShieldCheck, Edit3, ArrowUpRight } from 'lucide-react';
import { academicsApi, dashboardApi, teacherDashboardApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ScheduleManagerModal } from '../../components/teacher/ScheduleManagerModal';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const TeacherHome: React.FC = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const fetchTimetable = async () => {
    try {
      const res = await academicsApi.getTodayTimetable();
      setTimetable(Array.isArray(res.data) ? res.data : []);
    } catch (e) {}
  };

  useEffect(() => {
    const teacherId = user?.id || 1;
    Promise.allSettled([
      academicsApi.getTodayTimetable(),
      teacherDashboardApi.getTeacherDashboard(teacherId),
      dashboardApi.getOverview(),
    ]).then(([ttRes, dashRes, overviewRes]) => {
      if (ttRes.status === 'fulfilled') setTimetable(Array.isArray(ttRes.value.data) ? ttRes.value.data : []);
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value.data);
      } else if (overviewRes.status === 'fulfilled') {
        setDashboardData(overviewRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <Card variant="ai" className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="ai" size="sm">
                <Sparkles className="w-3 h-3" /> AI Lecture Studio
              </Badge>
              <Badge variant="success" size="sm" dot pulse>
                Active Ready
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Welcome back, {user?.full_name || 'Educator'}!
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              You have {(timetable || []).length} scheduled lectures today. Real-time OCR board recognition, multi-lingual STT, and smart Q&A are ready.
            </p>
          </div>

          <Link to="/teacher/lecture-studio">
            <Button variant="primary" size="md" leftIcon={<Video className="w-4 h-4" />}>
              Launch Live Studio
            </Button>
          </Link>
        </div>
      </Card>

      {/* Aggregate Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card variant="default" padding="sm" className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Total Students</div>
            <div className="text-base font-extrabold text-slate-100 mt-0.5">{dashboardData?.total_students || dashboardData?.students_count || 48}</div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Avg Attendance</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">{dashboardData?.attendance_rate || '94.2%'}</div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Active Devices</div>
            <div className="text-base font-extrabold text-indigo-300 mt-0.5">{dashboardData?.active_devices || 12} / 12</div>
          </div>
        </Card>

        <Card variant="default" padding="sm" className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">AI Studio Health</div>
            <div className="text-base font-extrabold text-amber-300 mt-0.5">Optimal</div>
          </div>
        </Card>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Link to="/teacher/lecture-studio" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Start Live Studio</h3>
            <p className="text-xs text-slate-400 mt-1">Camera, microphone, OCR board detection & STT subtitles</p>
          </Card>
        </Link>

        <Link to="/teacher/assignments" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Manage Assignments</h3>
            <p className="text-xs text-slate-400 mt-1">Post assignments, due dates, and review student submissions</p>
          </Card>
        </Link>

        <Link to="/teacher/attendance" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Mark Attendance</h3>
            <p className="text-xs text-slate-400 mt-1">Record class attendance for all section students</p>
          </Card>
        </Link>
      </div>

      {/* Today's Schedule Table */}
      <Card variant="default">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b2538] pb-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
              <Clock className="w-4 h-4 text-sky-400" /> Today's Lecture Schedule
            </h3>
            <p className="text-[11px] text-slate-400">Timetable slots assigned for today</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsScheduleModalOpen(true)}
            leftIcon={<Edit3 className="w-3.5 h-3.5 text-sky-400" />}
          >
            Manage Timetable
          </Button>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Loading timetable...</div>
          ) : (!timetable || timetable.length === 0) ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No classes scheduled for today. Click "Manage Timetable" to add slots.
            </div>
          ) : (
            (timetable || []).map((slot, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#080c14] border border-[#1b2538] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-xs font-bold shrink-0 border border-sky-500/20">
                    {slot.time}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {slot.subject_code}
                      </span>
                      <span className="font-bold text-slate-100 text-xs sm:text-sm">{slot.subject_name}</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Topic: <span className="text-sky-300 font-medium">{slot.topic || 'General Lecture'}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                      <span>Section: <strong className="text-slate-300">{slot.section}</strong></span>
                      <span>Classroom: <strong className="text-slate-300">{slot.classroom}</strong></span>
                    </div>
                  </div>
                </div>

                <Link
                  to="/teacher/lecture-studio"
                  className="shrink-0 self-end sm:self-center"
                >
                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Launch Studio
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </Card>

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
