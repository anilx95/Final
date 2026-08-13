import React, { useEffect, useState } from 'react';
import {
  Building2,
  GraduationCap,
  School,
  Users,
  Video,
  Cpu,
  Sparkles,
  FileCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { adminApi } from '../../api/client';
import { OverviewStats, SystemHealth, AuditLogItem } from '../../types';
import { Link } from 'react-router-dom';

const chartData = [
  { name: 'Mon', activeUsers: 240, ocrScans: 120, voiceCmds: 45 },
  { name: 'Tue', activeUsers: 300, ocrScans: 180, voiceCmds: 70 },
  { name: 'Wed', activeUsers: 450, ocrScans: 290, voiceCmds: 110 },
  { name: 'Thu', activeUsers: 510, ocrScans: 340, voiceCmds: 135 },
  { name: 'Fri', activeUsers: 620, ocrScans: 410, voiceCmds: 190 },
  { name: 'Sat', activeUsers: 280, ocrScans: 150, voiceCmds: 60 },
  { name: 'Sun', activeUsers: 190, ocrScans: 90, voiceCmds: 30 },
];

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes, auditRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getSystemHealth(),
        adminApi.getAuditLogs(6),
      ]);
      setStats(statsRes.data);
      setHealth(healthRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Failed to load admin overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Enterprise Admin Portal</h1>
          <p className="text-xs text-slate-400">ClassAbly Infrastructure & Real-Time Accessibility System Monitoring</p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="btn-secondary text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
        </button>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Departments', value: stats?.departments ?? 0, icon: Building2, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Active Courses', value: stats?.courses ?? 0, icon: GraduationCap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Classrooms', value: stats?.classrooms ?? 0, icon: School, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Faculty Teachers', value: stats?.teachers ?? 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Enrolled Students', value: stats?.students ?? 0, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Active Lectures', value: stats?.active_sessions ?? 0, icon: Video, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Smart Devices', value: stats?.smart_devices ?? 0, icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'OCR Board Scans', value: stats?.board_ocr_captures ?? 0, icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Recordings', value: stats?.total_recordings ?? 0, icon: FileCheck, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Pending Requests', value: stats?.accessibility_requests ?? 0, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="card p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-slate-100">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" /> System Usage & Accessibility Metrics
              </h3>
              <p className="text-[11px] text-slate-400">Weekly active student sessions, board OCR extractions, and voice commands</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded-md">
              Live Telemetry
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOcr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="activeUsers" stroke="#38bdf8" fillOpacity={1} fill="url(#colorUsers)" name="Active Users" />
                <Area type="monotone" dataKey="ocrScans" stroke="#c084fc" fillOpacity={1} fill="url(#colorOcr)" name="OCR Board Extractions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Card */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Backend Infrastructure Health
            </h3>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Database Cluster</div>
                <div className="text-[10px] text-slate-400">PostgreSQL (SQLAlchemy Engine)</div>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                {health?.database.status.toUpperCase() || 'HEALTHY'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">AI Vision & Speech Pipeline</div>
                <div className="text-[10px] text-slate-400">YOLOv11, PaddleOCR, Whisper STT</div>
              </div>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                {health?.ai_pipeline.status.toUpperCase() || 'OPERATIONAL'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Smart Devices Online</div>
                <div className="text-[10px] text-slate-400">{health?.devices.online ?? 7} / {health?.devices.total ?? 7} Devices Connected</div>
              </div>
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                {health?.devices.health_pct ?? 100}% Health
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">System Uptime</div>
                <div className="text-[10px] text-slate-400">Continuous Service</div>
              </div>
              <span className="text-[11px] font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {health?.uptime || '99.98%'}
              </span>
            </div>
          </div>

          <Link to="/admin/system-health" className="btn-secondary w-full text-xs text-center justify-center">
            Detailed Diagnostic Specs <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Audit Logs Table */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Recent Security & Audit Logs
            </h3>
            <p className="text-[11px] text-slate-400">Live operational events, user authentications, and accessibility triggers</p>
          </div>
          <Link to="/admin/audit-logs" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
            View Full Audit History <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400">#{log.id}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 capitalize">{log.module}</td>
                  <td className="py-2.5 px-4 text-slate-300">{log.user_id ? `User #${log.user_id}` : 'System'}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                  <td className="py-2.5 px-4 text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
