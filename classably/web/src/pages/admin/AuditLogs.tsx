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
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] flex items-center gap-2.5 tracking-tight">
            <FileText className="w-5 h-5 text-[#1d43d9]" /> Audit Logs & Security Trails
          </h1>
          <p className="text-xs text-slate-500 mt-1">Immutable record of system authentications, OCR scans, voice triggers, and administrative actions</p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-600 font-semibold">Filter Module:</span>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {['all', 'auth', 'ocr', 'voice', 'devices', 'accessibility'].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`px-3 py-1 rounded-lg capitalize font-semibold transition-all duration-150 cursor-pointer ${
                filterModule === mod
                  ? 'bg-[#1d43d9] text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-200/60 text-slate-600 hover:text-slate-900'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10.5px] tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">LOG ID</th>
                <th className="py-3.5 px-4 sm:px-6">ACTION</th>
                <th className="py-3.5 px-4 sm:px-6">MODULE</th>
                <th className="py-3.5 px-4 sm:px-6">USER</th>
                <th className="py-3.5 px-4 sm:px-6">DETAILS</th>
                <th className="py-3.5 px-4 sm:px-6">IP ADDRESS</th>
                <th className="py-3.5 px-4 sm:px-6">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
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
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 sm:px-6 text-[#1d43d9] font-mono font-bold">#{log.id}</td>
                    <td className="py-3 px-4 sm:px-6 font-sans font-semibold text-slate-900">{log.action}</td>
                    <td className="py-3 px-4 sm:px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 capitalize">
                        {log.module}
                      </span>
                    </td>
                    <td className="py-3 px-4 sm:px-6 font-sans text-slate-700">
                      {log.user_id ? `User #${log.user_id}` : 'System'}
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-slate-500 font-mono max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 sm:px-6 text-slate-500 font-mono">{log.ip_address || '127.0.0.1'}</td>
                    <td className="py-3 px-4 sm:px-6 text-slate-500 font-sans">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
