import React, { useEffect, useState } from 'react';
import { Video, Download, Search, Film, Calendar, User, BookOpen } from 'lucide-react';
import { adminApi, exportApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const TeacherRecordingsManager: React.FC = () => {
  const { addToast } = useToast();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRecordings = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTeacherRecordings();
      setRecordings(res.data);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Film className="w-6 h-6 text-purple-400" /> Faculty Lecture Recordings Directory
          </h1>
          <p className="text-xs text-slate-400">View and download all lecture video & audio recordings captured by teachers across classrooms</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by teacher name, subject, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 text-xs"
          />
        </div>
      </div>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading lecture recordings directory...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs card">
            No lecture recordings found.
          </div>
        ) : (
          filtered.map((rec) => (
            <div key={rec.id} className="card p-5 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {rec.subject || 'Lecture Session'}
                    </div>
                    <h3 className="font-extrabold text-slate-100 text-sm mt-0.5">{rec.topic}</h3>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Session #{rec.session_id}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Educator:
                  </span>
                  <strong className="text-slate-100">{rec.teacher_name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" /> Recorded Date:
                  </span>
                  <span className="text-slate-300">{rec.created_at ? new Date(rec.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={exportApi.downloadRecordingUrl(rec.session_id)}
                  download
                  className="btn-primary text-xs flex-1 justify-center border-purple-500 bg-purple-600 hover:bg-purple-500"
                >
                  <Download className="w-3.5 h-3.5" /> Video Recording
                </a>
                <a
                  href={exportApi.downloadAudioUrl(rec.session_id)}
                  download
                  className="btn-secondary text-xs flex-1 justify-center border-sky-500/40 text-sky-300 hover:bg-sky-500/10"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" /> Audio Stream
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
