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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
          <Film className="w-5 h-5 text-indigo-400" /> Faculty Lecture Recordings Directory
        </h1>
        <p className="text-xs text-slate-400 mt-1">View and download all lecture video & audio recordings captured by teachers across classrooms</p>
      </div>

      {/* Search Bar */}
      <Card variant="default" className="p-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by teacher name, subject, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 text-xs"
          />
        </div>
      </Card>

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
            <Card key={rec.id} variant="default" className="p-5 space-y-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> {rec.subject || 'Lecture Session'}
                    </div>
                    <h3 className="font-bold text-slate-100 text-sm mt-0.5 tracking-tight">{rec.topic}</h3>
                  </div>
                </div>

                <Badge variant="brand" size="sm">
                  Session #{rec.session_id}
                </Badge>
              </div>

              <div className="text-xs text-slate-300 space-y-1.5 bg-[#080c14] p-3 rounded-xl border border-[#1b2538]">
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
                  <span className="text-slate-300 font-mono text-[11px]">{rec.created_at ? new Date(rec.created_at).toLocaleString() : 'Recent'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-[#1b2538]">
                <a
                  href={exportApi.downloadRecordingUrl(rec.session_id)}
                  download
                  className="btn-primary text-xs flex-1 justify-center py-2"
                >
                  <Download className="w-3.5 h-3.5" /> Video (MP4)
                </a>
                <a
                  href={exportApi.downloadAudioUrl(rec.session_id)}
                  download
                  className="btn-secondary text-xs flex-1 justify-center py-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Audio (MP3)
                </a>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
