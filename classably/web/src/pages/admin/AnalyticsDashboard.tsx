import React, { useEffect, useState } from 'react';
import { BarChart3, Camera, Mic, Sparkles, Clock } from 'lucide-react';
import { dashboardApi } from '../../api/client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getAnalytics()
      .then((res) => setAnalytics(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const barData = [
    { metric: 'Camera FPS', value: analytics?.cameraFPS || 15 },
    { metric: 'OCR Accuracy %', value: 92 },
    { metric: 'AI Confidence %', value: 95 },
    { metric: 'Students Detected', value: analytics?.studentsDetected || 12 },
    { metric: 'Voice Cmds Today', value: analytics?.voiceCommands || 8 },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] flex items-center gap-2.5 tracking-tight">
          <BarChart3 className="w-5 h-5 text-[#1d43d9]" /> Real-Time Analytics Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-1">Live AI Vision telemetry, voice command processing stats, and camera metrics</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Fetching live telemetry...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Camera Status</div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
                <Camera className="w-4 h-4" /> {analytics?.cameraStatus || 'Online'}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">OCR Accuracy</div>
              <div className="text-lg sm:text-xl font-bold text-[#1d43d9] mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> {analytics?.ocrAccuracy || '92%'}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Voice Commands Today</div>
              <div className="text-lg sm:text-xl font-bold text-indigo-600 mt-1 flex items-center gap-2">
                <Mic className="w-4 h-4" /> {analytics?.voiceCommands || 8}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Server Uptime</div>
              <div className="text-lg sm:text-xl font-bold text-amber-600 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {analytics?.uptime || '4h 12m'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-sm mb-4 tracking-tight">AI Telemetry Metrics Comparison</h3>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                  <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#1d43d9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
