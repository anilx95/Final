import React, { useEffect, useState } from 'react';
import { HelpCircle, CheckCircle2, Clock, MessageSquare } from 'lucide-react';
import { lectureApi, assistApi } from '../../api/client';
import { RaiseHandItem } from '../../types';
import { useToast } from '../../context/ToastContext';

export const StudentRequests: React.FC = () => {
  const { addToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [raiseRes, assistRes] = await Promise.allSettled([
        lectureApi.getRaiseHandQueue(1),
        assistApi.getRequests(),
      ]);

      const combined: any[] = [];
      if (raiseRes.status === 'fulfilled' && Array.isArray(raiseRes.value.data)) {
        combined.push(...raiseRes.value.data.map((r: any) => ({ ...r, type: 'raise_hand' })));
      }
      if (assistRes.status === 'fulfilled' && Array.isArray(assistRes.value.data)) {
        combined.push(...assistRes.value.data.map((a: any) => ({
          id: a.id,
          student_name: a.student_name || `Student #${a.student_id}`,
          question_text: a.message,
          created_at: a.created_at || 'Just now',
          type: 'general_assist',
        })));
      }

      setRequests(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResolve = async (item: any) => {
    try {
      if (item.type === 'general_assist') {
        await assistApi.resolveRequest(item.id);
      } else {
        await lectureApi.resolveRaiseHand(item.id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== item.id || r.type !== item.type));
      addToast({
        type: 'success',
        title: 'Resolved',
        description: 'Student assistance request marked resolved.',
      });
    } catch (err) {}
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-amber-400" /> Student Raised-Hand & Assistance Queue
        </h1>
        <p className="text-xs text-slate-400">Live student queries, accessibility support calls, and raised hands during active lectures</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card text-center py-8 text-slate-400 text-xs">Loading queue...</div>
        ) : requests.length === 0 ? (
          <div className="card text-center py-12 text-slate-400 text-xs">No active student assistance requests in queue.</div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-amber-500/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">{r.student_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{r.created_at}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{r.question_text}</p>
              </div>

              <button onClick={() => handleResolve(r)} className="btn-primary text-xs shrink-0 py-1.5">
                <CheckCircle2 className="w-4 h-4" /> Mark Resolved
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
