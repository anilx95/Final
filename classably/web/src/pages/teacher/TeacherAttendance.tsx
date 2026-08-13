import React, { useEffect, useState } from 'react';
import { CheckSquare, UserCheck, CheckCircle2, XCircle, Clock, Save } from 'lucide-react';
import { studentsApi, attendanceApi } from '../../api/client';
import { StudentProfile } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

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
      // Dispatch mark attendance requests via central attendanceApi
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
        description: 'Failed to record attendance. Please check network connection or try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-400" /> Class Attendance Marker
          </h1>
          <p className="text-xs text-slate-400">Mark daily attendance for enrolled students in Smart Hall 101</p>
        </div>

        <button onClick={handleSaveAttendance} disabled={isSaving} className="btn-primary text-xs">
          <Save className="w-4 h-4" /> Save Attendance Sheet
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-slate-400">Loading student roster...</td>
                </tr>
              ) : (
                students.map((s) => {
                  const status = attendanceMap[s.id] || 'present';
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100">{s.name || `Student #${s.id}`}</td>
                      <td className="py-3 px-4 font-mono text-sky-400 text-[11px]">{s.roll_number || `STU-${s.id}`}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {[
                            { st: 'present', label: 'Present', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                            { st: 'absent', label: 'Absent', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                            { st: 'late', label: 'Late', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                          ].map((item) => (
                            <button
                              key={item.st}
                              onClick={() => handleStatusChange(s.id, item.st as any)}
                              className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                status === item.st
                                  ? item.color
                                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800'
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
      </div>
    </div>
  );
};
