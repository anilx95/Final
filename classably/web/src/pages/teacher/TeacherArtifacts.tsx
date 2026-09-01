import React, { useState, useEffect } from 'react';
import { Download, FileText, Film, Volume2, Sparkles, Clock, Calendar, Search } from 'lucide-react';
import { exportApi, lectureApi } from '../../api/client';

interface SessionArtifact {
  id: number;
  subject: string;
  topic?: string;
  date: string;
  duration: string;
  status: string;
}

export const TeacherArtifacts: React.FC = () => {
  const [sessions, setSessions] = useState<SessionArtifact[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load active or past sessions
    const fetchSessions = async () => {
      try {
        const res = await lectureApi.getActiveSession(1);
        const active = res?.data;
        const list: SessionArtifact[] = [];
        if (active?.id) {
          list.push({
            id: active.id,
            subject: active.subject || 'Live Lecture Session',
            topic: active.topic || 'Classroom Broadcast',
            date: new Date().toLocaleDateString(),
            duration: 'Active Session',
            status: 'Live',
          });
          setSelectedSessionId(active.id);
        } else {
          // Fallback recent list
          list.push(
            { id: 1, subject: 'Advanced Data Structures', topic: 'Fall 2024 - Linked Lists & Arrays', date: 'Today', duration: '54 mins', status: 'Completed' },
            { id: 2, subject: 'Machine Learning & AI', topic: 'Neural Network Architectures', date: 'Yesterday', duration: '48 mins', status: 'Completed' },
            { id: 3, subject: 'Computer Networks', topic: 'TCP/IP Model & Congestion Control', date: '3 days ago', duration: '50 mins', status: 'Completed' },
          );
          setSelectedSessionId(1);
        }
        setSessions(list);
      } catch (err) {
        console.warn('Could not fetch active session for artifacts:', err);
        setSessions([
          { id: 1, subject: 'Advanced Data Structures', topic: 'Fall 2024 - Linked Lists & Arrays', date: 'Today', duration: '54 mins', status: 'Completed' },
          { id: 2, subject: 'Machine Learning & AI', topic: 'Neural Network Architectures', date: 'Yesterday', duration: '48 mins', status: 'Completed' },
          { id: 3, subject: 'Computer Networks', topic: 'TCP/IP Model & Congestion Control', date: '3 days ago', duration: '50 mins', status: 'Completed' },
        ]);
        setSelectedSessionId(1);
      }
    };

    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || s.subject.toLowerCase().includes(q) || (s.topic && s.topic.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1d3bb5] flex items-center justify-center shadow-2xs">
              <Download className="w-5 h-5" />
            </div>
            Session Artifacts & Recordings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Download AI summaries, captions, transcriptions, audio streams, and full lecture recordings.
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Session Picker */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Select Lecture Session</h3>
              <span className="text-[11px] text-slate-400 font-medium">{sessions.length} Available</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800 transition-colors"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredSessions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSessionId(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedSessionId === item.id
                      ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-900 truncate">{item.subject}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      item.status === 'Live' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{item.topic || 'Classroom Lecture'}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Download Center */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Available Exports for Session #{selectedSessionId}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-fidelity multimodal educational assets generated by the ClassAbly AI engine.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Ready for Download
              </span>
            </div>

            {/* Artifacts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PDF Summary */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">AI Lecture Summary (PDF)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Comprehensive chapter breakdown, key takeaways, and mathematical equations.
                    </p>
                  </div>
                </div>
                <a
                  href={exportApi.downloadSummaryUrl(selectedSessionId)}
                  download
                  className="w-full py-2 px-3 rounded-xl bg-[#1d3bb5] hover:bg-[#173099] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>

              {/* Subtitles VTT */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Captions & Subtitles (VTT)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Timestamped WebVTT subtitle track synced with teacher voice.
                    </p>
                  </div>
                </div>
                <a
                  href={exportApi.downloadSubtitlesUrl(selectedSessionId)}
                  download
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download VTT</span>
                </a>
              </div>

              {/* Full Transcript TXT */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Full Speech Transcript (TXT)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Plain text transcript of entire spoken lecture for notes & indexing.
                    </p>
                  </div>
                </div>
                <a
                  href={exportApi.downloadTranscriptUrl(selectedSessionId)}
                  download
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download TXT</span>
                </a>
              </div>

              {/* Audio Stream WEBM */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Master Audio Stream (WEBM)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Lossless amplified microphone audio stream recording.
                    </p>
                  </div>
                </div>
                <a
                  href={exportApi.downloadAudioUrl(selectedSessionId)}
                  download
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Audio</span>
                </a>
              </div>

              {/* Full Video Stream WEBM */}
              <div className="sm:col-span-2 p-4 rounded-2xl border border-slate-200/80 bg-blue-50/30 hover:bg-blue-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#1d3bb5] flex items-center justify-center shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Full Lecture Video Recording (WEBM)</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      High-definition teacher webcam and synchronized smart classroom video stream.
                    </p>
                  </div>
                </div>
                <a
                  href={exportApi.downloadRecordingUrl(selectedSessionId)}
                  download
                  className="py-2.5 px-5 rounded-xl bg-[#1d3bb5] hover:bg-[#173099] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video Recording</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
