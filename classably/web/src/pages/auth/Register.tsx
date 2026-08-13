import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail, User as UserIcon, Phone, GraduationCap, School, Shield, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
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
  const { register: registerAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const selectedRole = watch('role');
  const selectedDisabilities = watch('disability_profiles') || [];

  const handleDisabilityToggle = (profile: string) => {
    if (selectedDisabilities.includes(profile)) {
      setValue('disability_profiles', selectedDisabilities.filter((p) => p !== profile));
    } else {
      setValue('disability_profiles', [...selectedDisabilities, profile]);
    }
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    setIsSubmitting(true);
    try {
      const role = await registerAuth(data);
      addToast({
        type: 'success',
        title: 'Account Registered Successfully',
        description: `Welcome to ClassAbly! Account created as ${role.toUpperCase()}.`,
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 py-8 relative overflow-hidden">
      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-xl shadow-sky-500/20 mb-2">
            C
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">Create ClassAbly Account</h1>
          <p className="text-xs text-slate-400 mt-1">Join the Smart Classroom Accessibility Network</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
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
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-sky-600/20 border-sky-500 text-sky-200 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    {...register('full_name')}
                    className="input-field pl-10"
                  />
                </div>
                {errors.full_name && <p className="text-xs text-rose-400 mt-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    placeholder="jane@university.edu"
                    {...register('email')}
                    className="input-field pl-10"
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-sky-300 mb-1.5">
                College / University Name <span className="text-rose-400 font-bold">*Mandatory</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-sky-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Stanford University / MIT College of Engineering"
                  {...register('college_name')}
                  className="input-field pl-10 border-sky-500/40"
                />
              </div>
              {errors.college_name && <p className="text-xs text-rose-400 mt-1">{errors.college_name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="input-field pl-10"
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
                    className="input-field pl-10"
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
                    className="input-field"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Disability & Assistive Accommodations (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'visual_impairment', label: 'Visual Impairment' },
                      { id: 'hearing_impairment', label: 'Hearing Impairment' },
                      { id: 'language_barrier', label: 'Language Barrier' },
                      { id: 'motor_disability', label: 'Motor Disability' },
                    ].map((d) => (
                      <label
                        key={d.id}
                        onClick={() => handleDisabilityToggle(d.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                          selectedDisabilities.includes(d.id)
                            ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
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
                  className="input-field"
                />
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Register & Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already registered?{' '}
              <Link to="/login" className="text-sky-400 font-semibold hover:underline">
                Sign In Instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
