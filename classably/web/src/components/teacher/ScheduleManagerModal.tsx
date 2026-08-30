import React, { useState } from 'react';
import { X, Clock, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { academicsApi } from '../../api/client';
import { TimetableItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface ScheduleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetable: TimetableItem[];
  onRefresh: () => void;
}

export const ScheduleManagerModal: React.FC<ScheduleManagerModalProps> = ({
  isOpen,
  onClose,
  timetable,
  onRefresh,
}) => {
  const { addToast } = useToast();
  const [editingSlot, setEditingSlot] = useState<TimetableItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [time, setTime] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [topic, setTopic] = useState('');
  const [section, setSection] = useState('Sec-A');
  const [classroom, setClassroom] = useState('Smart Room 101');

  if (!isOpen) return null;

  const startEditSlot = (slot: TimetableItem) => {
    setEditingSlot(slot);
    setIsAddingNew(false);
    setTime(slot.time || '');
    setSubjectName(slot.subject_name || '');
    setSubjectCode(slot.subject_code || '');
    setTopic(slot.topic || '');
    setSection(slot.section || 'Sec-A');
    setClassroom(slot.classroom || 'Smart Room 101');
  };

  const startAddNewSlot = () => {
    setEditingSlot(null);
    setIsAddingNew(true);
    setTime('10:00 AM - 11:30 AM');
    setSubjectName('');
    setSubjectCode('CSE302');
    setTopic('');
    setSection('Sec-A');
    setClassroom('Smart Hall 101');
  };

  const resetForm = () => {
    setEditingSlot(null);
    setIsAddingNew(false);
    setTime('');
    setSubjectName('');
    setSubjectCode('');
    setTopic('');
    setSection('Sec-A');
    setClassroom('Smart Room 101');
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time.trim() || !subjectName.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Fields',
        description: 'Please provide both class time range and subject name.',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        time,
        subject_name: subjectName,
        subject_code: subjectCode || 'SUB101',
        topic: topic || 'Lecture Topic',
        section,
        classroom,
      };

      if (editingSlot) {
        await academicsApi.updateTimetableSlot(editingSlot.id, payload);
        addToast({
          type: 'success',
          title: 'Schedule Updated',
          description: `Class slot updated for ${subjectName}.`,
        });
      } else {
        await academicsApi.createTimetableSlot(payload);
        addToast({
          type: 'success',
          title: 'New Class Slot Added',
          description: `Created new upcoming lecture slot at ${time}.`,
        });
      }

      resetForm();
      onRefresh();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.response?.data?.detail || 'Could not save timetable slot.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    if (!window.confirm('Are you sure you want to delete this upcoming class slot?')) return;
    try {
      await academicsApi.deleteTimetableSlot(slotId);
      addToast({
        type: 'info',
        title: 'Slot Removed',
        description: 'Upcoming class removed from schedule.',
      });
      onRefresh();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: 'Could not delete slot.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0d131f] border border-[#1b2538] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1b2538] bg-[#080c14]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">Manage Lecture Schedule</h2>
              <p className="text-xs text-slate-400">Add, edit class timing, topics, and room assignments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Add / Edit Form */}
          {(editingSlot || isAddingNew) ? (
            <form onSubmit={handleSaveSlot} className="p-4 rounded-xl bg-[#080c14] border border-sky-500/30 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#1b2538] pb-2">
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
                  {editingSlot ? `Editing Slot #${editingSlot.id}` : 'Add New Class Slot'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Class Time / Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM - 10:30 AM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Machine Learning & Vision"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    required
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE301"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Topic</label>
                  <input
                    type="text"
                    placeholder="e.g. Deep Neural Networks"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Sec-A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Classroom / Hall</label>
                  <input
                    type="text"
                    placeholder="e.g. Smart Room 101"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loading}
                  isLoading={loading}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {editingSlot ? 'Update Slot' : 'Save Slot'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-semibold">
                Scheduled Slots for Today ({(timetable || []).length})
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={startAddNewSlot}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Class Slot
              </Button>
            </div>
          )}

          {/* List of Existing Slots */}
          <div className="space-y-2.5">
            {(!timetable || timetable.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No upcoming lecture slots found. Click "Add Class Slot" above to schedule one.
              </div>
            ) : (
              (timetable || []).map((slot) => (
                <div
                  key={slot.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    editingSlot?.id === slot.id
                      ? 'bg-sky-500/10 border-sky-500/50'
                      : 'bg-[#080c14] border-[#1b2538] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 font-mono text-xs font-bold shrink-0 mt-0.5 border border-sky-500/20">
                      {slot.time}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {slot.subject_code}
                        </span>
                        <span className="font-bold text-slate-100 text-xs sm:text-sm">{slot.subject_name}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        Topic: <span className="text-sky-300 font-medium">{slot.topic || 'General Lecture'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>Sec: <strong className="text-slate-200">{slot.section}</strong></span>
                        <span>Room: <strong className="text-slate-200">{slot.classroom}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      onClick={() => startEditSlot(slot)}
                      className="p-1.5 rounded-lg bg-slate-800/80 text-sky-400 hover:bg-sky-500/20 transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Edit Timing & Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1.5 rounded-lg bg-slate-800/80 text-rose-400 hover:bg-rose-500/20 transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Remove Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1b2538] bg-[#080c14] flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
