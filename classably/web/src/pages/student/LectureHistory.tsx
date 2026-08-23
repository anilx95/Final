import React, { useEffect, useState } from 'react';
import {
  Calendar, Download, FileText, User, Clock, BookOpen, RefreshCw, Video,
  Volume2, Sparkles, Play, X, Search, FileCode, CheckCircle2
} from 'lucide-react';
import { exportApi, lectureApi, aiQaApi } from '../../api/client';
import { useAccessibility } from '../../context/AccessibilityContext';

export const LectureHistory: React.FC = () => {
  const { speakText } = useAccessibility();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Player Modal State
  const [activeModalSession, setActiveModalSession] = useState<any | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'transcript' | 'summary'>('video');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await lectureApi.getHistory();
      setSessions(res.data || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const openSessionModal = async (session: any) => {
    setActiveModalSession(session);
    setActiveTab('video');
    setSearchQuery('');
    setSubLoading(true);
    setSummary(null);

    try {
      const [subRes, sumRes] = await Promise.allSettled([
        lectureApi.getSubtitles(session.id),
        aiQaApi.getSummary(session.id),
      ]);

      if (subRes.status === 'fulfilled') setSubtitles(subRes.value.data || []);
      else setSubtitles([]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data?.summary || null);
    } catch {
      setSubtitles([]);
    } finally {
      setSubLoading(false);
    }
  };

  const closeModal = () => {
    setActiveModalSession(null);
    setSubtitles([]);
    setSummary(null);
  };

  const filteredSubtitles = subtitles.filter((sub) =>
    (sub.text || sub.original_text || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-sky-400" /> Lecture Schedule & Recordings Archive
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access past completed lectures, stream recorded video/audio, inspect speech transcripts, and download AI summaries
          </p>
        </div>

        <button onClick={fetchHistory} disabled={loading} className="btn-secondary text-xs self-start sm:self-auto">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Archive
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-xs text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 text-sky-400 animate-spin mx-auto" />
          <p>Loading lecture recordings...</p>
        </div>
      ) : (!sessions || sessions.length === 0) ? (
        <div className="card p-12 text-center text-xs text-slate-400 space-y-3">
          <div className="p-4 rounded-full bg-slate-900 text-slate-500 w-fit mx-auto border border-slate-800">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-200 text-sm">No Completed Lecture Recordings Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Lectures conducted by faculty teachers will automatically record, transcribe, and appear here once a session is completed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="card p-5 space-y-4 hover:border-slate-700 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/30">
                      Session #{s.id}
                    </span>
                    <h3 className="font-bold text-slate-100 text-base">{s.subject || 'Lecture Session'}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-300 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <User className="w-3.5 h-3.5" /> Educator: {s.teacher_name || 'Faculty Teacher'}
                    </span>
                    <span className="flex items-center gap-1 text-purple-300 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Topic: {s.topic || 'General Lecture'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>{s.date || s.started_at || 'Recently Completed'} ({s.duration || 'Full Session'})</span>
                  </div>

                  <button
                    onClick={() => openSessionModal(s)}
                    className="btn-primary text-xs font-bold px-4 py-1.5 flex items-center gap-1.5 shadow-md shadow-sky-500/10 hover:scale-105 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Watch Recording
                  </button>
                </div>
              </div>

              {/* Downloads & Accessibility Options */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <button
                  onClick={() =>
                    speakText(
                      `Past lecture record. Subject: ${s.subject}. Topic: ${s.topic || 'General Lecture'}. Instructor: ${
                        s.teacher_name || 'Faculty Teacher'
                      }. Recorded on ${s.date || 'recently'}.`
                    )
                  }
                  className="btn-secondary py-2 justify-between text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                  title="Listen to Lecture Summary Read Aloud"
                >
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Read Aloud
                  </span>
                  <Sparkles className="w-3 h-3" />
                </button>

                <a href={exportApi.downloadSummaryUrl(s.id)} download className="btn-secondary py-2 justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-purple-400" /> PDF Summary
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a href={exportApi.downloadSubtitlesUrl(s.id)} download className="btn-secondary py-2 justify-between">
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" /> Captions (VTT)
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a href={exportApi.downloadTranscriptUrl(s.id)} download className="btn-secondary py-2 justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Transcript
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a href={exportApi.downloadAudioUrl(s.id)} download className="btn-secondary py-2 justify-between text-emerald-400 border-emerald-500/30">
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> MP3 Audio
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a href={exportApi.downloadRecordingUrl(s.id)} download className="btn-secondary py-2 justify-between text-sky-400 border-sky-500/30">
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> MP4 Video
                  </span>
                  <Download className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Recording Player Modal */}
      {activeModalSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                    Session #{activeModalSession.id}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-100">{activeModalSession.subject}</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Topic: <strong className="text-purple-300">{activeModalSession.topic || 'General Lecture'}</strong> • Educator:{' '}
                  <strong className="text-emerald-400">{activeModalSession.teacher_name || 'Faculty Teacher'}</strong>
                </p>
              </div>

              <button
                onClick={closeModal}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Tab Selector */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Video Recording
              </button>

              <button
                onClick={() => setActiveTab('audio')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'audio'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" /> Audio Stream
              </button>

              <button
                onClick={() => setActiveTab('transcript')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'transcript'
                    ? 'bg-purple-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Interactive Transcript ({(subtitles || []).length})
              </button>

              {summary && (
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'summary'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Key Takeaways
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeTab === 'video' && (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
                    <video
                      src={exportApi.downloadRecordingUrl(activeModalSession.id)}
                      controls
                      autoPlay
                      className="w-full max-h-[420px] object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    Recorded live during lecture stream with synchronized teacher mic audio.
                  </p>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-4 card p-6 bg-slate-950 border-slate-800 text-center">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 w-fit mx-auto border border-emerald-500/30">
                    <Volume2 className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Full Lecture Audio Track</h3>
                    <p className="text-xs text-slate-400 mt-1">High-clarity audio recording for blind students & assistive devices</p>
                  </div>

                  <audio
                    src={exportApi.downloadAudioUrl(activeModalSession.id)}
                    controls
                    autoPlay
                    className="w-full max-w-lg mx-auto"
                  />
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search spoken keywords in lecture transcript..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {subLoading ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 text-purple-400 animate-spin mx-auto mb-2" />
                      Loading speech transcript...
                    </div>
                  ) : (!filteredSubtitles || filteredSubtitles.length === 0) ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No transcript entries found matching "{searchQuery}".
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                      {(filteredSubtitles || []).map((sub, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-3">
                          <span className="font-mono text-[10px] text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded shrink-0">
                            {sub.timestamp || `#${i + 1}`}
                          </span>
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-200">{sub.speaker || 'Educator'}:</span>
                            <p className="text-slate-300 leading-relaxed">{sub.text || sub.original_text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'summary' && summary && (
                <div className="card p-6 bg-slate-950 border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-slate-100 text-sm">AI Lecture Summary & Key Takeaways</h3>
                  </div>

                  {((summary.key_takeaways || []).length > 0) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Concepts</h4>
                      <ul className="space-y-1.5">
                        {(summary.key_takeaways || []).map((item: string, idx: number) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.full_summary && (
                    <div className="space-y-1 pt-2 border-t border-slate-900">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Overview</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{summary.full_summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Downloads */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px]">
                ClassAbly Archive • Session #{activeModalSession.id}
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <a href={exportApi.downloadRecordingUrl(activeModalSession.id)} download className="btn-primary text-xs py-1.5">
                  <Video className="w-3.5 h-3.5" /> Download MP4
                </a>
                <a href={exportApi.downloadAudioUrl(activeModalSession.id)} download className="btn-secondary text-xs py-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Download MP3
                </a>
                <a href={exportApi.downloadSummaryUrl(activeModalSession.id)} download className="btn-secondary text-xs py-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" /> PDF Summary
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
