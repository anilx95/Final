import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { authApi } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';

export const ForgotPassword: React.FC = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Multi-step Flow: 'email' | 'otp_password' | 'success'
  const [step, setStep] = useState<'email' | 'otp_password' | 'success'>('email');

  // Form States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Send OTP to Registered Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast({
        type: 'warning',
        title: 'Invalid Email',
        description: 'Please enter a valid registered email address.',
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await authApi.sendOtp(cleanEmail, 'reset_password');
      setCooldown(res.data.cooldown_seconds || 60);
      setStep('otp_password');
      addToast({
        type: 'success',
        title: 'Reset Code Sent',
        description: `A 6-digit password reset verification code was sent to ${cleanEmail}.`,
      });
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 404) {
        addToast({
          type: 'error',
          title: 'Account Not Found',
          description: detail || 'No account found with this email address. Please check your email or register.',
        });
      } else if (status === 429) {
        addToast({
          type: 'warning',
          title: 'Rate Limit',
          description: detail || 'Please wait before requesting another code.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Send Code',
          description: detail || 'Could not deliver password reset email. Please try again.',
        });
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify OTP & Update Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      addToast({
        type: 'warning',
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit verification code sent to your email.',
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      addToast({
        type: 'warning',
        title: 'Password Too Short',
        description: 'New password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast({
        type: 'warning',
        title: 'Passwords Do Not Match',
        description: 'New password and confirm password must match exactly.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.resetPasswordWithOtp({
        email: cleanEmail,
        otp: cleanOtp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setStep('success');
      addToast({
        type: 'success',
        title: 'Password Reset Successful',
        description: res.data.message || 'Your password has been updated. You can now sign in.',
      });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      addToast({
        type: 'error',
        title: 'Reset Failed',
        description: detail || 'Failed to reset password. Please verify the code and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090f] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-xl shadow-sky-500/20 mb-3">
            C
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">ClassAbly</h1>
          <p className="text-xs text-slate-400 mt-1">Smart Classroom Accessibility Platform</p>
        </div>

        <div className="bg-[#0d131f] border border-[#1b2538] rounded-2xl p-4 sm:p-8 shadow-2xl">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Sign In
          </Link>

          {/* STEP 1: Enter Registered Email */}
          {step === 'email' && (
            <div className="animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4">
                <KeyRound className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Forgot Password?</h2>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Enter your registered account email. We will dispatch a 6-digit OTP code to verify your identity.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="name@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10 text-xs"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSendingOtp || !email.trim()}
                  isLoading={isSendingOtp}
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Send Verification Code
                </Button>
              </form>
            </div>
          )}

          {/* STEP 2: Enter OTP & Set New Password */}
          {step === 'otp_password' && (
            <div className="animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Reset Password</h2>
              <div className="flex items-center justify-between mt-1 mb-6 bg-[#080c14] border border-[#1b2538] p-2.5 rounded-xl text-xs">
                <span className="text-slate-400 truncate max-w-[200px]">{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                  }}
                  className="text-sky-400 hover:underline text-[11px] font-semibold"
                >
                  Change Email
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 6-Digit OTP Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">Enter 6-Digit Code</label>
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isSendingOtp || cooldown > 0}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {cooldown > 0 ? (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Resend in {cooldown}s</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className={`w-3 h-3 ${isSendingOtp ? 'animate-spin' : ''}`} />
                          <span>Resend Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="input-field pl-10 font-mono tracking-widest text-base font-bold text-sky-300"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Code valid for 5 minutes.</p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field pl-10 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`input-field pl-10 pr-10 text-xs ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-500 focus:border-rose-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[11px] text-rose-400 mt-1">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || otp.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                  isLoading={isSubmitting}
                  variant="primary"
                  size="md"
                  className="w-full mt-2"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Update & Reset Password
                </Button>
              </form>
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 'success' && (
            <div className="text-center py-4 animate-fade-in space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Password Reset Complete</h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  Your account password has been updated securely. You can now sign in using your new credentials.
                </p>
              </div>

              <Button
                type="button"
                onClick={() => navigate('/login')}
                variant="primary"
                size="md"
                className="w-full mt-4"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In with New Password
              </Button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#1b2538] text-center">
            <p className="text-xs text-slate-400">
              Remember your password?{' '}
              <Link to="/login" className="text-sky-400 font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
