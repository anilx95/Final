import React, { useEffect, useState } from 'react';
import { FolderDown, FileText, Download, Globe, Sparkles, Plus, Video, Volume2, Calendar, RefreshCw } from 'lucide-react';
import { academicsApi, notesApi, lectureApi, exportApi } from '../../api/client';
import { StudyMaterial } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAccessibility } from '../../context/AccessibilityContext';

export const StudentStudyMaterials: React.FC = () => {
  const { addToast } = useToast();
  const { speakText } = useAccessibility();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'notes' | 'recordings'>('materials');
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
      if (matRes.status === 'fulfilled') setMaterials(matRes.value.data);
      if (notesRes.status === 'fulfilled') setNotes(notesRes.value.data);
      if (historyRes.status === 'fulfilled' && historyRes.value.data?.length > 0) {
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <FolderDown className="w-6 h-6 text-emerald-400" /> Study Materials & Recordings Repository
          </h1>
          <p className="text-xs text-slate-400">Download lecture video/audio recordings, subtitles (VTT), transcripts, PDF summaries & course files</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('materials')}
            className={`btn-secondary text-xs ${activeTab === 'materials' ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10' : ''}`}
          >
            <FileText className="w-3.5 h-3.5" /> Study Materials ({materials.length})
          </button>
          <button
            onClick={() => setActiveTab('recordings')}
            className={`btn-secondary text-xs ${activeTab === 'recordings' ? 'border-sky-500 text-sky-300 bg-sky-500/10' : ''}`}
          >
            <Video className="w-3.5 h-3.5 text-sky-400" /> Recordings & Subtitles ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`btn-secondary text-xs ${activeTab === 'notes' ? 'border-purple-500 text-purple-300 bg-purple-500/10' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Notes ({notes.length})
          </button>
        </div>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="card col-span-2 text-center py-12 text-slate-400 text-xs">Loading course files...</div>
          ) : materials.length === 0 ? (
            <div className="card col-span-2 text-center py-12 text-slate-400 text-xs">No study materials uploaded yet.</div>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="card p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">
                      {m.file_type || 'PDF'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-sky-400" /> {m.language || 'en'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-base mt-2">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{m.description || 'Reference study document uploaded by instructor.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">By: {m.teacher_name || 'Instructor'}</span>
                  <a
                    href={`/${m.file_path}`}
                    download
                    className="btn-secondary text-xs py-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Recordings & Subtitles Downloads Tab */}
      {activeTab === 'recordings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-sky-400" /> Lecture Video/Audio Recordings & Subtitles Downloads
            </h3>
            <button onClick={fetchData} disabled={loading} className="btn-secondary text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="space-y-4">
            {recordings.map((s) => (
              <div key={s.id} className="card p-5 space-y-4 border-sky-500/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                        Session #{s.id}
                      </span>
                      <h3 className="font-bold text-slate-100 text-base">{s.subject}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Educator: {s.teacher_name || 'Faculty Teacher'} • Topic: {s.topic || 'Lecture'}</p>
                  </div>
                  <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1 rounded border border-slate-800 self-start sm:self-auto">
                    {s.date || 'Today'} ({s.duration || '45 mins'})
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <a href={exportApi.downloadRecordingUrl(s.id)} download className="btn-secondary py-2 justify-between text-sky-400 border-sky-500/30">
                    <span className="flex items-center gap-1">
                      <Video className="w-3.5 h-3.5" /> MP4 Video
                    </span>
                    <Download className="w-3 h-3" />
                  </a>

                  <a href={exportApi.downloadAudioUrl(s.id)} download className="btn-secondary py-2 justify-between text-emerald-400 border-emerald-500/30">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" /> MP3 Audio
                    </span>
                    <Download className="w-3 h-3" />
                  </a>

                  <a href={exportApi.downloadSubtitlesUrl(s.id)} download className="btn-secondary py-2 justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-sky-400" /> Subtitles (VTT)
                    </span>
                    <Download className="w-3 h-3" />
                  </a>

                  <a href={exportApi.downloadTranscriptUrl(s.id)} download className="btn-secondary py-2 justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" /> Transcript (TXT)
                    </span>
                    <Download className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => speakText(`Lecture recording for ${s.subject}. Topic: ${s.topic || 'General Lecture'}. Instructor: ${s.teacher_name || 'Faculty Teacher'}.`)}
                    className="btn-secondary py-2 justify-between text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                    title="Listen to Lecture Info Read Aloud for Blind Students"
                  >
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Read Aloud
                    </span>
                    <Sparkles className="w-3 h-3" />
                  </button>

                  <a href={exportApi.downloadSummaryUrl(s.id)} download className="btn-secondary py-2 justify-between text-purple-400 border-purple-500/30">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> PDF Summary
                    </span>
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Smart AI Notes Stream
            </h3>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs">
              <Plus className="w-4 h-4" /> Create AI Note
            </button>
          </div>

          {showCreateModal && (
            <form onSubmit={handleCreateNote} className="card p-5 space-y-4 border-purple-500/30 bg-purple-950/20">
              <h4 className="font-bold text-slate-100 text-xs uppercase tracking-wider">New Smart Note Entry</h4>
              <input
                type="text"
                placeholder="Note Title..."
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                className="input-field text-xs"
                required
              />
              <textarea
                rows={3}
                placeholder="Note content, summary or key takeaway..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="input-field text-xs"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingNote} className="btn-primary text-xs">
                  Save Note
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.length === 0 ? (
              <div className="card col-span-2 text-center py-12 text-slate-400 text-xs">
                No AI notes found. Click "Create AI Note" to record lecture notes.
              </div>
            ) : (
              notes.map((n: any) => (
                <div key={n.id} className="card p-5 space-y-3 border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                      {n.subject || 'AI & Accessibility'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{n.created_at || 'Today'}</span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-base">{n.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};


