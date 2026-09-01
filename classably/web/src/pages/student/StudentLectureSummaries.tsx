import React, { useEffect, useState } from 'react';
import { BookOpen, Brain, CheckCircle2, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { aiQaApi, lectureApi } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const StudentLectureSummaries: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [style, setStyle] = useState('detailed');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const result = await lectureApi.getHistory();
      const nextSessions = Array.isArray(result.data) ? result.data : [];
      setSessions(nextSessions);
      if (!selectedId && nextSessions[0]) setSelectedId(nextSessions[0].id);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    if (!selectedId) { setSummary(null); return; }
    aiQaApi.getSummary(selectedId).then((result) => setSummary(result.data?.summary || null)).catch(() => setSummary(null));
  }, [selectedId]);

  const generate = async () => {
    if (!selectedId || generating) return;
    setGenerating(true);
    try {
      const result = await aiQaApi.summarizeLecture(selectedId, style);
      setSummary(result.data?.summary || null);
    } finally { setGenerating(false); }
  };

  return <div className="max-w-6xl space-y-6 animate-fade-in">
    <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div><h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">AI Lecture Summary & Study Notes</h1><p className="mt-1 text-sm text-slate-500">Generate and review lecture-wise notes, concepts, definitions, and key takeaways.</p></div>
      <Button variant="secondary" size="sm" onClick={loadSessions} disabled={loading} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>Refresh lectures</Button>
    </header>
    {loading ? <div className="py-16 text-center text-sm text-slate-500">Loading completed lectures…</div> : sessions.length === 0 ? <EmptyState icon={<BookOpen className="w-6 h-6 text-slate-400" />} title="No completed lectures yet" description="Your AI study notes will be available after a lecture is completed." /> : <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
      <Card variant="default" className="p-3 space-y-2 max-h-[65vh] overflow-y-auto">
        <p className="px-2 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Select a lecture</p>
        {sessions.map((session) => <button key={session.id} type="button" onClick={() => setSelectedId(session.id)} className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedId === session.id ? 'border-[#1d3bb5] bg-[#eff4ff] text-[#1d3bb5]' : 'border-transparent hover:bg-slate-50 text-slate-700'}`}><p className="font-semibold text-sm truncate">{session.subject || 'Lecture session'}</p><p className="mt-1 text-xs text-slate-500 truncate">{session.topic || 'General lecture'}</p></button>)}
      </Card>
      <Card variant="default" className="p-5 sm:p-6 space-y-5 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-2"><div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div><div><h2 className="font-bold text-slate-900">Study notes</h2><p className="text-xs text-slate-500">Choose a note style, then generate from the selected lecture.</p></div></div><div className="flex gap-2"><select aria-label="Summary style" value={style} onChange={(event) => setStyle(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="detailed">Comprehensive</option><option value="bullet">Key points</option><option value="quiz">Study quiz</option></select><Button variant="primary" size="sm" onClick={generate} disabled={!selectedId || generating} isLoading={generating} leftIcon={<Brain className="w-3.5 h-3.5" />}>Generate</Button></div></div>
        {summary ? <div className="space-y-5"><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{summary.summary_text || summary.full_summary}</div>{(summary.key_points || summary.key_takeaways || []).length > 0 && <section><h3 className="mb-2 flex items-center gap-2 font-bold text-sm text-slate-900"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Key points</h3><ul className="space-y-2">{(summary.key_points || summary.key_takeaways).map((point: string, index: number) => <li key={`${point}-${index}`} className="flex gap-2 text-sm text-slate-700"><span className="text-emerald-600">•</span>{point}</li>)}</ul></section>}{(summary.definitions || []).length > 0 && <section><h3 className="mb-2 flex items-center gap-2 font-bold text-sm text-slate-900"><FileText className="w-4 h-4 text-[#1d3bb5]" />Important concepts</h3><div className="space-y-2">{summary.definitions.map((item: string, index: number) => <p key={`${item}-${index}`} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">{item}</p>)}</div></section>}</div> : <EmptyState icon={<Sparkles className="w-6 h-6 text-slate-400" />} title="No summary generated yet" description="Select a completed lecture and generate study notes when you are ready." />}
      </Card>
    </div>}
  </div>;
};
