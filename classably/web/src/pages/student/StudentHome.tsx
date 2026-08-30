import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Sparkles, Mic, BookOpen, Clock, FolderDown, ChevronRight, Volume2, School, ArrowUpRight } from 'lucide-react';
import { academicsApi, dashboardApi, lectureApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

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
      if (ttRes.status === 'fulfilled') setTimetable(Array.isArray(ttRes.value.data) ? ttRes.value.data : []);
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
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <Card variant="ai" className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="brand" size="sm">
                Student Accessibility Workspace
              </Badge>
              {(activeDisabilities || []).length > 0 && (
                <Badge variant="ai" size="sm">
                  <Sparkles className="w-3 h-3" /> {(activeDisabilities || []).length} Accommodations Active
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
              Welcome, {user?.full_name || 'Student'}!
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Your personalized accessible learning environment is active. Real-time neural translations, screen reading, and closed captions are ready.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => speakText(`Welcome back ${user?.full_name}. You have ${(timetable || []).length} classes scheduled today.`)}
              leftIcon={<Volume2 className="w-4 h-4 text-sky-400" />}
            >
              Read Aloud
            </Button>
            <Link to="/student/live-class">
              <Button variant="primary" size="sm" leftIcon={<Video className="w-4 h-4" />}>
                Join Active Class
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Accessibility Status Banner */}
      <Card variant="default" padding="sm" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-xs tracking-tight">Active Accessibility Profile</h4>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(!activeDisabilities || activeDisabilities.length === 0) ? (
                <span className="text-[11px] text-slate-400">Standard View Mode (No specific accommodations active)</span>
              ) : (
                (activeDisabilities || []).map((d) => (
                  <Badge key={d} variant="ai" size="sm">
                    {d.replace('_', ' ')}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <Link to="/student/accessibility" className="text-xs text-sky-400 font-semibold hover:underline shrink-0">
          Customize Adaptations &rarr;
        </Link>
      </Card>

      {/* Main Student Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Link to="/student/live-class" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Join Live Classroom</h3>
            <p className="text-xs text-slate-400 mt-1">Live board stream, neural translations & interactive AI visualizer</p>
          </Card>
        </Link>

        <Link to="/student/voice-assistant" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                <Mic className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Voice Command Studio</h3>
            <p className="text-xs text-slate-400 mt-1">Hands-free classroom control, question asking & accessibility calls</p>
          </Card>
        </Link>

        <Link to="/student/study-materials" className="block group">
          <Card variant="interactive" className="h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <FolderDown className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-tight">Study Materials & Notes</h3>
            <p className="text-xs text-slate-400 mt-1">Download AI summaries, lecture transcripts, and VTT caption files</p>
          </Card>
        </Link>
      </div>

      {/* Live Faculty & Online Teachers Status */}
      <Card variant="default">
        <div className="flex items-center justify-between border-b border-[#1b2538] pb-3 mb-4">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
            <School className="w-4 h-4 text-emerald-400" /> Faculty & Department Educators ({(teachers || []).length})
          </h3>
          <Badge variant="success" size="sm" dot pulse>
            Active Directory
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full text-center py-8 text-slate-400 text-xs">Loading faculty list...</div>
          ) : (!teachers || teachers.length === 0) ? (
            <div className="col-span-full text-center py-8 text-slate-400 text-xs">No faculty members found.</div>
          ) : (
            (teachers || []).map((tch) => {
              const isLive = tch.is_live;
              return (
                <div key={tch.id} className="p-3 rounded-xl bg-[#080c14] border border-[#1b2538] flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                      isLive ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-sky-400'
                    }`}>
                      {tch.full_name?.charAt(0) || 'F'}
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
                      className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all shrink-0 flex items-center gap-1"
                    >
                      <Video className="w-3 h-3 text-emerald-400 animate-pulse" /> Join Live
                    </Link>
                  ) : (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border shrink-0 font-mono ${
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
      </Card>

      {/* Today's Timetable */}
      <Card variant="default">
        <div className="flex items-center justify-between border-b border-[#1b2538] pb-3 mb-4">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
            <Clock className="w-4 h-4 text-sky-400" /> Today's Enrolled Classes
          </h3>
        </div>

        <div className="space-y-2.5">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading timetable...</div>
          ) : (!timetable || timetable.length === 0) ? (
            <div className="text-center py-8 text-slate-400 text-xs">No enrolled classes scheduled for today.</div>
          ) : (
            (timetable || []).map((slot, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#080c14] border border-[#1b2538] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-700 transition-colors">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-xs font-bold shrink-0 border border-sky-500/20 whitespace-nowrap">
                    {slot.time}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {slot.subject_code && (
                        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
                          {slot.subject_code}
                        </span>
                      )}
                      <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">{slot.subject_name}</span>
                    </div>
                    {slot.topic && (
                      <div className="text-xs text-sky-300 mt-0.5 font-medium truncate">
                        Topic: {slot.topic}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5 break-words">
                      Instructor: <strong className="text-slate-300">{slot.teacher_name || 'Faculty Instructor'}</strong> • Room: <strong className="text-slate-300">{slot.classroom}</strong>
                    </div>
                  </div>
                </div>

                <Link to="/student/live-class" className="w-full sm:w-auto shrink-0">
                  <Button variant="primary" size="sm" className="w-full sm:w-auto" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                    Join Lecture
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
