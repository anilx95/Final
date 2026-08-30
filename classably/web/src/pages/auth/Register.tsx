import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  GraduationCap,
  School,
  Shield,
  ArrowRight,
  Building2,
  Sparkles,
  Clock,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../api/client';
import { Button } from '../../components/ui/Button';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid Gmail / email address'),
  otp: z.string().min(6, '6-digit OTP is required for verification'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['student', 'teacher']),
  college_name: z.string().min(2, 'College / Institution Name is mandatory.'),
  phone: z.string().optional(),
  roll_number: z.string().optional(),
  employee_id: z.string().optional(),
  disability_profiles: z.array(z.string()).optional(),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { registerWithOtp } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
      disability_profiles: [],
      otp: '',
    },
  });

  const selectedRole = watch('role');
  const watchedEmail = watch('email');
  const selectedDisabilities = watch('disability_profiles') || [];

  // OTP Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDisabilityToggle = (profile: string) => {
    if (selectedDisabilities.includes(profile)) {
      setValue('disability_profiles', selectedDisabilities.filter((p) => p !== profile));
    } else {
      setValue('disability_profiles', [...selectedDisabilities, profile]);
    }
  };

  const handleSendRegistrationOtp = async () => {
    const cleanEmail = (watchedEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      addToast({
        type: 'warning',
        title: 'Invalid Email',
        description: 'Please enter a valid Gmail / email address first.',
      });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await authApi.sendOtp(cleanEmail, 'register');
      setOtpSent(true);
      setSentToEmail(cleanEmail);
      setCooldown(res.data.cooldown_seconds || 60);
      addToast({
        type: 'success',
        title: 'Verification Code Sent',
        description: `A 6-digit OTP code has been dispatched to ${cleanEmail}. Please check your inbox.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Send OTP',
        description: err.response?.data?.detail || 'Could not send verification code. Please try again.',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    const currentEmail = (data.email || '').trim().toLowerCase();
    if (!otpSent || sentToEmail !== currentEmail) {
      addToast({
        type: 'warning',
        title: 'Email Verification Required',
        description: 'Please click "Send OTP" to receive a verification code for this email address.',
      });
      return;
    }

    if (!data.otp || data.otp.trim().length < 6) {
      addToast({
        type: 'warning',
        title: 'Enter Verification Code',
        description: 'Please enter the 6-digit verification code received on your email.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const role = await registerWithOtp({ ...data, email: currentEmail, otp: data.otp.trim() });
      addToast({
        type: 'success',
        title: 'Account Registered Successfully',
        description: `Welcome to ClassAbly! Account created and verified as ${role.toUpperCase()}.`,
      });

      if (role === 'admin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Registration Failed',
        description: err.response?.data?.detail || 'Registration encountered an error. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090f] flex items-center justify-center p-3 sm:p-4 py-6 sm:py-8 relative overflow-hidden">
      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-xl shadow-sky-500/20 mb-2">
            C
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">Create ClassAbly Account</h1>
          <p className="text-xs text-slate-400 mt-1">Join the Smart Classroom Accessibility Network</p>
        </div>

        <div className="bg-[#0d131f] border border-[#1b2538] rounded-2xl p-4 sm:p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Select Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'student', label: 'Student Account', icon: GraduationCap },
                  { role: 'teacher', label: 'Faculty / Educator', icon: School },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedRole === item.role;
                  return (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => setValue('role', item.role as 'student' | 'teacher')}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-150 ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 text-sky-200 shadow-sm'
                          : 'bg-[#080c14] border-[#1b2538] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name and Email with OTP Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    {...register('full_name')}
                    className="input-field pl-10 text-xs"
                  />
                </div>
                {errors.full_name && <p className="text-xs text-rose-400 mt-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Gmail / Email Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      placeholder="jane@gmail.com"
                      {...register('email')}
                      className="input-field pl-10 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendRegistrationOtp}
                    disabled={isSendingOtp || cooldown > 0 || !watchedEmail}
                    title="Send verification code to this Gmail address"
                    className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5 transition-all"
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
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* 6-Digit OTP Verification Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  Gmail Verification OTP <span className="text-rose-400 font-bold">*Required</span>
                </label>
                {otpSent && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Code sent to email
                  </span>
                )}
              </div>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code received on Gmail"
                  {...register('otp')}
                  className="input-field pl-10 font-mono tracking-wider font-bold text-sky-300 text-xs"
                />
              </div>
              {errors.otp && <p className="text-xs text-rose-400 mt-1">{errors.otp.message}</p>}
              {!otpSent && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Click <strong>"Send OTP"</strong> above to receive your verification code.
                </p>
              )}
            </div>

            {/* College / Institution Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                College / University Name <span className="text-rose-400 font-bold">*Mandatory</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Stanford University / MIT College of Engineering"
                  {...register('college_name')}
                  className="input-field pl-10 text-xs"
                />
              </div>
              {errors.college_name && <p className="text-xs text-rose-400 mt-1">{errors.college_name.message}</p>}
            </div>

            {/* Password and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    {...register('phone')}
                    className="input-field pl-10 text-xs"
                  />
                </div>
              </div>
            </div>

            {selectedRole === 'student' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Roll Number / Student ID</label>
                  <input
                    type="text"
                    placeholder="STU-88421"
                    {...register('roll_number')}
                    className="input-field text-xs"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Disability & Assistive Accommodations (Optional)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'visual_impairment', label: 'Visual Impairment' },
                      { id: 'hearing_impairment', label: 'Hearing Impairment' },
                      { id: 'language_barrier', label: 'Language Barrier' },
                      { id: 'motor_disability', label: 'Motor Disability' },
                    ].map((d) => (
                      <label
                        key={d.id}
                        onClick={() => handleDisabilityToggle(d.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all duration-150 ${
                          selectedDisabilities.includes(d.id)
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-[#080c14] border-[#1b2538] text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDisabilities.includes(d.id)}
                          onChange={() => {}}
                          className="rounded text-sky-500 focus:ring-0"
                        />
                        <span>{d.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'teacher' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-9021"
                  {...register('employee_id')}
                  className="input-field text-xs"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              variant="primary"
              size="md"
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify OTP & Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#1b2538] text-center">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-sky-400 font-semibold hover:underline">
                Sign In (Password or Gmail OTP)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
