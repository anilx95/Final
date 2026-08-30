import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, FileText, Calendar, Upload, Check } from 'lucide-react';
import { academicsApi } from '../../api/client';
import { Assignment } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <BookOpen className="w-5 h-5 text-indigo-400" /> Academic Assignments
          </h1>
          <p className="text-xs text-slate-400 mt-1">Post course assignments, attachments, and review student submissions</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Post New Assignment
        </Button>
      </div>

      {/* Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
            Loading assignment database...
          </div>
        ) : (!assignments || assignments.length === 0) ? (
          <div className="col-span-2">
            <EmptyState
              icon={<BookOpen className="w-6 h-6 text-slate-400" />}
              title="No Assignments Posted"
              description="Create your first assignment with due dates, maximum marks, and attachments."
              action={
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Post Assignment
                </Button>
              }
            />
          </div>
        ) : (
          (assignments || []).map((a) => (
            <Card key={a.id} variant="default" className="p-5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    Max Marks: {a.max_marks}
                  </Badge>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-rose-400" /> Due: {new Date(a.due_date).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-sm sm:text-base mt-2 tracking-tight">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.description || 'No additional instructions provided.'}</p>
              </div>

              <div className="pt-3 border-t border-[#1b2538] flex items-center justify-between text-xs">
                <span className="text-slate-400">Submissions: <strong className="text-emerald-400 font-semibold">{a.submissions_count || 0} Submitted</strong></span>
                {a.file_path && (
                  <span className="text-sky-400 font-semibold flex items-center gap-1 text-[11px]">
                    <FileText className="w-3.5 h-3.5" /> Attachment
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post New Assignment"
        description="Provide details, due date, and optional attachment file."
      >
        <form onSubmit={handleCreateAssignment} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="Assignment Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions / Description</label>
            <textarea
              rows={3}
              placeholder="Detailed instructions for students..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field text-xs resize-none"
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
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Marks</label>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Attachment File (Optional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-[#1b2538]">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} isLoading={isSubmitting} className="flex-1">
              Post Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
