import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword) return;

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      addToast({
        type: 'success',
        title: 'Password Updated',
        description: 'Your password has been reset successfully. Please sign in.',
      });
      navigate('/login');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reset Error',
        description: err.response?.data?.detail || 'Failed to reset password. Invalid or expired token.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>

          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-100">Set New Password</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Enter your reset token and new account password below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reset Token</label>
              <input
                type="text"
                required
                placeholder="UUID Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
