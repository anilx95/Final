import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, User, Clock } from 'lucide-react';
import { academicsApi, dashboardApi, lectureApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);

  // Poll live sessions automatically to switch in real-time when classes start/end
  useEffect(() => {
    let isMounted = true;

    const checkLiveSession = async () => {
      try {
        const res = await lectureApi.getAllActiveSessions();
        if (!isMounted) return;

        const sessions = res.data?.active_sessions;
        if (Array.isArray(sessions) && sessions.length > 0) {
          const live = sessions.find((s: any) => (s.status || '').toUpperCase() === 'ACTIVE') || sessions[0];
          setActiveLiveSession(live);
          return;
        }

        // Fallback: check online teachers for active live sessions
        const tchRes = await lectureApi.getTeachers();
        if (!isMounted) return;

        if (Array.isArray(tchRes.data)) {
          const liveTeacher = tchRes.data.find((t: any) => t.is_live);
          if (liveTeacher) {
            setActiveLiveSession({
              id: liveTeacher.session_id,
              teacher_name: liveTeacher.full_name,
              subject: liveTeacher.subject || 'Live Lecture',
              topic: liveTeacher.topic || liveTeacher.subject || 'Live Class Session',
              started_at: null,
            });
            return;
          }
        }

        setActiveLiveSession(null);
      } catch {
        if (isMounted) {
          setActiveLiveSession(null);
        }
      }
    };

    checkLiveSession();
    const interval = setInterval(checkLiveSession, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Promise.allSettled([
      academicsApi.getTodayTimetable(),
      dashboardApi.getOverview(),
    ]).then(([ttRes]) => {
      if (ttRes.status === 'fulfilled' && Array.isArray(ttRes.value.data) && ttRes.value.data.length > 0) {
        setTimetable(ttRes.value.data);
      }
    });
  }, []);

  const getElapsedMinutes = (startedAt?: string) => {
    if (!startedAt) return 'Started recently';
    try {
      const diffMs = Date.now() - new Date(startedAt).getTime();
      const diffMins = Math.max(1, Math.round(diffMs / 60000));
      return `Started ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } catch {
      return 'Live session';
    }
  };

  const getFormattedTiming = (session: any, timetableItems: TimetableItem[]) => {
    if (!session) return '';
    const matchingSlot = timetableItems.find(
      (t) =>
        (session.subject && t.subject_name?.toLowerCase() === session.subject.toLowerCase()) ||
        (session.teacher_name && t.teacher_name?.toLowerCase() === session.teacher_name.toLowerCase())
    );
    if (matchingSlot?.time) {
      return matchingSlot.time;
    }
    if (session.started_at) {
      try {
        const startTime = new Date(session.started_at);
        const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(startTime.getTime() + 90 * 60 * 1000);
        const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${startStr} - ${endStr}`;
      } catch {
        return 'Ongoing Session';
      }
    }
    return 'Active Session';
  };

  // Default upcoming classes matching screenshot design if none returned from API
  const defaultClasses = [
    {
      subject: 'Physics: Quantum Mechanics',
      subtext: 'Module 4: Wave Functions',
      teacher: 'Prof. Albert Chen',
      dateTime: 'Today, 1:00 PM',
      status: 'Upcoming',
      statusType: 'upcoming',
    },
    {
      subject: 'Literature: Modern Classics',
      subtext: 'Discussion: 1984',
      teacher: 'Dr. Emily Ross',
      dateTime: 'Today, 3:30 PM',
      status: 'Upcoming',
      statusType: 'upcoming',
    },
    {
      subject: 'Computer Science 101',
      subtext: 'Data Structures',
      teacher: 'Mr. David Kim',
      dateTime: 'Tomorrow, 9:00 AM',
      status: 'Scheduled',
      statusType: 'scheduled',
    },
  ];

  const displayClasses = timetable.length > 0
    ? timetable.map((t, idx) => ({
        subject: t.subject_name || 'Class Session',
        subtext: t.topic || `Code: ${t.subject_code || 'CS'}`,
        teacher: t.teacher_name || 'Faculty Instructor',
        dateTime: t.time ? `Today, ${t.time}` : 'Today, 1:00 PM',
        status: idx === 0 ? 'Upcoming' : 'Scheduled',
        statusType: idx === 0 ? 'upcoming' : 'scheduled',
      }))
    : defaultClasses;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Welcome Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
          Welcome back, {user?.full_name || 'John Doe'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Your smart classroom is ready. You have {activeLiveSession ? 1 : 0} live class{activeLiveSession ? '' : 'es'} and {displayClasses.length} upcoming sessions today.
        </p>
      </div>

      {/* Live Class Section */}
      {activeLiveSession ? (
        /* State 1: When a Live Class is currently running */
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Live Broadcast Badge */}
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  LIVE NOW
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {getElapsedMinutes(activeLiveSession.started_at)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] truncate">
                {activeLiveSession.topic || activeLiveSession.subject || 'Live Lecture Session'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {activeLiveSession.teacher_name || 'Faculty Instructor'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> {getFormattedTiming(activeLiveSession, timetable)}
                </span>
              </div>
            </div>
          </div>

          <Link to="/student/live-class" className="shrink-0 w-full md:w-auto">
            <button
              type="button"
              className="btn-click-here w-full md:w-auto"
            >
              Click Here
            </button>
          </Link>
        </div>
      ) : (
        /* State 2: When NO Live Class is currently running */
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
                Join Live Class
              </h2>
            </div>
          </div>

          <Link to="/student/live-class" className="shrink-0 w-full sm:w-auto">
            <button
              type="button"
              className="btn-click-here w-full sm:w-auto"
            >
              Click Here
            </button>
          </Link>
        </div>
      )}

      {/* Upcoming Classes Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#111827]">Upcoming Classes</h3>
          <Link
            to="/student/lecture-history"
            className="text-xs font-semibold text-[#1d3bb5] hover:underline"
          >
            View Full Schedule
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">SUBJECT</th>
                  <th className="py-3 px-5">TEACHER</th>
                  <th className="py-3 px-5">DATE & TIME</th>
                  <th className="py-3 px-5">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayClasses.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-bold text-[#111827] text-sm">{item.subject}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{item.subtext}</div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-slate-700">{item.teacher}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-600 font-medium">
                      {item.dateTime}
                    </td>
                    <td className="py-4 px-5">
                      {item.statusType === 'upcoming' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#eef4ff] text-[#1d3bb5] border border-[#dbeafe]">
                          Upcoming
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

