import React, { useEffect, useRef, useState } from 'react';
import { Brain, MessageSquare, Send, Trash2 } from 'lucide-react';
import { aiQaApi, lectureApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const StudentClassroomAssistant: React.FC = () => {
  const { addToast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { lectureApi.getAllActiveSessions().then((result) => { const next = Array.isArray(result.data?.active_sessions) ? result.data.active_sessions : []; setSessions(next); if (next[0]) setSessionId(next[0].id); }).catch(() => setSessions([])).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!sessionId) { setMessages([]); return; } aiQaApi.getQAHistory(sessionId).then((result) => setMessages(result.data || [])).catch(() => setMessages([])); }, [sessionId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  const ask = async () => {
    if (!sessionId || !question.trim() || asking) return;
    const text = question.trim(); const temporaryId = Date.now(); setQuestion(''); setAsking(true);
    setMessages((previous) => [...previous, { id: temporaryId, question: text, answer: '' }]);
    try { const result = await aiQaApi.askQuestion({ session_id: sessionId, question: text }); const response = result.data.message; setMessages((previous) => previous.map((message) => message.id === temporaryId ? { ...message, ...response } : message)); }
    catch { setMessages((previous) => previous.map((message) => message.id === temporaryId ? { ...message, answer: 'Sorry, I could not answer that just now. Please try again.' } : message)); addToast({ type: 'error', title: 'AI assistant unavailable', description: 'Please try your question again.' }); }
    finally { setAsking(false); }
  };
  const clear = async () => { if (!sessionId) return; try { await aiQaApi.clearQAHistory(sessionId); } catch {} setMessages([]); };

  return <div className="max-w-5xl space-y-6 animate-fade-in">
    <header><h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">AI Classroom Assistant</h1><p className="mt-1 text-sm text-slate-500">Ask context-aware questions about your live class and review the conversation in one place.</p></header>
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Connecting to active classes…</div> : sessions.length === 0 ? <EmptyState icon={<MessageSquare className="w-6 h-6 text-slate-400" />} title="No live class is active" description="The classroom assistant becomes available when a teacher starts a live session." /> : <Card variant="default" className="p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5 border-b border-slate-200"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#1d3bb5] text-white flex items-center justify-center"><Brain className="w-4 h-4" /></div><div><h2 className="font-bold text-slate-900">Live doubt solver</h2><p className="text-xs text-slate-500">Responses use the selected live session.</p></div></div><div className="flex gap-2"><select aria-label="Active live class" value={sessionId || ''} onChange={(event) => setSessionId(Number(event.target.value))} className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700">{sessions.map((session) => <option key={session.id} value={session.id}>{session.subject || session.topic || `Session ${session.id}`}</option>)}</select>{messages.length > 0 && <button type="button" onClick={clear} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 className="inline w-3.5 h-3.5 mr-1" />Clear</button>}</div></div>
      <div className="min-h-[360px] max-h-[55vh] overflow-y-auto space-y-4 p-4 sm:p-5 bg-slate-50">{messages.length === 0 ? <div className="h-full min-h-[300px] flex flex-col justify-center items-center text-center"><MessageSquare className="w-8 h-8 text-[#1d3bb5] mb-3" /><h3 className="font-semibold text-slate-800">How can I help with this class?</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Ask about a concept, formula, example, or something your teacher just explained.</p></div> : messages.map((message) => <div key={message.id} className="space-y-2"><div className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#1d3bb5] px-3.5 py-2.5 text-sm text-white">{message.question}</p></div><div className="flex gap-2"><div className="w-7 h-7 shrink-0 rounded-md bg-white border border-slate-200 text-[#1d3bb5] flex items-center justify-center text-[10px] font-bold">AI</div><p className="max-w-[88%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 whitespace-pre-wrap">{message.answer || 'Thinking…'}</p></div></div>)}<div ref={endRef} /></div>
      <form onSubmit={(event) => { event.preventDefault(); ask(); }} className="flex gap-2 p-4 sm:p-5 border-t border-slate-200"><label className="sr-only" htmlFor="assistant-question">Ask the classroom assistant</label><input id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this live class…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#1d3bb5] focus:ring-2 focus:ring-[#1d3bb5]/20" disabled={asking} /><Button type="submit" variant="primary" size="sm" disabled={!question.trim() || asking} isLoading={asking} leftIcon={<Send className="w-3.5 h-3.5" />}>Ask</Button></form>
    </Card>}
  </div>;
};
