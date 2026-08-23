import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, FileText, Calendar, Upload, Check } from 'lucide-react';
import { academicsApi } from '../../api/client';
import { Assignment } from '../../types';
import { useToast } from '../../context/ToastContext';

export const TeacherAssignments: React.FC = () => {
  const { addToast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await academicsApi.getAssignments();
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('subject_id', String(subjectId));
      formData.append('due_date', new Date(dueDate).toISOString());
      formData.append('max_marks', String(maxMarks));
      if (file) {
        formData.append('file', file);
      }

      await academicsApi.createAssignment(formData);
      addToast({
        type: 'success',
        title: 'Assignment Created',
        description: 'New assignment has been assigned to students.',
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      fetchAssignments();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Creation Error',
        description: err.response?.data?.detail || 'Could not post assignment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" /> Academic Assignments
          </h1>
          <p className="text-xs text-slate-400">Post course assignments, attachments, and grade student submissions</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-xs">
          <Plus className="w-4 h-4" /> Post New Assignment
        </button>
      </div>

      {/* Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="card col-span-2 text-center py-12 text-slate-400 text-xs">
            Loading assignment database...
          </div>
        ) : (!assignments || assignments.length === 0) ? (
          <div className="card col-span-2 text-center py-12 text-slate-400 text-xs">
            No assignments created yet. Click "Post New Assignment" to get started.
          </div>
        ) : (
          (assignments || []).map((a) => (
            <div key={a.id} className="card p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    Max Marks: {a.max_marks}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" /> Due: {new Date(a.due_date).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-base mt-2">{a.title}</h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{a.description || 'No additional instructions provided.'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Submissions: <strong className="text-emerald-400">{a.submissions_count || 0} Submitted</strong></span>
                {a.file_path && (
                  <span className="text-sky-400 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Attachment Available
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
            <h3 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-3 mb-4">Post Assignment</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Assignment Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions / Description</label>
                <textarea
                  rows={3}
                  placeholder="Details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Attachment File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 text-xs">
                  {isSubmitting ? 'Posting...' : 'Post Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
