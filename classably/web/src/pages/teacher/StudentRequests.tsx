import React, { useEffect, useState } from 'react';
import { HelpCircle, CheckCircle2, MessageSquare, Hand } from 'lucide-react';
import { lectureApi, assistApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <HelpCircle className="w-5 h-5 text-amber-400" /> Student Raised-Hand Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1">Live student doubts, accessibility support calls, and raised hands</p>
        </div>

        <Badge variant="warning" size="md">
          {requests.length} Pending Requests
        </Badge>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Loading queue...</div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Hand className="w-6 h-6 text-slate-400" />}
            title="No Active Requests"
            description="All student questions and assistance calls are currently resolved."
          />
        ) : (
          requests.map((r) => (
            <Card key={`${r.type}-${r.id}`} variant="default" className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-amber-500/25">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.type === 'raise_hand' ? 'warning' : 'ai'} size="sm">
                    {r.type === 'raise_hand' ? 'Raised Hand' : 'Assistance Call'}
                  </Badge>
                  <span className="font-bold text-slate-100 text-sm tracking-tight">{r.student_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{r.created_at}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5">{r.question_text || 'Student requested attention.'}</p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleResolve(r)}
                className="shrink-0"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Mark Resolved
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
