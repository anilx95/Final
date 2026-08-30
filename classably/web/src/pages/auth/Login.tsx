import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, Sparkles, ArrowRight, ShieldCheck, KeyRound, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const loginPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginPasswordInputs = z.infer<typeof loginPasswordSchema>;

export const Login: React.FC = () => {
  const { login, loginWithOtp } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Login Mode: 'password' | 'otp'
  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP Login State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPasswordInputs>({
    resolver: zodResolver(loginPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleRoleRedirect = (role: string) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  // Option 1: Direct Password Login
  const onPasswordSubmit = async (data: LoginPasswordInputs) => {
    setIsSubmitting(true);
    try {
      const role = await login(data.email, data.password);
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        description: `Welcome back! Signed in as ${role.toUpperCase()}.`,
      });
      handleRoleRedirect(role);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Login Failed',
        description: err.response?.data?.detail || 'Invalid email or password credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Option 2: Send Gmail OTP
  const handleSendOtp = async () => {
    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast({
        type: 'warning',
        title: 'Invalid Email',
        description: 'Please enter a valid Gmail / email address.',
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await authApi.sendOtp(cleanEmail, 'login');
      setOtpSent(true);
      setCooldown(res.data.cooldown_seconds || 60);
      addToast({
        type: 'success',
        title: 'Verification Code Sent',
        description: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
      });
    } catch (err: any) {
      const isNotFound = err.response?.status === 404;
      addToast({
        type: 'error',
        title: isNotFound ? 'Account Not Found' : 'Failed to Send OTP',
        description: err.response?.data?.detail || (isNotFound ? 'This email is not registered yet. Please click Register below to create your account.' : 'Could not send verification code. Please try again.'),
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Option 2: Verify Gmail OTP & Log In
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (!cleanEmail || !cleanOtp || cleanOtp.length < 6) {
      addToast({
        type: 'warning',
        title: 'Incomplete Details',
        description: 'Please enter your email and the 6-digit OTP received in your inbox.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const role = await loginWithOtp(cleanEmail, cleanOtp);
      addToast({
        type: 'success',
        title: 'OTP Verified',
        description: `Welcome back! Signed in as ${role.toUpperCase()}.`,
      });
      handleRoleRedirect(role);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'OTP Verification Failed',
        description: err.response?.data?.detail || 'Invalid or expired verification code.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090f] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Dynamic Background Glow */}
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
          {/* Dual Authentication Mode Selector */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#080c14] border border-[#1b2538] rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setLoginMode('password')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                loginMode === 'password'
                  ? 'bg-[#1b2538] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Login</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('otp')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                loginMode === 'otp'
                  ? 'bg-[#1b2538] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail OTP</span>
            </button>
          </div>

          {loginMode === 'password' ? (
            /* Option 1: Direct Password Form */
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="name@university.edu"
                    {...register('email')}
                    className="input-field pl-10 text-xs"
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <Link to="/forgot-password" className="text-xs text-sky-400 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="input-field pl-10 text-xs"
                  />
                </div>
                {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                variant="primary"
                size="md"
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>
          ) : (
            /* Option 2: Gmail OTP Form */
            <form onSubmit={handleOtpLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Registered Gmail Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="input-field pl-10 text-xs"
                      disabled={otpSent && cooldown > 0}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || cooldown > 0 || !otpEmail}
                    className="px-3.5 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 transition-all"
                  >
                    {isSendingOtp ? (
                      <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                    ) : cooldown > 0 ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{cooldown}s</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{otpSent ? 'Resend' : 'Send OTP'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">Enter 6-Digit OTP</label>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Code sent to inbox
                    </span>
                  </div>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="input-field pl-10 font-mono tracking-widest text-base font-bold text-sky-300"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter code sent to <strong className="text-slate-300">{otpEmail}</strong>. Valid for 5 minutes.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting || !otpSent || otpCode.length < 6}
                isLoading={isSubmitting}
                variant="primary"
                size="md"
                className="w-full mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Verify OTP & Sign In
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#1b2538] text-center">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-sky-400 font-semibold hover:underline">
                Register New User (Gmail OTP)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
