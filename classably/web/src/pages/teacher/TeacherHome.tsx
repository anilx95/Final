import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { academicsApi, lectureApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const TeacherHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    academicsApi
      .getTodayTimetable()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTimetable(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const defaultSubjects = [
    'Mathematics',
    'Computer Science',
    'Physics',
    'Artificial Intelligence & Machine Learning',
    'Computer Networks & Accessibility Tech',
    'Data Structures & Algorithms',
    'Operating Systems',
    'Quantum Computing',
  ];

  // Merge timetable subject names with default list
  const availableSubjects = Array.from(
    new Set([
      ...timetable.map((t) => t.subject_name).filter(Boolean),
      ...defaultSubjects,
    ])
  );

  const handleStartClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = subject.trim();
    const finalTopic = topic.trim();

    if (!finalSubject) {
      addToast({
        type: 'warning',
        title: 'Subject Name Required',
        description: 'Please enter a Subject Name before starting the class.',
      });
      return;
    }

    if (!finalTopic) {
      addToast({
        type: 'warning',
        title: 'Subject Topic Required',
        description: 'Please enter a Topic before starting the class.',
      });
      return;
    }

    setIsStarting(true);
    try {
      const res = await lectureApi.startSession({
        classroom_id: 1,
        subject: finalSubject,
        topic: finalTopic,
      });

      const newSession = res.data?.session;
      if (newSession?.id) {
        addToast({
          type: 'success',
          title: 'Class Started',
          description: `Live session #${newSession.id} has begun. Opening Live Class...`,
        });

        navigate('/teacher/lecture-studio', {
          state: {
            sessionId: newSession.id,
            subject: newSession.subject || finalSubject,
            topic: newSession.topic || finalTopic,
            teacherName: newSession.teacher_name || user?.full_name,
            autoStart: true,
          },
        });
      } else {
        throw new Error('No session ID returned from server.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Start Class Failed',
        description: err.response?.data?.detail || err.message || 'Could not start class session. Please try again.',
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center p-2 sm:p-6 animate-fade-in">
      {/* Central Start a Class Card */}
      <div className="w-full max-w-[760px] bg-white rounded-[28px] sm:rounded-[36px] p-7 sm:p-12 lg:p-14 border border-slate-100/90 shadow-xl shadow-slate-200/50">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0f172a] text-center tracking-tight leading-tight">
          Start a Class
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm lg:text-[14.5px] text-slate-500 text-center mt-2.5 sm:mt-3 mb-8 sm:mb-11 font-normal">
          Set up the subject and topic to begin your live session
        </p>

        <form onSubmit={handleStartClass} className="space-y-6 sm:space-y-8">
          {/* Two Input Fields on Same Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Enter Subject Field */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-[13px] font-bold text-[#0f172a]">
                Enter Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Type your sub here"
                className="w-full h-12 sm:h-13 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-[13.5px] font-medium text-slate-800 focus:outline-none focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/10 placeholder-slate-400 transition-all"
              />
            </div>

            {/* Enter Topic Field */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-[13px] font-bold text-[#0f172a]">
                Enter Topic
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Type your topic here"
                className="w-full h-12 sm:h-13 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-[13.5px] font-medium text-slate-800 focus:outline-none focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/10 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Large Blue Start Class Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isStarting}
              className="w-full h-12 sm:h-14 rounded-xl bg-[#24389c] hover:bg-[#1a2c80] text-white !text-white font-bold text-sm sm:text-[16px] tracking-wide flex items-center justify-center gap-2.5 transition-all duration-150 shadow-md shadow-[#24389c]/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isStarting ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  <div className="w-7 h-7 rounded bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#24389c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-white font-bold">Start Class</span>
                </>
              )}
            </button>

            {/* Subtext */}
            <p className="text-[11px] sm:text-xs text-slate-500 text-center mt-5 sm:mt-6 font-normal">
              The class will be started and students will be notified to join.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
