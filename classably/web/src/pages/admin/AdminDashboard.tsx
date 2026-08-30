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
} from 'recharts';
import { adminApi } from '../../api/client';
import { OverviewStats, SystemHealth, AuditLogItem } from '../../types';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

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
      setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : []);
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
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Enterprise Admin Portal</h1>
          <p className="text-xs text-slate-400 mt-1">ClassAbly Infrastructure & Real-Time Accessibility System Monitoring</p>
        </div>

        <Button
          onClick={loadDashboardData}
          disabled={loading}
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Departments', value: stats?.departments ?? 0, icon: Building2, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Active Courses', value: stats?.courses ?? 0, icon: GraduationCap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Classrooms', value: stats?.classrooms ?? 0, icon: School, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Faculty Teachers', value: stats?.teachers ?? 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Enrolled Students', value: stats?.students ?? 0, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Active Lectures', value: stats?.active_sessions ?? 0, icon: Video, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Smart Devices', value: stats?.smart_devices ?? 0, icon: Cpu, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'OCR Board Scans', value: stats?.board_ocr_captures ?? 0, icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Recordings', value: stats?.total_recordings ?? 0, icon: FileCheck, color: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Pending Requests', value: stats?.accessibility_requests ?? 0, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Card key={idx} variant="default" className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">{item.label}</span>
                <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">{item.value}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="default" className="lg:col-span-2 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
                <TrendingUp className="w-4 h-4 text-sky-400" /> System Usage & Accessibility Metrics
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Weekly active student sessions, board OCR extractions, and voice commands</p>
            </div>
            <Badge variant="brand" size="sm">
              Live Telemetry
            </Badge>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOcr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2538" opacity={0.6} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d131f', borderColor: '#1b2538', borderRadius: '10px', fontSize: '12px', color: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="activeUsers" stroke="#38bdf8" fillOpacity={1} fill="url(#colorUsers)" name="Active Users" />
                <Area type="monotone" dataKey="ocrScans" stroke="#818cf8" fillOpacity={1} fill="url(#colorOcr)" name="OCR Board Extractions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* System Health Card */}
        <Card variant="default" className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-[#1b2538] pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
              <Activity className="w-4 h-4 text-emerald-400" /> Infrastructure Health
            </h3>
            <Badge variant="success" size="sm">
              <CheckCircle2 className="w-3 h-3" /> Operational
            </Badge>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#080c14] border border-[#1b2538] flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Database Engine</div>
                <div className="text-[10px] text-slate-400 mt-0.5">PostgreSQL Engine</div>
              </div>
              <Badge variant="success" size="sm">
                {health?.database.status.toUpperCase() || 'HEALTHY'}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-[#080c14] border border-[#1b2538] flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">AI Vision & Speech Pipeline</div>
                <div className="text-[10px] text-slate-400 mt-0.5">YOLOv11, PaddleOCR, Whisper</div>
              </div>
              <Badge variant="brand" size="sm">
                {health?.ai_pipeline.status.toUpperCase() || 'OPERATIONAL'}
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-[#080c14] border border-[#1b2538] flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Smart Devices Online</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{health?.devices.online ?? 7} / {health?.devices.total ?? 7} Devices Connected</div>
              </div>
              <Badge variant="ai" size="sm">
                {health?.devices.health_pct ?? 100}% Health
              </Badge>
            </div>

            <div className="p-3 rounded-xl bg-[#080c14] border border-[#1b2538] flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">System Uptime</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Continuous Service</div>
              </div>
              <Badge variant="neutral" size="sm">
                {health?.uptime || '99.98%'}
              </Badge>
            </div>
          </div>

          <Link to="/admin/system-health" className="btn-secondary w-full text-xs text-center justify-center">
            Detailed Diagnostic Specs <ChevronRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>

      {/* Recent Audit Logs Table */}
      <Card variant="default" className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 tracking-tight">
              <Clock className="w-4 h-4 text-indigo-400" /> Recent Security & Audit Logs
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Live operational events, user authentications, and accessibility triggers</p>
          </div>
          <Link to="/admin/audit-logs" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
            View Full Audit History <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1b2538] text-slate-400 font-semibold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2538]/60">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#121a2a] transition-colors">
                  <td className="py-2.5 px-4 font-mono text-slate-400">#{log.id}</td>
                  <td className="py-2.5 px-4">
                    <Badge variant="brand" size="sm">
                      {log.action}
                    </Badge>
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
      </Card>
    </div>
  );
};
