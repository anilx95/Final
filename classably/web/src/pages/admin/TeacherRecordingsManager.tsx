import React, { useEffect, useState } from 'react';
import { Video, Download, Search, Film, Calendar, User, BookOpen } from 'lucide-react';
import { adminApi, exportApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export const TeacherRecordingsManager: React.FC = () => {
  const { addToast } = useToast();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTeacherRecordings();
      setRecordings(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading Recordings',
        description: 'Failed to fetch teacher recordings from server.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const filtered = recordings.filter(
    (r) =>
      r.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] flex items-center gap-2.5 tracking-tight">
          <Film className="w-5 h-5 text-[#1d43d9]" /> Faculty Lecture Recordings Directory
        </h1>
        <p className="text-xs text-slate-500 mt-1">View and download all lecture video & audio recordings captured by teachers across classrooms</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by teacher name, subject, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1d43d9] focus:bg-white placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs">
            Loading lecture recordings directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Film className="w-6 h-6 text-slate-400" />}
              title="No Recordings Found"
              description={searchQuery ? `No recordings match "${searchQuery}".` : 'No faculty lectures have been recorded yet.'}
            />
          </div>
        ) : (
          filtered.map((rec) => (
            <div key={rec.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-[#1d43d9] border border-blue-100">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1d43d9] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {rec.subject || 'Lecture Session'}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 tracking-tight">{rec.topic}</h3>
                  </div>
                </div>

                <Badge variant="brand" size="sm">
                  Session #{rec.session_id}
                </Badge>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" /> Educator:
                  </span>
                  <strong className="text-slate-900">{rec.teacher_name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#1d43d9]" /> Recorded Date:
                  </span>
                  <span className="text-slate-700 font-mono text-[11px]">{rec.created_at ? new Date(rec.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                <a
                  href={exportApi.downloadRecordingUrl(rec.session_id)}
                  download
                  className="px-4 py-2 bg-[#1d43d9] hover:bg-[#1534b0] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 flex-1"
                >
                  <Download className="w-3.5 h-3.5" /> Video (MP4)
                </a>
                <a
                  href={exportApi.downloadAudioUrl(rec.session_id)}
                  download
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 flex-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Audio (MP3)
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
