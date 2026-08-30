import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, Filter } from 'lucide-react';
import { adminApi } from '../../api/client';
import { AuditLogItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(100);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = filterModule === 'all'
    ? logs
    : logs.filter((l) => l.module?.toLowerCase() === filterModule.toLowerCase());

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <FileText className="w-5 h-5 text-indigo-400" /> Audit Logs & Security Trails
          </h1>
          <p className="text-xs text-slate-400 mt-1">Immutable record of system authentications, OCR scans, voice triggers, and administrative actions</p>
        </div>

        <Button
          onClick={fetchLogs}
          disabled={loading}
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Filter Bar */}
      <Card variant="default" className="p-4 flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-300 font-semibold">Filter Module:</span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {['all', 'auth', 'ocr', 'voice', 'devices', 'accessibility'].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all duration-150 ${
                filterModule === mod
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#080c14] border border-[#1b2538] text-slate-400 hover:text-white'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card variant="default" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#080c14] border-b border-[#1b2538] text-slate-400 font-semibold uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3.5 px-4">Log ID</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b2538]/60 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    Querying audit trail database...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    No logs found for this module.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#121a2a] transition-colors">
                    <td className="py-3 px-4 text-indigo-400 font-bold">#{log.id}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-200">{log.action}</td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {log.module}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-300">
                      {log.user_id ? `User #${log.user_id}` : 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
