import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Video, Sparkles, Mic, BookOpen, Clock, FolderDown, ChevronRight, Volume2, Award, CheckCircle, School, UserCheck } from 'lucide-react';
import { academicsApi, dashboardApi, lectureApi } from '../../api/client';
import { TimetableItem, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';

export const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const { activeDisabilities, speakText } = useAccessibility();
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      academicsApi.getTodayTimetable(),
      dashboardApi.getOverview(),
      dashboardApi.getAttendance(),
      lectureApi.getTeachers(),
    ]).then(([ttRes, dashRes, attRes, teachRes]) => {
      if (ttRes.status === 'fulfilled') setTimetable(ttRes.value.data);
      const statsObj: any = {};
      if (dashRes.status === 'fulfilled') Object.assign(statsObj, dashRes.value.data);
      if (attRes.status === 'fulfilled') Object.assign(statsObj, attRes.value.data);
      setStudentStats(statsObj);
      if (teachRes.status === 'fulfilled' && Array.isArray(teachRes.value.data)) {
        setTeachers(teachRes.value.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="card bg-gradient-to-r from-sky-900/60 via-purple-900/40 to-slate-900 border-sky-500/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold text-sky-400 tracking-wider">Student Accessibility Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-100 mt-1">Welcome, {user?.full_name}!</h1>
          <p className="text-xs text-slate-300 mt-1">Your adaptive learning workspace is active with {activeDisabilities.length} active accommodations.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => speakText(`Welcome back ${user?.full_name}. You have ${timetable.length} classes scheduled today.`)}
            className="btn-secondary text-xs"
            title="Read Screen Aloud"
          >
            <Volume2 className="w-4 h-4 text-sky-400" /> Read Aloud
          </button>
          <Link to="/student/live-class" className="btn-primary text-xs whitespace-nowrap">
            <Video className="w-4 h-4" /> Join Active Class
          </Link>
        </div>
      </div>

      {/* Accessibility Status Banner */}
      <div className="card p-4 bg-slate-900/90 border-sky-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-xs">Active Disability Profiles</h4>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {activeDisabilities.length === 0 ? (
                <span className="text-[11px] text-slate-400">Standard View Mode</span>
              ) : (
                activeDisabilities.map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold capitalize">
                    {d.replace('_', ' ')}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <Link to="/student/accessibility" className="text-xs text-sky-400 font-semibold hover:underline">
          Customize Adaptations
        </Link>
      </div>

      {/* Main Student Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/student/live-class" className="card p-5 hover:border-sky-500/50 transition-all group">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Join Live Classroom</h3>
          <p className="text-xs text-slate-400 mt-1">View camera board OCR, live STT subtitles & real-time translations</p>
        </Link>

        <Link to="/student/voice-assistant" className="card p-5 hover:border-purple-500/50 transition-all group">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Voice Command Studio</h3>
          <p className="text-xs text-slate-400 mt-1">Control classroom lights, fans, projector, and call teacher hands-free</p>
        </Link>

        <Link to="/student/study-materials" className="card p-5 hover:border-emerald-500/50 transition-all group">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-3 group-hover:scale-110 transition-transform">
            <FolderDown className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Study Materials & Notes</h3>
          <p className="text-xs text-slate-400 mt-1">Download PDFs, generated AI summaries, and VTT lecture captions</p>
        </Link>
      </div>

      {/* Live Faculty & Online Teachers Status */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <School className="w-4 h-4 text-emerald-400" /> Live Faculty & Department Educators ({teachers.length})
          </h3>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Active Faculty Directory
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full text-center py-4 text-slate-400 text-xs">Loading faculty list...</div>
          ) : teachers.length === 0 ? (
            <div className="col-span-full text-center py-4 text-slate-400 text-xs">No faculty members found.</div>
          ) : (
            teachers.map((tch) => {
              const isLive = tch.is_live;
              return (
                <div key={tch.id} className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${
                      isLive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-sky-400'
                    }`}>
                      {tch.full_name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-slate-200 text-xs truncate">{tch.full_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isLive ? `Live: ${tch.subject || 'Lecture'}` : tch.email}
                      </div>
                    </div>
                  </div>

                  {isLive ? (
                    <Link
                      to="/student/live-class"
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all shrink-0 flex items-center gap-1"
                    >
                      <Video className="w-3 h-3 text-emerald-400 animate-pulse" /> Join Live
                    </Link>
                  ) : (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border shrink-0 ${
                      tch.is_active !== false
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {tch.is_active !== false ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Today's Timetable */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" /> Today's Enrolled Classes
          </h3>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading timetable...</div>
          ) : timetable.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">No enrolled classes scheduled for today.</div>
          ) : (
            timetable.map((slot, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 font-mono text-xs font-bold shrink-0">
                    {slot.time}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {slot.subject_code && (
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {slot.subject_code}
                        </span>
                      )}
                      <span className="font-bold text-slate-100 text-sm">{slot.subject_name}</span>
                    </div>
                    {slot.topic && (
                      <div className="text-xs text-sky-300 mt-0.5 font-medium">
                        Topic: {slot.topic}
                      </div>
                    )}
                    <div className="text-xs text-slate-400 mt-0.5">
                      Instructor: <strong className="text-slate-300">{slot.teacher_name || 'Faculty Instructor'}</strong> | Room: <strong className="text-slate-300">{slot.classroom}</strong>
                    </div>
                  </div>
                </div>

                <Link to="/student/live-class" className="btn-primary text-xs shrink-0">
                  Join Lecture <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
