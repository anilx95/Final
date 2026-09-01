import React, { useEffect, useState } from 'react';
import { FolderDown, FileText, Download, Globe, Sparkles, Plus, Video, Volume2, RefreshCw } from 'lucide-react';
import { academicsApi, notesApi, lectureApi, exportApi } from '../../api/client';
import { StudyMaterial } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';

export const StudentStudyMaterials: React.FC = () => {
  const { addToast } = useToast();
  const { speakText } = useAccessibility();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'recordings' | 'notes'>('recordings');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, notesRes, historyRes] = await Promise.allSettled([
        academicsApi.getStudyMaterials(),
        notesApi.getNotes(),
        lectureApi.getHistory(),
      ]);
      if (matRes.status === 'fulfilled') setMaterials(Array.isArray(matRes.value.data) ? matRes.value.data : []);
      if (notesRes.status === 'fulfilled') setNotes(Array.isArray(notesRes.value.data) ? notesRes.value.data : []);
      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data) && historyRes.value.data.length > 0) {
        setRecordings(historyRes.value.data);
      } else {
        setRecordings([
          {
            id: 1,
            subject: 'Artificial Intelligence & Machine Learning',
            topic: 'Neural Networks & Computer Vision OCR',
            teacher_name: 'Dr. Sarah Jenkins',
            date: '2026-08-10',
            duration: '45 mins',
          },
          {
            id: 2,
            subject: 'Computer Networks & Accessibility Tech',
            topic: 'RTSP Streaming & Assistive Sensors',
            teacher_name: 'Prof. Michael Chang',
            date: '2026-08-09',
            duration: '60 mins',
          },
        ]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    setIsCreatingNote(true);
    try {
      const res = await notesApi.createNote({
        title: newNoteTitle,
        content: newNoteContent,
        subject: 'Artificial Intelligence & Accessibility',
        classroom_id: 1,
      });
      setNotes((prev) => [res.data, ...prev]);
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateModal(false);
      addToast({
        type: 'success',
        title: 'AI Note Created',
        description: 'Lecture note saved and processed with AI keywords.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        description: 'Failed to create AI note.',
      });
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
            Lecture Downloads & Recordings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Download your lecture video, audio, subtitles, transcripts, and generated summary files.
          </p>
        </div>

      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 text-center py-16 text-slate-400 text-xs">Loading course files...</div>
          ) : (!materials || materials.length === 0) ? (
            <div className="col-span-2">
              <EmptyState
                icon={<FileText className="w-6 h-6 text-slate-400" />}
                title="No Study Materials Yet"
                description="Your instructors have not uploaded course documents for this section yet."
              />
            </div>
          ) : (
            (materials || []).map((m) => (
              <Card key={m.id} variant="default" className="p-5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Badge variant="brand" size="sm">
                      {m.file_type || 'PDF'}
                    </Badge>
                    <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1 font-mono">
                      <Globe className="w-3 h-3 text-[#1d3bb5]" /> {m.language || 'en'}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#111827] text-sm sm:text-base mt-2 tracking-tight">{m.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{m.description || 'Reference study document uploaded by instructor.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">By: <strong className="text-slate-700">{m.teacher_name || 'Instructor'}</strong></span>
                  <a
                    href={`/${m.file_path}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Recordings & Subtitles Downloads Tab */}
      {activeTab === 'recordings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111827] text-base flex items-center gap-2 tracking-tight">
              <Video className="w-4 h-4 text-[#1d3bb5]" /> Lecture Media & Artifacts
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>

          <div className="space-y-3.5">
            {recordings.map((s) => (
              <Card key={s.id} variant="default" className="p-5 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="brand" size="sm">
                        Session #{s.id}
                      </Badge>
                      <h3 className="font-bold text-[#111827] text-sm sm:text-base tracking-tight">{s.subject}</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Educator: {s.teacher_name || 'Faculty Teacher'} • Topic: {s.topic || 'Lecture'}</p>
                  </div>
                  <div className="text-xs text-slate-600 font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                    {s.date || 'Today'} ({s.duration || '45 mins'})
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
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
                    href={exportApi.downloadSubtitlesUrl(s.id)}
                    download
                    className="inline-flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold transition-colors shadow-sm"
                  >
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#1d3bb5]" /> Subtitles (VTT)
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

                  <button
                    onClick={() => speakText(`Lecture recording for ${s.subject}. Topic: ${s.topic || 'General Lecture'}. Instructor: ${s.teacher_name || 'Faculty Teacher'}.`)}
                    className="inline-flex items-center justify-between px-3 py-2 bg-amber-50 hover:bg-amber-100/70 text-amber-800 border border-amber-200 rounded-lg font-semibold transition-colors shadow-sm cursor-pointer"
                    title="Listen to Lecture Info Read Aloud for Blind Students"
                  >
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" /> Read Aloud
                    </span>
                    <Sparkles className="w-3 h-3 text-amber-600" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#111827] text-base flex items-center gap-2 tracking-tight">
              <Sparkles className="w-4 h-4 text-[#1d3bb5]" /> Smart AI Notes Stream
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Note
            </Button>
          </div>

          {showCreateModal && (
            <Card variant="default" className="p-5 space-y-3.5 border-[#dbeafe]">
              <h4 className="font-bold text-[#111827] text-xs uppercase tracking-wider">New Smart Note Entry</h4>
              <input
                type="text"
                placeholder="Note Title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none"
                required
              />
              <textarea
                rows={3}
                placeholder="Note content, summary or key takeaway..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20 outline-none resize-none"
                required
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isCreatingNote}
                  isLoading={isCreatingNote}
                  onClick={handleCreateNote}
                >
                  Save Note
                </Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!notes || notes.length === 0) ? (
              <div className="col-span-2">
                <EmptyState
                  icon={<Sparkles className="w-6 h-6 text-slate-400" />}
                  title="No AI Notes Found"
                  description="Create your first lecture note with AI keyword assistance."
                />
              </div>
            ) : (
              (notes || []).map((n: any) => (
                <Card key={n.id} variant="default" className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="brand" size="sm">
                      {n.subject || 'AI & Accessibility'}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">{n.created_at || 'Today'}</span>
                  </div>
                  <h3 className="font-bold text-[#111827] text-sm sm:text-base tracking-tight">{n.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

