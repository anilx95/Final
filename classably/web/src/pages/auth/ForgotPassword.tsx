import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword: React.FC = () => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setResetToken(res.data.reset_token || null);
      addToast({
        type: 'success',
        title: 'Reset Link Generated',
        description: res.data.message || 'Password reset link sent.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to process password reset.',
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
            <KeyRound className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-slate-100">Forgot Password?</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Enter your university email address below to receive password recovery instructions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Generate Reset Token'
              )}
            </button>
          </form>

          {resetToken && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-fade-in">
              <div className="flex items-center gap-2 font-bold mb-1 text-emerald-200">
                <CheckCircle2 className="w-4 h-4" /> Password Reset Token Active
              </div>
              <p className="text-slate-300 text-[11px] mb-2">Token: <code className="bg-slate-950 px-2 py-0.5 rounded text-sky-300">{resetToken}</code></p>
              <Link
                to={`/reset-password?token=${resetToken}`}
                className="btn-secondary w-full text-center text-xs py-1.5 inline-block"
              >
                Proceed to Reset Password
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
