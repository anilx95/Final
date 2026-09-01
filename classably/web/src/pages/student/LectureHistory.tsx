import React, { useEffect, useState } from 'react';
import {
  Calendar, Download, FileText, User, Clock, BookOpen, RefreshCw, Video,
  Volume2, Sparkles, Play, Search, FileCode, CheckCircle2
} from 'lucide-react';
import { exportApi, lectureApi, aiQaApi } from '../../api/client';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

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
      setSessions(Array.isArray(res.data) ? res.data : []);
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

      if (subRes.status === 'fulfilled') setSubtitles(Array.isArray(subRes.value.data) ? subRes.value.data : []);
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
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            Lecture Archive & Recordings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access past completed lectures, stream recorded video/audio, inspect speech transcripts, and download AI summaries
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchHistory}
          disabled={loading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Archive
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading lecture recordings...
        </div>
      ) : (!sessions || sessions.length === 0) ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-slate-400" />}
          title="No Completed Lecture Recordings"
          description="Lectures conducted by faculty teachers will automatically record, transcribe, and appear here once a session is completed."
        />
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <Card key={s.id} variant="default" className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="brand" size="sm">
                      Session #{s.id}
                    </Badge>
                    <h3 className="font-bold text-[#111827] text-sm sm:text-base tracking-tight">{s.subject || 'Lecture Session'}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Educator: {s.teacher_name || 'Faculty Teacher'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-[#1d3bb5]" /> Topic: {s.topic || 'General Lecture'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <div className="text-xs text-slate-600 font-mono flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-[#1d3bb5]" />
                    <span>{s.date || s.started_at || 'Recently Completed'}</span>
                  </div>

                  <button
                    onClick={() => openSessionModal(s)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d3bb5] hover:bg-[#173099] text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
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
                      }.`
                    )
                  }
                  className="inline-flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100/70 text-amber-800 border border-amber-200 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
                  title="Listen to Lecture Summary Read Aloud"
                >
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-600" /> Read Aloud
                  </span>
                  <Sparkles className="w-3 h-3 text-amber-600" />
                </button>

                <a
                  href={exportApi.downloadSummaryUrl(s.id)}
                  download
                  className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-purple-600" /> PDF Summary
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a
                  href={exportApi.downloadSubtitlesUrl(s.id)}
                  download
                  className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-[#1d3bb5]" /> Captions (VTT)
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a
                  href={exportApi.downloadTranscriptUrl(s.id)}
                  download
                  className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" /> Transcript
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a
                  href={exportApi.downloadAudioUrl(s.id)}
                  download
                  className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> MP3 Audio
                  </span>
                  <Download className="w-3 h-3" />
                </a>

                <a
                  href={exportApi.downloadRecordingUrl(s.id)}
                  download
                  className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-[#1d3bb5] border border-[#dbeafe] rounded-lg font-semibold transition-colors shadow-sm"
                >
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5" /> MP4 Video
                  </span>
                  <Download className="w-3 h-3" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Interactive Recording Player Modal */}
      {activeModalSession && (
        <Modal
          isOpen={!!activeModalSession}
          onClose={closeModal}
          title={activeModalSession.subject || 'Lecture Recording'}
          description={`Topic: ${activeModalSession.topic || 'General Lecture'} • Educator: ${activeModalSession.teacher_name || 'Faculty Teacher'}`}
          size="lg"
        >
          {/* View Tab Selector */}
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-[#1d3bb5] text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Video className="w-3.5 h-3.5" /> Video Recording
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" /> Audio Stream
            </button>

            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'transcript'
                  ? 'bg-[#1d3bb5] text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Transcript ({(subtitles || []).length})
            </button>

            {summary && (
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'summary'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Summary
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="py-4 space-y-4">
            {activeTab === 'video' && (
              <div className="space-y-2.5">
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-lg flex items-center justify-center">
                  <video
                    src={exportApi.downloadRecordingUrl(activeModalSession.id)}
                    controls
                    autoPlay
                    className="w-full max-h-[380px] object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Recorded live during lecture stream with synchronized teacher mic audio.
                </p>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="space-y-4 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600 w-fit mx-auto border border-emerald-200">
                  <Volume2 className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827] text-sm">Full Lecture Audio Track</h3>
                  <p className="text-xs text-slate-500 mt-1">High-clarity audio recording for accessible playback</p>
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
              <div className="space-y-3.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search spoken keywords in transcript..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none"
                  />
                </div>

                {subLoading ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Loading speech transcript...
                  </div>
                ) : (!filteredSubtitles || filteredSubtitles.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No transcript entries found matching "{searchQuery}".
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {(filteredSubtitles || []).map((sub, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-2.5">
                        <span className="font-mono text-[10px] text-[#1d3bb5] font-bold bg-[#eef4ff] px-2 py-0.5 rounded shrink-0 border border-[#dbeafe]">
                          {sub.timestamp || `#${i + 1}`}
                        </span>
                        <div className="space-y-0.5">
                          <span className="font-bold text-[#111827]">{sub.speaker || 'Educator'}:</span>
                          <p className="text-slate-600 leading-relaxed">{sub.text || sub.original_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && summary && (
              <Card variant="default" className="p-5 space-y-3.5 border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-[#111827] text-xs sm:text-sm tracking-tight">AI Key Takeaways</h3>
                </div>

                {((summary.key_takeaways || []).length > 0) && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Key Concepts</h4>
                    <ul className="space-y-1">
                      {(summary.key_takeaways || []).map((item: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.full_summary && (
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Overview</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{summary.full_summary}</p>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Modal Footer Downloads */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-500 text-[11px] font-mono">
              Session #{activeModalSession.id} Archive
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={exportApi.downloadRecordingUrl(activeModalSession.id)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1d3bb5] hover:bg-[#173099] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <Video className="w-3.5 h-3.5" /> MP4 Video
              </a>
              <a
                href={exportApi.downloadAudioUrl(activeModalSession.id)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" /> MP3 Audio
              </a>
              <a
                href={exportApi.downloadSummaryUrl(activeModalSession.id)}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" /> PDF Summary
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

