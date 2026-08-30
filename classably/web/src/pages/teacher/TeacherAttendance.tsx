import React, { useEffect, useState } from 'react';
import { CheckSquare, Save } from 'lucide-react';
import { studentsApi, attendanceApi } from '../../api/client';
import { StudentProfile } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const TeacherAttendance: React.FC = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, 'present' | 'absent' | 'late'>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const classroomId = (user as any)?.classroom_id || 1;

  useEffect(() => {
    studentsApi.getStudents()
      .then((res) => {
        setStudents(res.data);
        const initialMap: Record<number, 'present' | 'absent' | 'late'> = {};
        res.data.forEach((s: any) => {
          initialMap[s.id] = 'present';
        });
        setAttendanceMap(initialMap);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      await Promise.all(
        Object.entries(attendanceMap).map(([studentId, status]) =>
          attendanceApi.markAttendance({
            student_id: Number(studentId),
            classroom_id: classroomId,
            status,
            timestamp: new Date().toISOString(),
          })
        )
      );
      addToast({
        type: 'success',
        title: 'Attendance Saved',
        description: 'Attendance records updated for all section students.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: 'Failed to record attendance. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(attendanceMap).filter((v) => v === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter((v) => v === 'late').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <CheckSquare className="w-5 h-5 text-emerald-400" /> Attendance Marker
          </h1>
          <p className="text-xs text-slate-400 mt-1">Mark daily attendance for enrolled section students</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {presentCount} Present
            </span>
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
              {absentCount} Absent
            </span>
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              {lateCount} Late
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAttendance}
            disabled={isSaving}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Attendance
          </Button>
        </div>
      </div>

      <Card variant="default" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#080c14] border-b border-[#1b2538] text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Status Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2538]">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">Loading student roster...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">No students found in this section.</td>
                </tr>
              ) : (
                students.map((s) => {
                  const status = attendanceMap[s.id] || 'present';
                  return (
                    <tr key={s.id} className="hover:bg-[#121a2a]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100">{s.name || `Student #${s.id}`}</td>
                      <td className="py-3 px-4 font-mono text-sky-400 text-[11px]">{s.roll_number || `STU-${s.id}`}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {[
                            { st: 'present', label: 'Present', activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' },
                            { st: 'absent', label: 'Absent', activeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm' },
                            { st: 'late', label: 'Late', activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' },
                          ].map((item) => (
                            <button
                              key={item.st}
                              type="button"
                              onClick={() => handleStatusChange(s.id, item.st as any)}
                              className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all duration-150 ${
                                status === item.st
                                  ? item.activeClass
                                  : 'bg-[#080c14] border-[#151d2c] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
