import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#06090f] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 tracking-tight">404 - Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm mt-2 mb-6 leading-relaxed">
        The requested URL path does not exist or you do not have authorization permissions to view it.
      </p>
      <Link to="/" className="btn-primary text-xs flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Return to Dashboard
      </Link>
    </div>
  );
};
